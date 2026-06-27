"""Enhanced academic configuration: class arms, grading, promotion, calendar."""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, Date, Time,
    ForeignKey, JSON, Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.v2.base import UUIDAuditMixin


class ClassArm(UUIDAuditMixin, Base):
    """Parallel arms within a class level (e.g. JSS1A, JSS1B)."""
    __tablename__ = "class_arms_v2"

    name = Column(String(20), nullable=False)  # A, B, C, Blue, Green
    class_level_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False, index=True)
    capacity = Column(Integer, default=30)
    class_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assistant_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    room = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    order_index = Column(Integer, default=0)

    __table_args__ = (
        Index("ix_class_arms_unique", "class_level_id", "name", unique=True),
    )


class GradingSystem(UUIDAuditMixin, Base):
    """Configurable grading scales per section."""
    __tablename__ = "grading_systems_v2"

    name = Column(String(100), nullable=False)
    section = Column(String(30), nullable=False, index=True)  # nursery/primary/jss/sss
    min_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    grade = Column(String(10), nullable=False)
    remark = Column(String(100), nullable=True)
    gpa_value = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)


class PromotionRule(UUIDAuditMixin, Base):
    """Rules for student promotion between classes."""
    __tablename__ = "promotion_rules_v2"

    name = Column(String(100), nullable=False)
    from_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    to_class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    min_average_score = Column(Float, default=40)
    min_subjects_passed = Column(Integer, default=0)
    compulsory_subjects = Column(JSON, default=list)  # subject codes that must pass
    max_failures_allowed = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)
    conditions = Column(JSONB, default=dict)  # flexible conditions


class ResultComputationRule(UUIDAuditMixin, Base):
    """Rules for computing results (CA vs Exam weighting)."""
    __tablename__ = "result_computation_rules_v2"

    name = Column(String(100), nullable=False)
    section = Column(String(30), nullable=False, index=True)
    ca_weight = Column(Float, default=30)  # percentage
    exam_weight = Column(Float, default=70)
    ca_components = Column(JSONB, default=list)  # [{name: "CA1", weight: 10}, ...]
    is_active = Column(Boolean, default=True)


class AttendanceRule(UUIDAuditMixin, Base):
    """Attendance policies."""
    __tablename__ = "attendance_rules_v2"

    name = Column(String(100), nullable=False)
    min_attendance_percentage = Column(Float, default=75)
    late_threshold_minutes = Column(Integer, default=15)
    auto_absent_after_days = Column(Integer, default=5)
    notification_triggers = Column(JSONB, default=list)  # [3, 5, 10] days absent
    is_active = Column(Boolean, default=True)


class SchoolCalendar(UUIDAuditMixin, Base):
    """Academic calendar with term dates and key events."""
    __tablename__ = "school_calendar_v2"

    name = Column(String(100), nullable=False)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False, index=True)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=True)
    resume_date = Column(Date, nullable=False)
    closing_date = Column(Date, nullable=False)
    mid_term_break_start = Column(Date, nullable=True)
    mid_term_break_end = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)


class PublicHoliday(UUIDAuditMixin, Base):
    """Public and school-specific holidays."""
    __tablename__ = "public_holidays_v2"

    name = Column(String(200), nullable=False)
    date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True)  # for multi-day holidays
    holiday_type = Column(String(30), default="public")  # public, religious, school
    is_recurring = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class ExamCalendar(UUIDAuditMixin, Base):
    """Examination timetable at the school level."""
    __tablename__ = "exam_calendar_v2"

    name = Column(String(100), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=False, index=True)
    exam_type = Column(String(30), nullable=False)  # ca1, ca2, ca3, exam
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_published = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
