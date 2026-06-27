"""QR Code generation service."""
import io
import uuid
import segno
from sqlalchemy.orm import Session
from app.models.student_v2.student import StudentV2
from app.models.hr.teacher import Teacher
from app.models.hr.staff import Staff
from app.models.finance_v2.payment import PaymentV2
from app.core.exceptions import NotFoundError


class QRService:
    def __init__(self, db: Session):
        self.db = db

    def generate_student_qr(self, student_id: str) -> bytes:
        student = self.db.query(StudentV2).filter(StudentV2.id == student_id).first()
        if not student:
            raise NotFoundError("Student not found")
        data = f"VERIFY:STUDENT|{uuid.uuid4().hex[:16].upper()}|{student.admission_number}|{student.full_name}"
        return self._create_qr(data)

    def generate_teacher_qr(self, teacher_id: int) -> bytes:
        teacher = self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            raise NotFoundError("Teacher not found")
        data = f"VERIFY:TEACHER|{uuid.uuid4().hex[:16].upper()}|{teacher.staff_id}|{teacher.full_name}"
        return self._create_qr(data)

    def generate_staff_qr(self, staff_id: int) -> bytes:
        staff = self.db.query(Staff).filter(Staff.id == staff_id).first()
        if not staff:
            raise NotFoundError("Staff not found")
        data = f"VERIFY:STAFF|{uuid.uuid4().hex[:16].upper()}|{staff.staff_id}|{staff.full_name}"
        return self._create_qr(data)

    def generate_receipt_qr(self, payment_id: str) -> bytes:
        payment = self.db.query(PaymentV2).filter(PaymentV2.id == payment_id).first()
        if not payment:
            raise NotFoundError("Payment not found")
        data = f"VERIFY:RECEIPT|{payment.receipt_number}|{payment.amount}|{payment.payment_date}"
        return self._create_qr(data)

    def _create_qr(self, data: str) -> bytes:
        qr = segno.make(data, error='H', border=2)
        buffer = io.BytesIO()
        qr.save(buffer, kind='png', scale=10)
        buffer.seek(0)
        return buffer.getvalue()
