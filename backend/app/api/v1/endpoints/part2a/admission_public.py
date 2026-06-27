"""Public admission endpoints (no auth required)."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.part2a.admission_service import AdmissionService
from app.services.storage_service import StorageService
from app.services.notification_service import NotificationService
from pydantic import BaseModel

router = APIRouter()


@router.post("/draft")
async def create_draft(
    request: Request,
    session_id: int = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    gender: str = Form(...),
    date_of_birth: str = Form(...),
    applying_for_class_id: int = Form(...),
    applicant_email: Optional[str] = Form(None),
    applicant_phone: Optional[str] = Form(None),
    other_names: Optional[str] = Form(None),
    nationality: str = Form("Nigerian"),
    state_of_origin: Optional[str] = Form(None),
    lga: Optional[str] = Form(None),
    religion: Optional[str] = Form(None),
    residential_address: Optional[str] = Form(None),
    previous_school: Optional[str] = Form(None),
    previous_class: Optional[str] = Form(None),
    father_name: Optional[str] = Form(None),
    father_phone: Optional[str] = Form(None),
    father_email: Optional[str] = Form(None),
    father_occupation: Optional[str] = Form(None),
    mother_name: Optional[str] = Form(None),
    mother_phone: Optional[str] = Form(None),
    mother_email: Optional[str] = Form(None),
    mother_occupation: Optional[str] = Form(None),
    guardian_name: Optional[str] = Form(None),
    guardian_relationship: Optional[str] = Form(None),
    guardian_phone: Optional[str] = Form(None),
    guardian_email: Optional[str] = Form(None),
    guardian_address: Optional[str] = Form(None),
    guardian_occupation: Optional[str] = Form(None),
    emergency_contact_name: Optional[str] = Form(None),
    emergency_contact_phone: Optional[str] = Form(None),
    emergency_contact_relationship: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    genotype: Optional[str] = Form(None),
    allergies: Optional[str] = Form(None),
    medical_conditions: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    service = AdmissionService(db)
    from app.core.dependencies import get_client_ip
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent")

    data = {
        "session_id": session_id, "first_name": first_name, "last_name": last_name,
        "gender": gender, "date_of_birth": datetime.strptime(date_of_birth, "%Y-%m-%d").date(),
        "applying_for_class_id": applying_for_class_id,
        "applicant_email": applicant_email, "applicant_phone": applicant_phone,
        "other_names": other_names, "nationality": nationality,
        "state_of_origin": state_of_origin, "lga": lga, "religion": religion,
        "residential_address": residential_address,
        "previous_school": previous_school, "previous_class": previous_class,
        "father_name": father_name, "father_phone": father_phone,
        "father_email": father_email, "father_occupation": father_occupation,
        "mother_name": mother_name, "mother_phone": mother_phone,
        "mother_email": mother_email, "mother_occupation": mother_occupation,
        "guardian_name": guardian_name, "guardian_relationship": guardian_relationship,
        "guardian_phone": guardian_phone, "guardian_email": guardian_email,
        "guardian_address": guardian_address, "guardian_occupation": guardian_occupation,
        "emergency_contact_name": emergency_contact_name,
        "emergency_contact_phone": emergency_contact_phone,
        "emergency_contact_relationship": emergency_contact_relationship,
        "blood_group": blood_group, "genotype": genotype,
        "allergies": allergies, "medical_conditions": medical_conditions,
    }
    app = service.create_draft(data, ip=ip, user_agent=ua)
    return {
        "id": app.id,
        "reference_number": app.reference_number,
        "status": app.status,
        "eligibility": service.check_eligibility(app.date_of_birth, app.applying_for_class_id),
    }


@router.post("/{app_id}/submit")
def submit_application(app_id: int, db: Session = Depends(get_db)):
    service = AdmissionService(db)
    try:
        app = service.submit(app_id)
        return {
            "id": app.id,
            "reference_number": app.reference_number,
            "status": app.status,
            "eligibility_passed": app.eligibility_check_passed,
            "eligibility_notes": app.eligibility_notes,
            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db)):
    service = AdmissionService(db)
    app = service.get(app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    return app


@router.post("/{app_id}/documents")
async def upload_document(
    app_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    service = AdmissionService(db)
    storage = StorageService()
    url = await storage.upload(file, folder=f"admissions/{app_id}")
    doc = service.upload_document(
        app_id=app_id,
        document_type=document_type,
        file_url=url,
        thumbnail_url=None,
        file_name=file.filename or "file",
        file_size=file.size or 0,
        mime_type=file.content_type or "application/octet-stream",
    )
    return doc


class StatusCheck(BaseModel):
    identifier: str


@router.post("/check-status")
def check_status(payload: StatusCheck, db: Session = Depends(get_db)):
    service = AdmissionService(db)
    result = service.check_status(payload.identifier)
    if not result:
        raise HTTPException(404, "Application not found")
    return result
