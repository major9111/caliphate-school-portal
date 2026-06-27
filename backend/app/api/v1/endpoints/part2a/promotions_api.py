"""Promotion endpoints."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.services.part2a.promotion_service import PromotionService
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class PromotePayload(BaseModel):
    student_id: int
    from_class_id: int
    to_class_id: int
    session_id: int
    term_id: Optional[int] = None
    promotion_type: str = "manual"
    average_score: Optional[int] = None
    reason: Optional[str] = None
    auto_approve: bool = True


@router.post("")
def promote(payload: PromotePayload, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = PromotionService(db)
    try:
        return service.promote(**payload.model_dump(), user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))


class BulkPromote(BaseModel):
    student_ids: List[int]
    to_class_id: int
    session_id: int
    promotion_type: str = "automatic"


@router.post("/bulk")
def bulk_promote(payload: BulkPromote, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = PromotionService(db)
    return service.bulk_promote(payload.student_ids, payload.to_class_id, payload.session_id, current_user.id, payload.promotion_type)


@router.post("/{student_id}/repeat")
def repeat(student_id: int, session_id: int, reason: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = PromotionService(db)
    try:
        return service.repeat_class(student_id, session_id, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{student_id}/graduate")
def graduate(student_id: int, session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = PromotionService(db)
    try:
        return service.graduate(student_id, session_id, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{student_id}")
def list_promotions(student_id: int, db: Session = Depends(get_db)):
    return PromotionService(db).list_promotions(student_id=student_id)


class EligibilityCheck(BaseModel):
    student_id: int
    to_class_id: int
    average_score: Optional[int] = None


@router.post("/check-eligibility")
def check_eligibility(payload: EligibilityCheck, db: Session = Depends(get_db)):
    service = PromotionService(db)
    try:
        return service.check_eligibility(payload.student_id, payload.to_class_id, payload.average_score)
    except ValueError as e:
        raise HTTPException(400, str(e))
