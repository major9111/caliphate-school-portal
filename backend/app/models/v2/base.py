"""UUID-based base mixin with full audit trail."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean, func
from sqlalchemy.orm import declared_attr
from app.core.database import Base


class UUIDAuditMixin:
    """
    Standard base for all Part 1B+ tables.
    - UUID primary key
    - Created/updated timestamps
    - Created by / updated by user tracking
    - Soft delete support
    """

    @declared_attr
    def id(cls):
        return Column(
            String(36),
            primary_key=True,
            default=lambda: str(uuid.uuid4()),
            index=True,
        )

    @declared_attr
    def created_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @declared_attr
    def updated_at(cls):
        return Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        )

    @declared_attr
    def created_by_id(cls):
        return Column(Integer, nullable=True, index=True)

    @declared_attr
    def updated_by_id(cls):
        return Column(Integer, nullable=True, index=True)

    @declared_attr
    def is_deleted(cls):
        return Column(Boolean, default=False, nullable=False, index=True)

    @declared_attr
    def deleted_at(cls):
        return Column(DateTime(timezone=True), nullable=True)

    def soft_delete(self, user_id: int = None):
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        if user_id:
            self.updated_by_id = user_id
