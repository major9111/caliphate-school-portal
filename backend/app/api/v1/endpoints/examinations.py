"""Examination endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_teacher_or_above
from app.models.examination import Exam, Result, ResultDetail
from app.schemas.examination import ExamCreate, ExamOut, ResultCreate, ResultOut
from app.models.user import User

router = APIRouter()


@router.get("/exams", response_model=List[ExamOut])
def list_exams(class_id: int = None, term_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Exam)
    if class_id:
        q = q.filter(Exam.class_id == class_id)
    if term_id:
        q = q.filter(Exam.term_id == term_id)
    return q.all()


@router.post("/exams", response_model=ExamOut, status_code=201)
def create_exam(payload: ExamCreate, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    exam = Exam(**payload.model_dump())
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.post("/results", response_model=ResultOut, status_code=201)
def submit_result(payload: ResultCreate, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    total = sum(d.score_obtained for d in payload.details)
    exam = db.query(Exam).filter(Exam.id == payload.exam_id).first()
    if not exam:
        raise HTTPException(404, "Exam not found")
    pct = (total / exam.total_marks) * 100 if exam.total_marks else 0
    grade, remark = _compute_grade(pct)
    result = Result(
        student_id=payload.student_id,
        exam_id=payload.exam_id,
        total_score=total,
        grade=grade,
        remark=remark,
    )
    db.add(result)
    db.flush()
    for d in payload.details:
        db.add(ResultDetail(result_id=result.id, **d.model_dump()))
    db.commit()
    db.refresh(result)
    return result


def _compute_grade(pct: float):
    if pct >= 75:
        return "A1", "Excellent"
    if pct >= 70:
        return "B2", "Very Good"
    if pct >= 65:
        return "B3", "Good"
    if pct >= 60:
        return "C4", "Credit"
    if pct >= 55:
        return "C5", "Credit"
    if pct >= 50:
        return "C6", "Credit"
    if pct >= 45:
        return "D7", "Pass"
    if pct >= 40:
        return "E8", "Pass"
    return "F9", "Fail"


@router.get("/results", response_model=List[ResultOut])
def list_results(exam_id: int = None, student_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Result)
    if exam_id:
        q = q.filter(Result.exam_id == exam_id)
    if student_id:
        q = q.filter(Result.student_id == student_id)
    return q.all()
