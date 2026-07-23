"""Public admissions submission endpoint — no authentication required.

The "Apply for Admission" page on the public site is filled out by
prospective applicants who are not logged in, so it must not sit behind
the staff-only /admin router. Everything else about an admission
(listing, status updates, enrollment) stays staff-gated under
/admin/admissions in admin_modules.py — this only adds the one public
write path a visitor actually needs.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.admin_modules import _load_table, _save_table
import uuid
from datetime import datetime, timezone

router = APIRouter()


@router.post("/admissions")
def submit_admission(data: dict, db: Session = Depends(get_db)):
    if not data.get("applicant_name") or not data.get("email"):
        raise HTTPException(status_code=422, detail="applicant_name and email are required")
    items = _load_table(db, "admissions")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "status": "pending",
        "application_number": f"APP/{datetime.now(timezone.utc).year}/{uuid.uuid4().hex[:6].upper()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save_table(db, "admissions", items, "admissions")
    return new_item
