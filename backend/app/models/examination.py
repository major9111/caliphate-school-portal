"""Examinations, schedules, results."""
from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Text
from app.core.database import Base
from app.models.base import TimestampMixin


class GradingSystem(TimestampMixin, Base):
    __tablename__ = "grading_systems"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    section = Column(String(30), nullable=False)
    min_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    grade = Column(String(5), nullable=False)
    remark = Column(String(50), nullable=True)


class Exam(TimestampMixin, Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    exam_type = Column(String(20), nullable=False)  # ca1, ca2, exam
    class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=False)
    total_marks = Column(Float, default=100)
    description = Column(Text, nullable=True)


class ExamSchedule(TimestampMixin, Base):
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    venue = Column(String(100), nullable=True)
    invigilator_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class Result(TimestampMixin, Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    total_score = Column(Float, nullable=True)
    grade = Column(String(5), nullable=True)
    remark = Column(String(50), nullable=True)
    position_in_class = Column(Integer, nullable=True)
    published = Column(Integer, default=0)


class ResultDetail(TimestampMixin, Base):
    __tablename__ = "result_details"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("results.id", ondelete="CASCADE"), nullable=False)
    component = Column(String(50), nullable=False)  # CA1, CA2, Exam
    max_score = Column(Float, nullable=False)
    score_obtained = Column(Float, nullable=False)
