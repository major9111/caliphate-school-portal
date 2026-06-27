"""Installation endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.installation_service import InstallationService
from pydantic import BaseModel

router = APIRouter()

class InstallationData(BaseModel):
    school_name: str
    address: str
    city: str
    state: str
    email: str
    admin_email: str
    admin_username: str
    admin_name: str
    admin_password: str
    session_name: str = "2025/2026"

@router.get("/status")
def status(db: Session = Depends(get_db)):
    service = InstallationService(db)
    return {"is_installed": service.is_installed()}

@router.post("/install")
def install(data: InstallationData, db: Session = Depends(get_db)):
    service = InstallationService(db)
    return service.install(data.model_dump())
