"""ID Card endpoints."""
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.services.part2a.id_card_service import IDCardService
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class IssueCard(BaseModel):
    student_id: int
    session_id: int
    expiry_date: Optional[date] = None


@router.post("")
def issue_card(payload: IssueCard, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = IDCardService(db)
    try:
        return service.issue_card(payload.student_id, payload.session_id, current_user.id, payload.expiry_date)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{card_id}")
def get_card(card_id: int, db: Session = Depends(get_db)):
    service = IDCardService(db)
    try:
        return service.get_card_data(card_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/student/{student_id}")
def list_for_student(student_id: int, db: Session = Depends(get_db)):
    return IDCardService(db).list_cards_for_student(student_id)


@router.get("/session/{session_id}")
def list_for_session(session_id: int, db: Session = Depends(get_db)):
    return IDCardService(db).list_cards_for_session(session_id)


class BulkIssue(BaseModel):
    student_ids: List[int]
    session_id: int


@router.post("/bulk-issue")
def bulk_issue(payload: BulkIssue, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_above)):
    service = IDCardService(db)
    return service.bulk_issue(payload.student_ids, payload.session_id, current_user.id)
