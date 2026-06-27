"""QR code endpoints."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_teacher_or_above
from app.models.user import User
from app.services.qr.qr_service import QRService
from app.services.qr.verification_service import VerificationService

router = APIRouter()

@router.get("/student/{student_id}/qr")
def student_qr(student_id: str, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = QRService(db)
    return Response(content=service.generate_student_qr(student_id), media_type="image/png")

@router.get("/teacher/{teacher_id}/qr")
def teacher_qr(teacher_id: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = QRService(db)
    return Response(content=service.generate_teacher_qr(teacher_id), media_type="image/png")

@router.get("/staff/{staff_id}/qr")
def staff_qr(staff_id: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = QRService(db)
    return Response(content=service.generate_staff_qr(staff_id), media_type="image/png")

@router.get("/payment/{payment_id}/qr")
def payment_qr(payment_id: str, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_above)):
    service = QRService(db)
    return Response(content=service.generate_receipt_qr(payment_id), media_type="image/png")

@router.post("/verify")
def verify_qr(qr_data: str, db: Session = Depends(get_db)):
    service = VerificationService(db)
    return service.verify_qr(qr_data)
