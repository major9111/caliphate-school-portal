"""Attendance schemas."""
from typing import Optional, List
from datetime import date
from pydantic import BaseModel, ConfigDict
from app.schemas.common import TimestampMixinSchema


class AttendanceEntry(BaseModel):
    student_id: int
    status: str  # present/absent/late/excused
    remark: Optional[str] = None


class AttendanceBulkCreate(BaseModel):
    class_id: int
    term_id: int
    date: date
    entries: List[AttendanceEntry]


class AttendanceOut(TimestampMixinSchema):
    id: int
    student_id: int
    class_id: int
    term_id: int
    date: date
    status: str
    marked_by_id: int
    remark: Optional[str] = None
