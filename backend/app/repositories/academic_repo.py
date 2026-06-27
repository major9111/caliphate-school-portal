"""Academic repositories."""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.academic import AcademicSession, AcademicTerm, ClassLevel, Subject
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[AcademicSession]):
    def __init__(self, db: Session):
        super().__init__(AcademicSession, db)

    def get_current(self) -> Optional[AcademicSession]:
        return self.db.query(AcademicSession).filter(AcademicSession.is_current == 1).first()


class TermRepository(BaseRepository[AcademicTerm]):
    def __init__(self, db: Session):
        super().__init__(AcademicTerm, db)

    def get_current(self) -> Optional[AcademicTerm]:
        return self.db.query(AcademicTerm).filter(AcademicTerm.is_current == 1).first()


class ClassRepository(BaseRepository[ClassLevel]):
    def __init__(self, db: Session):
        super().__init__(ClassLevel, db)


class SubjectRepository(BaseRepository[Subject]):
    def __init__(self, db: Session):
        super().__init__(Subject, db)
