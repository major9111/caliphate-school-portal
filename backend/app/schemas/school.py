"""School info & management schemas."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.common import TimestampMixinSchema


class SchoolInfoUpdate(BaseModel):
    name: Optional[str] = None
    registration_number: Optional[str] = None
    registration_date: Optional[str] = None
    institution_type: Optional[str] = None
    business_activity: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None
    motto: Optional[str] = None
    vision: Optional[str] = None
    mission: Optional[str] = None
    history: Optional[str] = None
    principal_welcome: Optional[str] = None
    contact_numbers: Optional[List[str]] = None
    email: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    social_media: Optional[Dict[str, str]] = None
    primary_colors: Optional[List[str]] = None


class SchoolInfoOut(SchoolInfoUpdate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ManagementProfileCreate(BaseModel):
    position: str
    full_name: str
    photo_url: Optional[str] = None
    biography: Optional[str] = None
    qualifications: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    order_index: int = 0


class ManagementProfileUpdate(ManagementProfileCreate):
    is_active: Optional[bool] = None


class ManagementProfileOut(TimestampMixinSchema):
    id: int
    position: str
    full_name: str
    photo_url: Optional[str] = None
    biography: Optional[str] = None
    qualifications: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    order_index: int
    is_active: int
