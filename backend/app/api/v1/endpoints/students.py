"""Students endpoints."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.user import User
import uuid
from app.core.security import hash_password

router = APIRouter()


@router.get("/")
def list_students(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == 'student')
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.username.ilike(f"%{search}%"))
        )
    
    total = query.count()
    students = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "items": [
            {
                "id": str(s.id),
                "admission_number": s.username,
                "first_name": s.full_name.split()[0] if s.full_name else "",
                "last_name": " ".join(s.full_name.split()[1:]) if s.full_name and len(s.full_name.split()) > 1 else "",
                "email": s.email,
                "phone": s.phone,
                "class_name": "Unassigned",
                "enrollment_status": "active" if s.is_active else "inactive",
            }
            for s in students
        ],
        "total": total,
        "page": page,
        "page_size": limit,
    }


@router.post("/")
def create_student(data: dict, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.get('email')).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admission_number = data.get('admission_number', f"ADM/{uuid.uuid4().hex[:8].upper()}")
    student = User(
        id=str(uuid.uuid4()),
        username=admission_number,
        email=data.get('email'),
        full_name=f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
        phone=data.get('phone'),
        hashed_password=hash_password(data.get('password', 'Student@123')),
        role='student',
        is_active=True,
        is_verified=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"id": str(student.id), "admission_number": student.username}
