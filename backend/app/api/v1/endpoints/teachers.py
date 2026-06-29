"""Teachers endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/")
def list_teachers(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == 'teacher')
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    total = query.count()
    teachers = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "items": [
            {
                "id": str(t.id),
                "full_name": t.full_name,
                "email": t.email,
                "phone": t.phone,
                "employment_status": "active" if t.is_active else "inactive",
            }
            for t in teachers
        ],
        "total": total,
    }


@router.post("/")
def create_teacher(data: dict, db: Session = Depends(get_db)):
    from app.core.security import hash_password
    import uuid
    
    teacher = User(
        id=str(uuid.uuid4()),
        username=data.get('email', '').split('@')[0],
        email=data.get('email'),
        full_name=data.get('full_name'),
        phone=data.get('phone'),
        hashed_password=hash_password(data.get('password', 'Teacher@123')),
        role='teacher',
        is_active=True,
        is_verified=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return {"id": str(teacher.id), "full_name": teacher.full_name}
