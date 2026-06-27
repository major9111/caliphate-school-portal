"""Extended student models: documents, medical alerts, ID cards, promotion, transfer."""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey, JSON, Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class StudentDocument(TimestampMixin, Base):
    """Documents attached to a student profile."""
    __tablename__ = "student_documents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False, index=True)
    # passport, birth_certificate, admission_letter, transfer_letter,
    # previous_result, medical_report, other
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    file_name = Column(String(300), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_student_docs_type", "student_id", "document_type"),
    )


class StudentMedicalAlert(TimestampMixin, Base):
    """Emergency medical alerts only (not clinic management)."""
    __tablename__ = "student_medical_alerts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)  # allergy, emergency_note, medication
    title = Column(String(200), nullable=False)
    details = Column(Text, nullable=True)
    severity = Column(String(20), default="normal")  # low, normal, high, critical
    is_active = Column(Boolean, default=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class StudentIDCard(TimestampMixin, Base):
    """Generated ID cards for students."""
    __tablename__ = "student_id_cards"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)
    card_number = Column(String(30), unique=True, nullable=False)
    qr_code_data = Column(Text, nullable=False)
    qr_code_image_url = Column(String(500), nullable=True)
    barcode_data = Column(String(50), nullable=True)
    barcode_image_url = Column(String(500), nullable=True)
    front_pdf_url = Column(String(500), nullable=True)
    back_pdf_url = Column(String(500), nullable=True)
    issued_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class StudentPromotion(TimestampMixin, Base):
    """Promotion history for students."""
    __tablename__ = "student_promotions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=True)
    from_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    to_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    promotion_type = Column(String(30), nullable=False)
    # automatic, manual, repeat, graduate, transfer_in
    average_score = Column(Integer, nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_promo_student_session", "student_id", "session_id"),
    )


class StudentTransfer(TimestampMixin, Base):
    """Transfer records."""
    __tablename__ = "student_transfers"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    transfer_type = Column(String(20), nullable=False)  # internal, external_out, external_in
    from_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=True)
    to_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=True)
    from_school = Column(String(200), nullable=True)  # for external_in
    to_school = Column(String(200), nullable=True)  # for external_out
    transfer_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    certificate_url = Column(String(500), nullable=True)
    certificate_issued_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, completed
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
