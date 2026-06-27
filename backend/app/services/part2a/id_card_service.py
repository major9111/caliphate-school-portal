"""ID Card generation with QR code and barcode."""
import os
import io
import base64
import uuid
from datetime import date
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.part2a.student_extended import StudentIDCard
from app.models.student import Student
from app.models.academic import AcademicSession, ClassLevel
from app.models.school import SchoolInfo


class IDCardService:
    def __init__(self, db: Session):
        self.db = db

    def generate_qr_code_base64(self, data: str) -> str:
        """Generate QR code as base64 string."""
        try:
            import qrcode
            from qrcode.image.pil import PilImage
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=2,
            )
            qr.add_data(data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            return base64.b64encode(buf.read()).decode("utf-8")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"QR generation failed: {e}")
            return ""

    def generate_barcode_base64(self, data: str) -> str:
        """Generate Code128 barcode as base64."""
        try:
            import barcode
            from barcode.writer import ImageWriter
            code128 = barcode.get_barcode_class('code128')
            writer = ImageWriter()
            buf = io.BytesIO()
            code128(data, writer=writer).write(buf, {"module_width": 0.3, "module_height": 10})
            buf.seek(0)
            return base64.b64encode(buf.read()).decode("utf-8")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Barcode generation failed: {e}")
            return ""

    def generate_card_number(self) -> str:
        year = date.today().strftime("%Y")
        unique = uuid.uuid4().hex[:8].upper()
        return f"CIS-{year}-{unique}"

    def issue_card(
        self,
        student_id: int,
        session_id: int,
        user_id: int,
        expiry_date: Optional[date] = None,
    ) -> StudentIDCard:
        """Issue an ID card for a student."""
        student = self.db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found")

        card_number = self.generate_card_number()

        # QR data: compact JSON-like string for scanning
        qr_data = (
            f"CIS|{student.admission_number}|{student.first_name} {student.last_name}"
            f"|{card_number}|{session_id}"
        )
        qr_base64 = self.generate_qr_code_base64(qr_data)

        # Save QR as file
        qr_url = None
        if qr_base64:
            qr_filename = f"qr_{card_number}.png"
            qr_path = os.path.join("uploads", "id_cards", qr_filename)
            os.makedirs(os.path.dirname(qr_path), exist_ok=True)
            with open(qr_path, "wb") as f:
                f.write(base64.b64decode(qr_base64))
            qr_url = f"/{qr_path}"

        # Barcode using admission number
        barcode_base64 = self.generate_barcode_base64(student.admission_number)
        barcode_url = None
        if barcode_base64:
            bc_filename = f"bc_{card_number}.png"
            bc_path = os.path.join("uploads", "id_cards", bc_filename)
            with open(bc_path, "wb") as f:
                f.write(base64.b64decode(barcode_base64))
            barcode_url = f"/{bc_path}"

        card = StudentIDCard(
            student_id=student_id,
            session_id=session_id,
            card_number=card_number,
            qr_code_data=qr_data,
            qr_code_image_url=qr_url,
            barcode_data=student.admission_number,
            barcode_image_url=barcode_url,
            issued_date=date.today(),
            expiry_date=expiry_date,
            issued_by_id=user_id,
        )
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def get_card_data(self, card_id: int) -> dict:
        """Get full card data with student and school info for printing."""
        card = self.db.query(StudentIDCard).filter(StudentIDCard.id == card_id).first()
        if not card:
            raise ValueError("ID card not found")
        student = self.db.query(Student).filter(Student.id == card.student_id).first()
        session = self.db.query(AcademicSession).filter(AcademicSession.id == card.session_id).first()
        class_level = self.db.query(ClassLevel).filter(ClassLevel.id == student.entry_class_id).first() if student else None
        school = self.db.query(SchoolInfo).first()

        guardian_phone = ""
        if student and student.guardian_id:
            from app.models.student import Guardian
            guardian = self.db.query(Guardian).filter(Guardian.id == student.guardian_id).first()
            if guardian:
                guardian_phone = guardian.phone

        return {
            "card": card,
            "student": student,
            "session": session,
            "class_level": class_level,
            "school": school,
            "emergency_contact": guardian_phone,
        }

    def list_cards_for_session(self, session_id: int) -> List[StudentIDCard]:
        return self.db.query(StudentIDCard).filter(
            StudentIDCard.session_id == session_id,
            StudentIDCard.is_active == True,
        ).all()

    def list_cards_for_student(self, student_id: int) -> List[StudentIDCard]:
        return self.db.query(StudentIDCard).filter(
            StudentIDCard.student_id == student_id
        ).order_by(StudentIDCard.issued_date.desc()).all()

    def bulk_issue(
        self,
        student_ids: List[int],
        session_id: int,
        user_id: int,
    ) -> dict:
        """Bulk issue ID cards."""
        issued = []
        failed = []
        for sid in student_ids:
            try:
                card = self.issue_card(sid, session_id, user_id)
                issued.append(card.id)
            except Exception as e:
                failed.append({"student_id": sid, "reason": str(e)})
        return {"issued": issued, "failed": failed}
