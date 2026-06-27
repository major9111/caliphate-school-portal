"""Enhanced attendance endpoints with registers and approval."""
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_teacher_or_above, require_admin_or_above
from app.services.part2a.attendance_service import AttendanceService
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class RegisterCreate(BaseModel):
    class_level_id: int
    arm_id: Optional[int] = None
    session_id: int
    term_id: int
    date: date
    period: str = "morning"


@router.post("/register")
def create_register(payload: RegisterCreate, db: Session = Depends(get_db), current_user: User = Depends(require_teacher_or_above)):
    service = AttendanceService(db)
    return service.create_register(
        payload.class_level_id, payload.arm_id,
        payload.session_id, payload.term_id,
        payload.date, payload.period, current_user.id,
    )


class RecordItem(BaseModel):
    student_id: int
    status: str
    remark: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None


class BulkMark(BaseModel):
    records: List[RecordItem]


@router.post("/register/{register_id}/mark")
def mark_bulk(register_id: int, payload: BulkMark, db: Session = Depends(get_db), current_user: User = Depends(require_teacher_or_above)):
    service = AttendanceService(db)
    return service.mark_attendance_bulk(register_id, [r.model_dump() for r in payload.records], current_user.id)


@router.get("/register/{register_id}")
def get_register(register_id: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = AttendanceService(db)
    try:
        return service.get_register(register_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/registers")
def list_registers(
    class_level_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = AttendanceService(db)
    return service.list_registers(class_level_id, from_date, to_date, status)


@router.post("/register/{register_id}/approve")
def approve_register(register_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = AttendanceService(db)
    try:
        return service.approve_register(register_id, current_user.id)
    except ValueError as e:
        raise HTTPException(404, str(e))


class CorrectionPayload(BaseModel):
    new_status: str
    reason: str


@router.post("/record/{record_id}/correct")
def correct_record(record_id: int, payload: CorrectionPayload, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = AttendanceService(db)
    try:
        return service.correct_attendance(record_id, payload.new_status, payload.reason, current_user.id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/student/{student_id}")
def student_attendance(
    student_id: int,
    session_id: Optional[int] = None,
    term_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_above),
):
    service = AttendanceService(db)
    return service.get_student_attendance(student_id, session_id, term_id, from_date, to_date)


@router.get("/monthly-report/{class_level_id}")
def monthly_report(class_level_id: int, year: int, month: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = AttendanceService(db)
    return service.get_monthly_report(class_level_id, year, month)
