"""Authentication service."""
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import hashlib
from sqlalchemy.orm import Session
from app.core.security import (
    verify_password, hash_password, create_access_token,
    create_refresh_token, decode_token,
)
from app.core.config import settings
from app.models.user import User, RefreshToken
from app.repositories.user_repo import UserRepository
from app.core.exceptions import AppException


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def login(self, login: str, password: str, device_info: Optional[str] = None, ip: Optional[str] = None) -> Tuple[User, dict]:
        user = self.user_repo.get_by_email_or_username(login)
        if not user or not verify_password(password, user.hashed_password):
            raise AppException(status_code=401, detail="Invalid credentials")
        if not user.is_active:
            raise AppException(status_code=403, detail="Account is disabled")
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            raise AppException(status_code=423, detail="Account temporarily locked")

        access_token = create_access_token(subject=user.id, extra={"role": user.role, "email": user.email})
        refresh_token = create_refresh_token(subject=user.id)

        # Store refresh token
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        rt = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            device_info=device_info,
            ip_address=ip,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(rt)
        user.last_login_at = datetime.now(timezone.utc)
        user.last_login_ip = ip
        user.failed_login_attempts = 0
        self.db.commit()

        tokens = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }
        return user, tokens

    def refresh(self, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise AppException(status_code=401, detail="Invalid refresh token")
        user_id = payload.get("sub")
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = self.db.query(RefreshToken).filter(
            RefreshToken.user_id == int(user_id),
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        ).first()
        if not stored:
            raise AppException(status_code=401, detail="Refresh token revoked or expired")
        user = self.user_repo.get(int(user_id))
        if not user or not user.is_active:
            raise AppException(status_code=401, detail="User not found or inactive")

        # Rotate tokens
        stored.revoked = True
        new_access = create_access_token(subject=user.id, extra={"role": user.role, "email": user.email})
        new_refresh = create_refresh_token(subject=user.id)
        new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
        new_rt = RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            device_info=stored.device_info,
            ip_address=stored.ip_address,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(new_rt)
        self.db.commit()
        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    def logout(self, user_id: int, refresh_token: Optional[str]) -> None:
        if refresh_token:
            token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
            rt = self.db.query(RefreshToken).filter(
                RefreshToken.user_id == user_id,
                RefreshToken.token_hash == token_hash,
            ).first()
            if rt:
                rt.revoked = True
                self.db.commit()

    def register_user(
        self,
        email: str,
        username: str,
        full_name: str,
        password: str,
        role: str,
        phone: Optional[str] = None,
    ) -> User:
        if self.user_repo.get_by_email(email):
            raise AppException(status_code=409, detail="Email already registered")
        if self.user_repo.get_by_username(username):
            raise AppException(status_code=409, detail="Username already taken")
        user = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password=hash_password(password),
            role=role,
            phone=phone,
            is_active=True,
            is_verified=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise AppException(status_code=400, detail="Current password is incorrect")
        user.hashed_password = hash_password(new_password)
        # Revoke all refresh tokens
        self.db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
        self.db.commit()

    def initiate_password_reset(self, email: str) -> None:
        user = self.user_repo.get_by_email(email)
        if not user:
            return  # silent for security
        from app.core.security import generate_otp
        token = generate_otp(length=32)
        user.password_reset_token = hashlib.sha256(token.encode()).hexdigest()
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        self.db.commit()
        # In production: send email with reset link containing token
        # For now, we'll log it
        import logging
        logging.getLogger(__name__).info(f"Password reset token for {email}: {token}")

    def reset_password(self, token: str, new_password: str) -> None:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        user = self.db.query(User).filter(
            User.password_reset_token == token_hash,
            User.password_reset_expires > datetime.now(timezone.utc),
        ).first()
        if not user:
            raise AppException(status_code=400, detail="Invalid or expired reset token")
        user.hashed_password = hash_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        self.db.commit()
