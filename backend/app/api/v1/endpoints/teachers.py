"""Teachers endpoints."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.user import User
from app.core.security import hash_password
import uuid
import json

router = APIRouter()


def _extra(user: User) -> dict:
    """Teacher-specific fields (subject, qualification) stored as JSON in preferences."""
    if not user.preferences:
        return {}
    try:
        return json.loads(user.preferences)
    except Exception:
        return {}


def _subjects_list(extra: dict) -> list:
    """Backward-compatible: older records stored a single `subject` string."""
    if "subjects" in extra and isinstance(extra["subjects"], list):
        return extra["subjects"]
    legacy = extra.get("subject")
    return [legacy] if legacy else []


def _serialize(t: User) -> dict:
    extra = _extra(t)
    return {
        "id": str(t.id),
        "full_name": t.full_name,
        "email": t.email,
        "phone": t.phone or "",
        "subjects": _subjects_list(extra),
        "qualification": extra.get("qualification", ""),
        "role": "teacher",
        "is_active": t.is_active,
    }


@router.get("/")
def list_teachers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
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
    teachers = query.order_by(User.full_name).offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [_serialize(t) for t in teachers],
        "total": total,
        "page": page,
        "page_size": limit,
    }


@router.get("/{teacher_id}")
def get_teacher(teacher_id: str, db: Session = Depends(get_db)):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == 'teacher').first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return _serialize(teacher)


@router.post("/")
def create_teacher(data: dict, db: Session = Depends(get_db)):
    if not data.get("full_name") or not data.get("email"):
        raise HTTPException(status_code=422, detail="full_name and email are required")

    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    teacher = User(
        id=str(uuid.uuid4()),
        username=data["email"].split('@')[0] + "_" + uuid.uuid4().hex[:4],
        email=data["email"],
        full_name=data["full_name"],
        phone=data.get("phone", ""),
        hashed_password=hash_password(data.get('password', 'Teacher@123')),
        role='teacher',
        is_active=True,
        is_verified=True,
        preferences=json.dumps({
            "subjects": data.get("subjects") or ([data["subject"]] if data.get("subject") else []),
            "qualification": data.get("qualification", ""),
        }),
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return _serialize(teacher)


@router.put("/{teacher_id}")
def update_teacher(teacher_id: str, data: dict, db: Session = Depends(get_db)):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == 'teacher').first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if "full_name" in data:
        teacher.full_name = data["full_name"]
    if "phone" in data:
        teacher.phone = data["phone"]
    if "is_active" in data:
        teacher.is_active = data["is_active"]
    if "subjects" in data or "subject" in data or "qualification" in data:
        extra = _extra(teacher)
        if "subjects" in data:
            extra["subjects"] = data["subjects"]
        elif "subject" in data:
            extra["subjects"] = [data["subject"]] if data["subject"] else []
        extra.pop("subject", None)
        extra["qualification"] = data.get("qualification", extra.get("qualification", ""))
        teacher.preferences = json.dumps(extra)

    db.commit()
    db.refresh(teacher)
    return _serialize(teacher)


@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: str, db: Session = Depends(get_db)):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == 'teacher').first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"message": "Deleted"}
