"""Student endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_teacher_or_above, get_pagination, Pagination
from app.services.student_service import StudentService
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, GuardianCreate, GuardianOut
from app.schemas.common import PaginatedResponse, Message
from app.models.user import User

router = APIRouter()


@router.get("", response_model=PaginatedResponse[StudentOut])
def list_students(
    pagination: Pagination = Depends(get_pagination),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_above),
):
    service = StudentService(db)
    items = service.list_students(skip=pagination.offset, limit=pagination.page_size, search=pagination.search)
    total = service.count_students(search=pagination.search)
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return PaginatedResponse(items=items, total=total, page=pagination.page, page_size=pagination.page_size, total_pages=total_pages)


@router.post("", response_model=StudentOut, status_code=201)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_above),
):
    service = StudentService(db)
    return service.create_student(payload)


@router.get("/stats")
def student_stats(db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = StudentService(db)
    return {
        "total": service.get_active_count(),
        "by_gender": service.get_gender_stats(),
    }


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = StudentService(db)
    return service.get_student(student_id)


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_above),
):
    service = StudentService(db)
    return service.update_student(student_id, payload)


@router.delete("/{student_id}", response_model=Message)
def delete_student(student_id: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = StudentService(db)
    service.delete_student(student_id)
    return Message(message="Student deleted")


@router.post("/guardians", response_model=GuardianOut, status_code=201)
def create_guardian(payload: GuardianCreate, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = StudentService(db)
    return service.create_guardian(payload)
