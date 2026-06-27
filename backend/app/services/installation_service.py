"""Installation wizard service."""
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.school import SchoolInfo
from app.models.user import User
from app.models.academic import AcademicSession, AcademicTerm, ClassLevel
from app.core.security import hash_password
from app.services.settings_service import SettingsService


class InstallationService:
    def __init__(self, db: Session):
        self.db = db

    def is_installed(self) -> bool:
        return self.db.query(SchoolInfo).first() is not None

    def install(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if self.is_installed():
            return {"success": False, "message": "Already installed"}

        try:
            # School info
            school = SchoolInfo(
                id=1,
                name=data.get("school_name"),
                registration_number=data.get("registration_number", "RC 1159138"),
                address=data.get("address"),
                city=data.get("city"),
                state=data.get("state"),
                country=data.get("country", "Nigeria"),
                motto=data.get("motto", "Knowledge, Faith and Excellence"),
                email=data.get("email"),
            )
            self.db.add(school)

            # Admin user
            admin = User(
                email=data.get("admin_email"),
                username=data.get("admin_username", "superadmin"),
                full_name=data.get("admin_name"),
                hashed_password=hash_password(data.get("admin_password")),
                role="super_admin",
                is_active=True,
                is_verified=True,
            )
            self.db.add(admin)

            # Academic session
            session = AcademicSession(
                name=data.get("session_name", "2025/2026"),
                start_date=data.get("session_start", "2025-09-01"),
                end_date=data.get("session_end", "2026-07-31"),
                is_current=True,
            )
            self.db.add(session)
            self.db.flush()

            # Terms
            for i, term_name in enumerate(["First Term", "Second Term", "Third Term"], 1):
                term = AcademicTerm(
                    session_id=session.id,
                    name=term_name,
                    start_date=f"2025-{9 + (i-1)*3:02d}-01",
                    end_date=f"2026-{1 + (i-1)*3:02d}-31",
                    is_current=(i == 1),
                )
                self.db.add(term)

            # Classes
            classes = [
                ("Nursery 1", "nursery"), ("Nursery 2", "nursery"), ("Nursery 3", "nursery"),
                ("Primary 1", "primary"), ("Primary 2", "primary"), ("Primary 3", "primary"),
                ("Primary 4", "primary"), ("Primary 5", "primary"), ("Primary 6", "primary"),
                ("JSS 1", "junior_secondary"), ("JSS 2", "junior_secondary"), ("JSS 3", "junior_secondary"),
                ("SSS 1", "senior_secondary"), ("SSS 2", "senior_secondary"), ("SSS 3", "senior_secondary"),
            ]
            for name, section in classes:
                self.db.add(ClassLevel(name=name, section=section))

            # Settings
            SettingsService(self.db).seed_defaults()

            self.db.commit()
            return {"success": True, "message": "Installation complete"}

        except Exception as e:
            self.db.rollback()
            return {"success": False, "message": str(e)}
