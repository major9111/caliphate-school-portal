"""Admission application models."""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey,
    JSON, Index, Float,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class AdmissionApplication(TimestampMixin, Base):
    __tablename__ = "admission_applications"

    id = Column(Integer, primary_key=True, index=True)
    reference_number = Column(String(30), unique=True, nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)

    # Applicant Personal Info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    other_names = Column(String(100), nullable=True)
    gender = Column(String(10), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    nationality = Column(String(100), default="Nigerian")
    state_of_origin = Column(String(100), nullable=True)
    lga = Column(String(100), nullable=True)
    religion = Column(String(50), nullable=True)
    residential_address = Column(Text, nullable=True)

    # Contact
    applicant_email = Column(String(120), nullable=True, index=True)
    applicant_phone = Column(String(20), nullable=True, index=True)

    # Academic
    applying_for_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    previous_school = Column(String(200), nullable=True)
    previous_class = Column(String(50), nullable=True)
    last_result_summary = Column(Text, nullable=True)

    # Parent/Guardian
    father_name = Column(String(200), nullable=True)
    father_phone = Column(String(20), nullable=True)
    father_email = Column(String(120), nullable=True)
    father_occupation = Column(String(100), nullable=True)

    mother_name = Column(String(200), nullable=True)
    mother_phone = Column(String(20), nullable=True)
    mother_email = Column(String(120), nullable=True)
    mother_occupation = Column(String(100), nullable=True)

    guardian_name = Column(String(200), nullable=True)
    guardian_relationship = Column(String(50), nullable=True)
    guardian_phone = Column(String(20), nullable=True)
    guardian_email = Column(String(120), nullable=True)
    guardian_address = Column(Text, nullable=True)
    guardian_occupation = Column(String(100), nullable=True)

    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relationship = Column(String(50), nullable=True)

    # Medical
    blood_group = Column(String(5), nullable=True)
    genotype = Column(String(5), nullable=True)
    allergies = Column(Text, nullable=True)
    medical_conditions = Column(Text, nullable=True)

    # Status & workflow
    status = Column(String(30), default="draft", index=True)
    # draft, submitted, under_review, documents_required, interview_scheduled,
    # entrance_exam_scheduled, approved, rejected, admitted, on_hold

    interview_date = Column(DateTime(timezone=True), nullable=True)
    interview_notes = Column(Text, nullable=True)
    entrance_exam_date = Column(DateTime(timezone=True), nullable=True)
    entrance_exam_result = Column(Float, nullable=True)

    rejection_reason = Column(Text, nullable=True)
    on_hold_reason = Column(Text, nullable=True)
    additional_docs_required = Column(Text, nullable=True)

    # Outcome
    admission_number = Column(String(30), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    assigned_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=True)

    # Tracking
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    eligibility_check_passed = Column(Boolean, default=False)
    eligibility_notes = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    metadata = Column(JSON, default=dict)

    documents = relationship("ApplicationDocument", back_populates="application", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_admission_status_session", "status", "session_id"),
        Index("ix_admission_name", "last_name", "first_name"),
    )

    @property
    def full_name(self) -> str:
        parts = [self.first_name]
        if self.other_names:
            parts.append(self.other_names)
        parts.append(self.last_name)
        return " ".join(parts)


class ApplicationDocument(TimestampMixin, Base):
    __tablename__ = "application_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("admission_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False, index=True)
    # passport_photo, birth_certificate, previous_result, guardian_id,
    # medical_report, recommendation_letter, other
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    file_name = Column(String(300), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_notes = Column(Text, nullable=True)

    application = relationship("AdmissionApplication", back_populates="documents")
