"""User management endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    users = db.query(User).all()
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
        }
        for u in users
    ]
