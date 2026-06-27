"""QR verification service."""
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.student_v2.student import StudentV2
from app.models.hr.teacher import Teacher
from app.models.hr.staff import Staff
from app.models.finance_v2.payment import PaymentV2


class VerificationService:
    def __init__(self, db: Session):
        self.db = db

    def verify_qr(self, qr_data: str) -> Dict[str, Any]:
        if not qr_data or not qr_data.startswith("VERIFY:"):
            return {"valid": False, "message": "Invalid QR code"}

        parts = qr_data.split("|")
        if len(parts) < 2:
            return {"valid": False, "message": "Malformed QR"}

        entity_type = parts[0].replace("VERIFY:", "")

        if entity_type == "STUDENT":
            student = self.db.query(StudentV2).filter(
                StudentV2.admission_number == parts[2]
            ).first()
            if student and student.full_name == parts[3]:
                return {"valid": True, "type": "student", "data": {"name": student.full_name, "admission": student.admission_number}}
        
        elif entity_type == "TEACHER":
            teacher = self.db.query(Teacher).filter(Teacher.staff_id == parts[2]).first()
            if teacher and teacher.full_name == parts[3]:
                return {"valid": True, "type": "teacher", "data": {"name": teacher.full_name, "staff_id": teacher.staff_id}}
        
        elif entity_type == "STAFF":
            staff = self.db.query(Staff).filter(Staff.staff_id == parts[2]).first()
            if staff and staff.full_name == parts[3]:
                return {"valid": True, "type": "staff", "data": {"name": staff.full_name, "staff_id": staff.staff_id}}
        
        elif entity_type == "RECEIPT":
            payment = self.db.query(PaymentV2).filter(PaymentV2.receipt_number == parts[1]).first()
            if payment:
                return {"valid": True, "type": "receipt", "data": {"receipt": payment.receipt_number, "amount": payment.amount}}

        return {"valid": False, "message": "Verification failed"}
