"""Subject and teacher assignment endpoints."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.services.part2a.subject_service import SubjectService
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


# Categories
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return SubjectService(db).list_categories()


@router.post("/categories")
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    return SubjectService(db).create_category(**payload.model_dump())


# Subjects
class SubjectCreate(BaseModel):
    name: str
    code: str
    category_id: Optional[int] = None
    description: Optional[str] = None
    subject_type: str = "compulsory"
    applicable_sections: List[str] = []
    credit_hours: int = 1


@router.get("")
def list_subjects(category_id: Optional[int] = None, subject_type: Optional[str] = None, db: Session = Depends(get_db)):
    return SubjectService(db).list_subjects(category_id, subject_type)


@router.post("")
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    return SubjectService(db).create_subject(**payload.model_dump())


@router.patch("/{subject_id}")
def update_subject(subject_id: int, payload: SubjectCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    try:
        return SubjectService(db).update_subject(subject_id, **payload.model_dump())
    except ValueError as e:
        raise HTTPException(404, str(e))


# Teacher assignments
class AssignmentCreate(BaseModel):
    teacher_id: int
    subject_id: int
    class_level_id: int
    session_id: int
    term_id: int
    arm_id: Optional[int] = None
    is_primary: bool = True


@router.post("/assignments")
def create_assignment(payload: AssignmentCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    return SubjectService(db).assign_teacher(**payload.model_dump())


@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    if not SubjectService(db).unassign_teacher(assignment_id):
        raise HTTPException(404, "Assignment not found")
    return {"message": "Unassigned"}


@router.get("/assignments/teacher/{teacher_id}")
def list_for_teacher(teacher_id: int, session_id: Optional[int] = None, term_id: Optional[int] = None, db: Session = Depends(get_db)):
    return SubjectService(db).list_assignments_for_teacher(teacher_id, session_id, term_id)


@router.get("/assignments/class/{class_level_id}")
def list_for_class(class_level_id: int, session_id: int, term_id: int, db: Session = Depends(get_db)):
    return SubjectService(db).list_assignments_for_class(class_level_id, session_id, term_id)
