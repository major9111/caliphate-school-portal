"""Student schemas."""
from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import TimestampMixinSchema


class GuardianCreate(BaseModel):
    full_name: str
    relationship_to_student: str
    phone: str
    email: Optional[str] = None
    occupation: Optional[str] = None
    address: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    photo_url: Optional[str] = None


class GuardianOut(TimestampMixinSchema):
    id: int
    full_name: str
    relationship_to_student: str
    phone: str
    email: Optional[str] = None
    occupation: Optional[str] = None
    address: Optional[str] = None


class StudentCreate(BaseModel):
    admission_number: str
    first_name: str
    last_name: str
    other_names: Optional[str] = None
    gender: str
    date_of_birth: date
    nationality: str = "Nigerian"
    state_of_origin: Optional[str] = None
    lga: Optional[str] = None
    religion: Optional[str] = None
    blood_group: Optional[str] = None
    genotype: Optional[str] = None
    home_address: Optional[str] = None
    photo_url: Optional[str] = None
    birth_certificate_url: Optional[str] = None
    guardian_id: Optional[int] = None
    admission_status: str = "pending"
    admission_date: Optional[date] = None
    entry_class_id: Optional[int] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    other_names: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    state_of_origin: Optional[str] = None
    lga: Optional[str] = None
    religion: Optional[str] = None
    blood_group: Optional[str] = None
    genotype: Optional[str] = None
    home_address: Optional[str] = None
    photo_url: Optional[str] = None
    guardian_id: Optional[int] = None
    admission_status: Optional[str] = None
    admission_date: Optional[date] = None
    entry_class_id: Optional[int] = None
    is_active: Optional[int] = None


class StudentOut(TimestampMixinSchema):
    id: int
    admission_number: str
    first_name: str
    last_name: str
    other_names: Optional[str] = None
    gender: str
    date_of_birth: date
    nationality: Optional[str] = None
    state_of_origin: Optional[str] = None
    religion: Optional[str] = None
    photo_url: Optional[str] = None
    admission_status: str
    admission_date: Optional[date] = None
    is_active: int
    guardian: Optional[GuardianOut] = None
