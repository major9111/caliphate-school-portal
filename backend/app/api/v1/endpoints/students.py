"""Students endpoints."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.user import User
import uuid
import json
from app.core.security import hash_password

router = APIRouter()


def _extra(user: User) -> dict:
    """Student-specific fields (class, gender, DOB, parent info) stored as JSON in preferences."""
    if not user.preferences:
        return {}
    try:
        return json.loads(user.preferences)
    except Exception:
        return {}


def _serialize(s: User) -> dict:
    extra = _extra(s)
    return {
        "id": str(s.id),
        "admission_number": s.username,
        "first_name": s.full_name.split()[0] if s.full_name else "",
        "last_name": " ".join(s.full_name.split()[1:]) if s.full_name and len(s.full_name.split()) > 1 else "",
        "email": s.email,
        "phone": s.phone or "",
        "class_name": extra.get("class_name", "Unassigned"),
        "enrollment_status": "active" if s.is_active else "inactive",
        "gender": extra.get("gender", ""),
        "date_of_birth": extra.get("date_of_birth", ""),
        "parent_name": extra.get("parent_name", ""),
        "parent_phone": extra.get("parent_phone", ""),
        "parent_email": extra.get("parent_email", ""),
        "avatar_url": s.avatar_url or "",
    }


@router.get("/")
def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
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
    students = query.order_by(User.full_name).offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [_serialize(s) for s in students],
        "total": total,
        "page": page,
        "page_size": limit,
    }


@router.get("/{student_id}")
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return _serialize(student)


@router.post("/")
def create_student(data: dict, db: Session = Depends(get_db)):
    if not data.get("email") or not (data.get("first_name") or data.get("full_name")):
        raise HTTPException(status_code=422, detail="email and first_name (or full_name) are required")

    existing = db.query(User).filter(User.email == data.get('email')).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admission_number = data.get('admission_number') or f"ADM/{uuid.uuid4().hex[:8].upper()}"
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
        preferences=json.dumps({
            "class_name": data.get("class_name", "Unassigned"),
            "gender": data.get("gender", ""),
            "date_of_birth": data.get("date_of_birth", ""),
            "parent_name": data.get("parent_name", ""),
            "parent_phone": data.get("parent_phone", ""),
            "parent_email": data.get("parent_email", ""),
        }),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return _serialize(student)


@router.put("/{student_id}")
def update_student(student_id: str, data: dict, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if "first_name" in data or "last_name" in data:
        first = data.get("first_name", student.full_name.split()[0] if student.full_name else "")
        rest = student.full_name.split()[1:] if student.full_name and len(student.full_name.split()) > 1 else []
        last = data.get("last_name", " ".join(rest))
        student.full_name = f"{first} {last}".strip()
    if "email" in data and data["email"] != student.email:
        clash = db.query(User).filter(User.email == data["email"], User.id != student_id).first()
        if clash:
            raise HTTPException(status_code=400, detail="Email already registered")
        student.email = data["email"]
    if "phone" in data:
        student.phone = data["phone"]
    if "enrollment_status" in data:
        student.is_active = data["enrollment_status"] == "active"
    if "admission_number" in data and data["admission_number"] != student.username:
        clash = db.query(User).filter(User.username == data["admission_number"], User.id != student_id).first()
        if clash:
            raise HTTPException(status_code=400, detail="Admission number already in use")
        student.username = data["admission_number"]

    extra_keys = ("class_name", "gender", "date_of_birth", "parent_name", "parent_phone", "parent_email")
    if any(k in data for k in extra_keys):
        extra = _extra(student)
        for k in extra_keys:
            if k in data:
                extra[k] = data[k]
        student.preferences = json.dumps(extra)

    db.commit()
    db.refresh(student)
    return _serialize(student)


@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"message": "Deleted"}
