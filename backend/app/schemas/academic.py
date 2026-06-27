"""Academic schemas."""
from typing import Optional, List
from datetime import time
from pydantic import BaseModel, ConfigDict
from app.schemas.common import TimestampMixinSchema


class AcademicSessionCreate(BaseModel):
    name: str
    start_date: str
    end_date: str
    is_current: bool = False


class AcademicSessionOut(TimestampMixinSchema):
    id: int
    name: str
    start_date: str
    end_date: str
    is_current: int


class AcademicTermCreate(BaseModel):
    session_id: int
    name: str
    start_date: str
    end_date: str
    is_current: bool = False


class AcademicTermOut(TimestampMixinSchema):
    id: int
    session_id: int
    name: str
    start_date: str
    end_date: str
    is_current: int


class ClassLevelCreate(BaseModel):
    name: str
    section: str
    order_index: int = 0
    capacity: int = 40


class ClassLevelOut(TimestampMixinSchema):
    id: int
    name: str
    section: str
    order_index: int
    capacity: int
    is_active: int


class SubjectCreate(BaseModel):
    name: str
    code: str
    class_id: int
    credit_hours: int = 1
    is_compulsory: bool = True
    description: Optional[str] = None


class SubjectOut(TimestampMixinSchema):
    id: int
    name: str
    code: str
    class_id: int
    credit_hours: int
    is_compulsory: int
    description: Optional[str] = None


class TimetableCreate(BaseModel):
    class_id: int
    section_id: Optional[int] = None
    term_id: int
    day_of_week: str
    period_number: int
    start_time: time
    end_time: time
    subject_id: int
    teacher_id: int
    room: Optional[str] = None


class TimetableOut(TimestampMixinSchema):
    id: int
    class_id: int
    section_id: Optional[int] = None
    term_id: int
    day_of_week: str
    period_number: int
    start_time: time
    end_time: time
    subject_id: int
    teacher_id: int
    room: Optional[str] = None
