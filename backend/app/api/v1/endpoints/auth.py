"""Authentication endpoints."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, get_client_ip
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class LoginRequest(BaseModel):
    login: str
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    password: str
    role: str = "parent"


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == payload.login) | (User.username == payload.login)
    ).first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")
    
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = get_client_ip(request)
    user.failed_login_attempts = 0
    db.commit()
    
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        }
    }


@router.post("/register")
def register_user(user: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user.role in ['teacher', 'admin', 'super_admin']:
        raise HTTPException(status_code=403, detail=f"Cannot self-register as {user.role}")
    
    new_user = User(
        id=str(uuid.uuid4()),
        username=user.email.split('@')[0],
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        hashed_password=hash_password(user.password),
        role=user.role,
        is_active=True,
        is_verified=True,
        email_verified_at=datetime.utcnow(),
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email, "role": new_user.role}
    )
    
    return {
        "message": "Registration successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
        }
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }
