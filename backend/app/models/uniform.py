"""Uniform management."""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Uniform(TimestampMixin, Base):
    __tablename__ = "uniforms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(40), nullable=False, index=True)  # male_nursery, sports_wear, etc.
    description = Column(Text, nullable=True)
    applicable_class = Column(String(100), nullable=True)
    applicable_gender = Column(String(10), nullable=True)  # male/female/unisex
    colors = Column(Text, nullable=True)  # comma-separated
    dress_code_notes = Column(Text, nullable=True)
    purchase_info = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    is_active = Column(Integer, default=1)

    images = relationship("UniformImage", back_populates="uniform", cascade="all, delete-orphan")


class UniformImage(TimestampMixin, Base):
    __tablename__ = "uniform_images"

    id = Column(Integer, primary_key=True, index=True)
    uniform_id = Column(Integer, ForeignKey("uniforms.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    order_index = Column(Integer, default=0)

    uniform = relationship("Uniform", back_populates="images")
