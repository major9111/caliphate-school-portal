"""Timetable endpoints with conflict detection."""
from typing import Optional, List
from datetime import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.services.part2a.timetable_service import TimetableService, TimetableConflictError
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class SlotCreate(BaseModel):
    class_level_id: int
    arm_id: Optional[int] = None
    day_of_week: int  # 0-5
    period: int  # 1-8
    start_time: time
    end_time: time
    subject_id: int
    teacher_id: int
    session_id: int
    term_id: int
    room: Optional[str] = None
    slot_type: str = "regular"
    color: Optional[str] = None
    notes: Optional[str] = None
    allow_conflicts: bool = False


@router.post("")
def add_slot(payload: SlotCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = TimetableService(db)
    try:
        return service.add_slot(**payload.model_dump())
    except TimetableConflictError as e:
        raise HTTPException(409, {"message": str(e), "conflicts": e.conflicts})


@router.patch("/{slot_id}")
def update_slot(slot_id: int, payload: SlotCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = TimetableService(db)
    try:
        return service.update_slot(slot_id, **payload.model_dump(exclude={"allow_conflicts"}))
    except TimetableConflictError as e:
        raise HTTPException(409, {"message": str(e), "conflicts": e.conflicts})


@router.delete("/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    if not TimetableService(db).delete_slot(slot_id):
        raise HTTPException(404, "Slot not found")
    return {"message": "Deleted"}


@router.get("/class/{class_level_id}")
def class_timetable(
    class_level_id: int,
    arm_id: Optional[int] = None,
    session_id: int = ...,
    term_id: int = ...,
    db: Session = Depends(get_db),
):
    return TimetableService(db).get_class_timetable(class_level_id, arm_id, session_id, term_id)


@router.get("/teacher/{teacher_id}")
def teacher_timetable(
    teacher_id: int,
    session_id: int,
    term_id: int,
    db: Session = Depends(get_db),
):
    return TimetableService(db).get_teacher_timetable(teacher_id, session_id, term_id)


class BulkSlots(BaseModel):
    slots: List[SlotCreate]


@router.post("/bulk")
def bulk_add(payload: BulkSlots, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = TimetableService(db)
    slots = [s.model_dump() for s in payload.slots]
    added = service.bulk_add_slots(slots)
    return {"added": len(added), "total": len(payload.slots)}


@router.post("/check-conflicts")
def check_conflicts(payload: SlotCreate, db: Session = Depends(get_db)):
    service = TimetableService(db)
    conflicts = service.check_conflicts(
        payload.class_level_id, payload.arm_id,
        payload.day_of_week, payload.period,
        payload.teacher_id, payload.session_id, payload.term_id,
    )
    return {"has_conflicts": len(conflicts) > 0, "conflicts": conflicts}
