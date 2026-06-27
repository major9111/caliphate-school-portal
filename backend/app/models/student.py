"""Students, guardians, enrollments."""
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.enums import Gender, AdmissionStatus


class Guardian(TimestampMixin, Base):
    __tablename__ = "guardians"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    relationship_to_student = Column(String(50), nullable=False)  # Father, Mother, Guardian
    phone = Column(String(20), nullable=False)
    email = Column(String(120), nullable=True)
    occupation = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    id_type = Column(String(50), nullable=True)
    id_number = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    admission_number = Column(String(30), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    other_names = Column(String(100), nullable=True)
    gender = Column(String(10), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    nationality = Column(String(100), default="Nigerian")
    state_of_origin = Column(String(100), nullable=True)
    lga = Column(String(100), nullable=True)
    religion = Column(String(50), nullable=True)
    blood_group = Column(String(5), nullable=True)
    genotype = Column(String(5), nullable=True)

    home_address = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    birth_certificate_url = Column(String(500), nullable=True)

    guardian_id = Column(Integer, ForeignKey("guardians.id"), nullable=True)

    admission_status = Column(String(20), default=AdmissionStatus.PENDING.value)
    admission_date = Column(Date, nullable=True)
    entry_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=True)

    is_active = Column(Integer, default=1)

    guardian = relationship("Guardian")
    enrollments = relationship("Enrollment", back_populates="student")

    __table_args__ = (
        Index("ix_students_name", "last_name", "first_name"),
    )

    @property
    def full_name(self) -> str:
        parts = [self.first_name]
        if self.other_names:
            parts.append(self.other_names)
        parts.append(self.last_name)
        return " ".join(parts)


class Enrollment(TimestampMixin, Base):
    """Tracks a student's class/section per academic session & term."""
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=False)
    is_current = Column(Integer, default=0)

    student = relationship("Student", back_populates="enrollments")
