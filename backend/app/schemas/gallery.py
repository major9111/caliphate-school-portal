"""Gallery schemas."""
from typing import Optional, List
from datetime import date
from pydantic import BaseModel, ConfigDict
from app.schemas.common import TimestampMixinSchema


class MediaCreate(BaseModel):
    media_type: str = "image"
    url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    order_index: int = 0


class MediaOut(TimestampMixinSchema):
    id: int
    album_id: int
    media_type: str
    url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    order_index: int


class AlbumCreate(BaseModel):
    title: str
    slug: str
    category: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    event_date: Optional[date] = None


class AlbumOut(TimestampMixinSchema):
    id: int
    title: str
    slug: str
    category: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    event_date: Optional[date] = None
    is_published: int
    media: List[MediaOut] = []
