"""Global search endpoint."""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.student import Student
from app.models.user import User
from app.models.academic import ClassLevel, Subject
from app.models.finance import Payment

router = APIRouter()


@router.get("")
def global_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> Dict[str, List[Any]]:
    like = f"%{q}%"
    students = (
        db.query(Student)
        .filter(or_(Student.first_name.ilike(like), Student.last_name.ilike(like), Student.admission_number.ilike(like)))
        .limit(limit)
        .all()
    )
    teachers = (
        db.query(User)
        .filter(User.role == "teacher", or_(User.full_name.ilike(like), User.email.ilike(like)))
        .limit(limit)
        .all()
    )
    classes = db.query(ClassLevel).filter(ClassLevel.name.ilike(like)).limit(limit).all()
    subjects = db.query(Subject).filter(or_(Subject.name.ilike(like), Subject.code.ilike(like))).limit(limit).all()

    return {
        "students": [{"id": s.id, "admission_number": s.admission_number, "name": f"{s.first_name} {s.last_name}"} for s in students],
        "teachers": [{"id": t.id, "name": t.full_name, "email": t.email} for t in teachers],
        "classes": [{"id": c.id, "name": c.name, "section": c.section} for c in classes],
        "subjects": [{"id": s.id, "name": s.name, "code": s.code} for s in subjects],
    }
