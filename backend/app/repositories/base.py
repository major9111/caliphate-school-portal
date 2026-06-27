"""Generic repository base class."""
from typing import TypeVar, Type, Generic, Optional, List
from sqlalchemy.orm import Session
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """CRUD operations for a single model."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: int) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_many(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        filters: Optional[dict] = None,
        order_by=None,
    ) -> List[ModelType]:
        q = self.db.query(self.model)
        if filters:
            for k, v in filters.items():
                if hasattr(self.model, k) and v is not None:
                    q = q.filter(getattr(self.model, k) == v)
        if search and search_fields:
            from sqlalchemy import or_
            clauses = [
                getattr(self.model, f).ilike(f"%{search}%")
                for f in search_fields
                if hasattr(self.model, f)
            ]
            if clauses:
                q = q.filter(or_(*clauses))
        if order_by is not None:
            q = q.order_by(order_by)
        return q.offset(skip).limit(limit).all()

    def count(self, filters: Optional[dict] = None, search: Optional[str] = None, search_fields: Optional[List[str]] = None) -> int:
        q = self.db.query(self.model)
        if filters:
            for k, v in filters.items():
                if hasattr(self.model, k) and v is not None:
                    q = q.filter(getattr(self.model, k) == v)
        if search and search_fields:
            from sqlalchemy import or_
            clauses = [
                getattr(self.model, f).ilike(f"%{search}%")
                for f in search_fields
                if hasattr(self.model, f)
            ]
            if clauses:
                q = q.filter(or_(*clauses))
        return q.count()

    def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelType) -> ModelType:
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelType) -> None:
        self.db.delete(obj)
        self.db.commit()
