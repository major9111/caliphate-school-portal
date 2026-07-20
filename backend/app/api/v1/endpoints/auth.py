"""Authentication endpoints — login, register, refresh, reset, 2FA, profile."""
import secrets
import hashlib
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

import pyotp
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, get_client_ip
from app.core.security import hash_password, verify_password, create_access_token, verify_token
from app.core.email_service import send_password_reset, send_account_created
from app.core.upload_service import upload_image
from app.models.user import User, RefreshToken

import uuid
import json

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Rate limiting ─────────────────────────────────────────────────────────────
_LOGIN_ATTEMPTS: dict[str, list[datetime]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_WINDOW = timedelta(minutes=15)

def _check_rate_limit(ip: str):
    now = datetime.now(timezone.utc)
    attempts = [t for t in _LOGIN_ATTEMPTS[ip] if now - t < _WINDOW]
    _LOGIN_ATTEMPTS[ip] = attempts
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429,
            detail=f"Too many login attempts. Try again in {_WINDOW.seconds // 60} minutes.")

def _record_attempt(ip: str): _LOGIN_ATTEMPTS[ip].append(datetime.now(timezone.utc))
def _clear_attempts(ip: str): _LOGIN_ATTEMPTS.pop(ip, None)

# ── Allowed public roles ───────────────────────────────────────────────────────
_PUBLIC_ROLES = {"parent", "student"}
_ALL_ROLES    = {"admin", "super_admin", "teacher", "staff", "parent", "student"}

# ── Helpers ───────────────────────────────────────────────────────────────────
def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _is_expired(expires_at: datetime) -> bool:
    """
    Compare a DB-sourced datetime against now, safely.

    SQLite does not have a native timezone-aware datetime type, so a value
    written as timezone-aware comes back naive after a round trip through
    SQLite (PostgreSQL preserves tzinfo correctly). Since our app always
    writes UTC values, we treat a naive value read back from the DB as UTC.
    """
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < now

def _serialize_user(u: User) -> dict:
    extra = {}
    if u.preferences:
        try: extra = json.loads(u.preferences)
        except: pass
    return {
        "id": str(u.id), "email": u.email, "username": u.username,
        "full_name": u.full_name, "phone": u.phone or "",
        "avatar_url": u.avatar_url or "", "role": u.role,
        "is_active": u.is_active, "is_verified": u.is_verified,
        "two_fa_enabled": extra.get("two_fa_enabled", False),
        "created_at": u.created_at.isoformat() if u.created_at else "",
    }

def _issue_tokens(user: User, db: Session, request: Request) -> dict:
    """Issue access + refresh tokens and persist the refresh token."""
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    raw_refresh = secrets.token_urlsafe(48)
    token_hash  = _hash_token(raw_refresh)
    expires_at  = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    # Revoke old refresh tokens for this device (IP) to prevent accumulation
    db.query(RefreshToken).filter(
        RefreshToken.user_id == str(user.id),
        RefreshToken.ip_address == get_client_ip(request),
        RefreshToken.revoked == False,
    ).update({"revoked": True})

    rt = RefreshToken(
        user_id=str(user.id), token_hash=token_hash,
        ip_address=get_client_ip(request),
        device_info=request.headers.get("user-agent", "")[:255],
        expires_at=expires_at, revoked=False,
    )
    db.add(rt)
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": _serialize_user(user),
    }

# ── Schemas ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    login: str
    password: str
    totp_code: Optional[str] = None

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str = ""
    password: str
    role: str = "parent"

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone:     Optional[str] = None

class Enable2FARequest(BaseModel):
    totp_code: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if payload.role not in _PUBLIC_ROLES:
        raise HTTPException(status_code=400,
            detail="Self-registration is only available for parent and student accounts.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    base_username = payload.email.split("@")[0].lower()
    username = base_username
    suffix = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{suffix}"; suffix += 1

    user = User(
        id=str(uuid.uuid4()), username=username, email=payload.email,
        full_name=payload.full_name, phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role, is_active=True, is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(user, db, request)


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    _check_rate_limit(ip)

    user = db.query(User).filter(
        (User.email == payload.login) | (User.username == payload.login)
    ).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        _record_attempt(ip)
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled. Contact the school office.")
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(status_code=423, detail="Account is temporarily locked. Try again later.")

    # 2FA check
    extra = json.loads(user.preferences) if user.preferences else {}
    if extra.get("two_fa_enabled") and extra.get("two_fa_secret"):
        if not payload.totp_code:
            raise HTTPException(status_code=428, detail="Two-factor authentication code required.")
        totp = pyotp.TOTP(extra["two_fa_secret"])
        if not totp.verify(payload.totp_code, valid_window=1):
            _record_attempt(ip)
            raise HTTPException(status_code=401, detail="Invalid 2FA code.")

    _clear_attempts(ip)
    user.last_login_at = datetime.now(timezone.utc)
    user.last_login_ip = ip
    user.failed_login_attempts = 0
    db.commit()
    return _issue_tokens(user, db, request)


@router.post("/refresh")
def refresh_token(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    token_hash = _hash_token(payload.refresh_token)
    rt = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False,
    ).first()
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")
    if _is_expired(rt.expires_at):
        rt.revoked = True; db.commit()
        raise HTTPException(status_code=401, detail="Refresh token has expired. Please log in again.")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User account not found or disabled.")

    # Rotate: revoke old token
    rt.revoked = True; db.commit()
    return _issue_tokens(user, db, request)


@router.post("/logout")
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    if payload.refresh_token:
        token_hash = _hash_token(payload.refresh_token)
        db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).update({"revoked": True})
        db.commit()
    return {"message": "Logged out successfully."}


@router.get("/me")
def me(current_user: User = Depends(get_current_active_user)):
    return _serialize_user(current_user)


@router.put("/profile")
def update_profile(payload: UpdateProfileRequest,
                   current_user: User = Depends(get_current_active_user),
                   db: Session = Depends(get_db)):
    if payload.full_name: current_user.full_name = payload.full_name
    if payload.phone is not None: current_user.phone = payload.phone
    db.commit(); db.refresh(current_user)
    return _serialize_user(current_user)


@router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...),
                        current_user: User = Depends(get_current_active_user),
                        db: Session = Depends(get_db)):
    url, _ = await upload_image(file, folder="avatars")
    current_user.avatar_url = url
    db.commit(); db.refresh(current_user)
    return {"avatar_url": url, "message": "Avatar updated."}


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest,
                    current_user: User = Depends(get_current_active_user),
                    db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters.")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return 200 to prevent email enumeration
    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        user.password_reset_token   = _hash_token(token)
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        send_password_reset(user.email, user.full_name, token)
    return {"message": "If that email is registered, you will receive a password reset link shortly."}


@router.get("/verify-reset-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Check whether a password reset token is still valid, without consuming it."""
    token_hash = _hash_token(token)
    user = db.query(User).filter(
        User.password_reset_token == token_hash,
        User.password_reset_expires > datetime.now(timezone.utc),
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    return {"valid": True}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    token_hash = _hash_token(payload.token)
    user = db.query(User).filter(
        User.password_reset_token == token_hash,
        User.password_reset_expires > datetime.now(timezone.utc),
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    user.hashed_password       = hash_password(payload.new_password)
    user.password_reset_token  = None
    user.password_reset_expires= None
    db.commit()
    return {"message": "Password reset successfully. You can now log in."}


# ── 2FA ───────────────────────────────────────────────────────────────────────

@router.post("/2fa/setup")
def setup_2fa(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    secret = pyotp.random_base32()
    totp   = pyotp.TOTP(secret)
    extra  = json.loads(current_user.preferences) if current_user.preferences else {}
    extra["two_fa_secret_pending"] = secret
    current_user.preferences = json.dumps(extra)
    db.commit()
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name=settings.SCHOOL_NAME)
    return {"secret": secret, "provisioning_uri": provisioning_uri,
            "message": "Scan the QR code with your authenticator app, then confirm with /2fa/enable."}


@router.post("/2fa/enable")
def enable_2fa(payload: Enable2FARequest,
               current_user: User = Depends(get_current_active_user),
               db: Session = Depends(get_db)):
    extra = json.loads(current_user.preferences) if current_user.preferences else {}
    pending = extra.get("two_fa_secret_pending")
    if not pending:
        raise HTTPException(status_code=400, detail="No 2FA setup in progress. Call /2fa/setup first.")
    totp = pyotp.TOTP(pending)
    if not totp.verify(payload.totp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code. Please try again.")
    extra["two_fa_secret"]         = pending
    extra["two_fa_enabled"]        = True
    extra.pop("two_fa_secret_pending", None)
    current_user.preferences = json.dumps(extra)
    db.commit()
    return {"message": "Two-factor authentication enabled successfully."}


@router.post("/2fa/disable")
def disable_2fa(payload: Enable2FARequest,
                current_user: User = Depends(get_current_active_user),
                db: Session = Depends(get_db)):
    extra = json.loads(current_user.preferences) if current_user.preferences else {}
    if not extra.get("two_fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not currently enabled.")
    totp = pyotp.TOTP(extra["two_fa_secret"])
    if not totp.verify(payload.totp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid TOTP code.")
    extra["two_fa_enabled"] = False
    extra.pop("two_fa_secret", None)
    current_user.preferences = json.dumps(extra)
    db.commit()
    return {"message": "Two-factor authentication disabled."}
