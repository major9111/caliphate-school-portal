"""Admin modules endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.core.database import get_db
import json
import uuid
from datetime import datetime

router = APIRouter()


def _load_table(db: Session, table: str):
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR PRIMARY KEY, value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        row = db.execute(text("SELECT value FROM system_settings WHERE key = :key"), {"key": table}).fetchone()
        if row:
            return json.loads(row[0])
    except:
        pass
    return []


def _save_table(db: Session, table: str, data):
    value_json = json.dumps(data)
    existing = db.execute(text("SELECT key FROM system_settings WHERE key = :key"), {"key": table}).fetchone()
    if existing:
        db.execute(text("UPDATE system_settings SET value = :value WHERE key = :key"), {"key": table, "value": value_json})
    else:
        db.execute(text("INSERT INTO system_settings (key, value) VALUES (:key, :value)"), {"key": table, "value": value_json})
    db.commit()


# Exams
@router.get("/exams")
def list_exams(db: Session = Depends(get_db)):
    items = _load_table(db, "exams")
    return {"items": items, "total": len(items)}

@router.post("/exams")
def create_exam(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "exams")
    new_item = {**data, "id": str(uuid.uuid4()), "created_at": datetime.utcnow().isoformat()}
    items.insert(0, new_item)
    _save_table(db, "exams", items)
    return new_item

@router.delete("/exams/{item_id}")
def delete_exam(item_id: str, db: Session = Depends(get_db)):
    items = [e for e in _load_table(db, "exams") if e["id"] != item_id]
    _save_table(db, "exams", items)
    return {"message": "Deleted"}


# Schedule
@router.get("/schedule")
def list_schedule(db: Session = Depends(get_db)):
    return {"items": _load_table(db, "schedule")}

@router.post("/schedule")
def create_schedule(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "schedule")
    items.append({**data, "id": str(uuid.uuid4())})
    _save_table(db, "schedule", items)
    return {"message": "Created"}

@router.delete("/schedule/{item_id}")
def delete_schedule(item_id: str, db: Session = Depends(get_db)):
    items = [s for s in _load_table(db, "schedule") if s["id"] != item_id]
    _save_table(db, "schedule", items)
    return {"message": "Deleted"}


# Admissions
@router.get("/admissions")
def list_admissions(db: Session = Depends(get_db)):
    items = _load_table(db, "admissions")
    return {"items": items, "total": len(items)}

@router.post("/admissions")
def create_admission(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "admissions")
    new_id = f"APP-{datetime.utcnow().strftime('%Y')}-{len(items)+1:03d}"
    new_item = {**data, "id": new_id, "date_submitted": datetime.utcnow().strftime("%b %d, %Y"), "status": "pending"}
    items.insert(0, new_item)
    _save_table(db, "admissions", items)
    return new_item

@router.put("/admissions/{item_id}/status")
def update_admission_status(item_id: str, status: str, db: Session = Depends(get_db)):
    items = _load_table(db, "admissions")
    for a in items:
        if a["id"] == item_id:
            a["status"] = status
            break
    _save_table(db, "admissions", items)
    return {"message": "Updated"}


# Announcements
@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db)):
    return {"items": _load_table(db, "announcements")}

@router.post("/announcements")
def create_announcement(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "announcements")
    items.insert(0, {**data, "id": str(uuid.uuid4()), "created_at": datetime.utcnow().isoformat()})
    _save_table(db, "announcements", items)
    return {"message": "Created"}

@router.delete("/announcements/{item_id}")
def delete_announcement(item_id: str, db: Session = Depends(get_db)):
    items = [a for a in _load_table(db, "announcements") if a["id"] != item_id]
    _save_table(db, "announcements", items)
    return {"message": "Deleted"}


# CMS
@router.get("/cms/pages")
def list_pages(db: Session = Depends(get_db)):
    return {"items": _load_table(db, "cms_pages")}

@router.post("/cms/pages")
def create_page(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "cms_pages")
    items.append({**data, "id": str(uuid.uuid4()), "last_edited": datetime.utcnow().strftime("%b %d, %Y")})
    _save_table(db, "cms_pages", items)
    return {"message": "Created"}

@router.delete("/cms/pages/{page_id}")
def delete_page(page_id: str, db: Session = Depends(get_db)):
    items = [p for p in _load_table(db, "cms_pages") if p["id"] != page_id]
    _save_table(db, "cms_pages", items)
    return {"message": "Deleted"}


# AI Knowledge
@router.get("/ai/knowledge")
def list_knowledge(db: Session = Depends(get_db)):
    return {"items": _load_table(db, "ai_knowledge")}

@router.post("/ai/knowledge")
def create_knowledge(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "ai_knowledge")
    items.append({**data, "id": str(uuid.uuid4())})
    _save_table(db, "ai_knowledge", items)
    return {"message": "Created"}

@router.delete("/ai/knowledge/{item_id}")
def delete_knowledge(item_id: str, db: Session = Depends(get_db)):
    items = [k for k in _load_table(db, "ai_knowledge") if k["id"] != item_id]
    _save_table(db, "ai_knowledge", items)
    return {"message": "Deleted"}


# Settings
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    row = db.execute(text("SELECT value FROM system_settings WHERE key = 'school_settings'")).fetchone()
    if row:
        try:
            return json.loads(row[0])
        except:
            pass
    return {
        "name": "Caliphate International Schools",
        "motto": "Knowledge, Faith and Excellence",
        "email": "info@caliphateschools.edu.ng",
        "phone": "+234 800 000 0000",
        "address": "No. 3, Eastern Bypass Road, Gusau",
        "current_session": "2025/2026",
        "current_term": "Second Term",
    }

@router.put("/settings")
def update_settings(data: dict, db: Session = Depends(get_db)):
    value_json = json.dumps(data)
    existing = db.execute(text("SELECT key FROM system_settings WHERE key = 'school_settings'")).fetchone()
    if existing:
        db.execute(text("UPDATE system_settings SET value = :value WHERE key = 'school_settings'"), {"value": value_json})
    else:
        db.execute(text("INSERT INTO system_settings (key, value, category) VALUES ('school_settings', :value, 'settings')"), {"value": value_json})
    db.commit()
    return data


# Reports
@router.get("/reports/generate/{report_type}")
def generate_report(report_type: str, db: Session = Depends(get_db)):
    user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    student_count = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'student'")).scalar() or 0
    teacher_count = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'teacher'")).scalar() or 0
    
    return {
        "report_type": report_type,
        "generated_at": datetime.utcnow().isoformat(),
        "total_users": user_count,
        "total_students": student_count,
        "total_teachers": teacher_count,
    }
