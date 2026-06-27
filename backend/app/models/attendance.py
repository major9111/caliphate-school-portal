"""Attendance records."""
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from app.core.database import Base
from app.models.base import TimestampMixin


class StudentAttendance(TimestampMixin, Base):
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False)  # present/absent/late/excused
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    remark = Column(Text, nullable=True)


class StaffAttendance(TimestampMixin, Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(String(20), nullable=True)
    check_out = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False)
    remark = Column(Text, nullable=True)
