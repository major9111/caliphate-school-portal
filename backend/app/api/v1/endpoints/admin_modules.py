"""Admin modules endpoints - complete implementation."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.core.database import get_db
from app.models.user import User
from app.api.v1.endpoints.teachers import _extra as _extra_prefs, _subjects_list
import json
import uuid
from datetime import datetime, timezone
try:
    from app.api.v1.endpoints.stream import publish as _sse_publish
except ImportError:
    def _sse_publish(*a, **kw): pass

router = APIRouter()


def _load_table(db: Session, table: str):
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR PRIMARY KEY,
                value TEXT,
                category VARCHAR DEFAULT 'system',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.commit()
        row = db.execute(text("SELECT value FROM system_settings WHERE key = :key"), {"key": table}).fetchone()
        if row:
            return json.loads(row[0])
    except Exception:
        pass
    return []


def _load_dict(db: Session, table: str):
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR PRIMARY KEY,
                value TEXT,
                category VARCHAR DEFAULT 'system',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.commit()
        row = db.execute(text("SELECT value FROM system_settings WHERE key = :key"), {"key": table}).fetchone()
        if row:
            return json.loads(row[0])
    except Exception:
        pass
    return {}


def _save_table(db: Session, table: str, data, category: str = "system"):
    value_json = json.dumps(data, default=str)
    existing = db.execute(text("SELECT key FROM system_settings WHERE key = :key"), {"key": table}).fetchone()
    if existing:
        db.execute(
            text("UPDATE system_settings SET value = :value, updated_at = CURRENT_TIMESTAMP WHERE key = :key"),
            {"key": table, "value": value_json}
        )
    else:
        db.execute(
            text("INSERT INTO system_settings (key, value, category) VALUES (:key, :value, :category)"),
            {"key": table, "value": value_json, "category": category}
        )
    db.commit()


# ─── Classes ────────────────────────────────────────────────────────────────

@router.get("/classes")
def list_classes(db: Session = Depends(get_db)):
    items = _load_table(db, "classes")
    return {"items": items, "total": len(items)}


@router.post("/classes")
def create_class(data: dict, db: Session = Depends(get_db)):
    if not data.get("name"):
        raise HTTPException(status_code=422, detail="name is required")
    items = _load_table(db, "classes")
    if any(c.get("name") == data["name"] for c in items):
        raise HTTPException(status_code=400, detail="A class with this name already exists")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "capacity": int(data.get("capacity", 30)),
        "student_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.append(new_item)
    _save_table(db, "classes", items, "academics")
    return new_item


@router.put("/classes/{class_id}")
def update_class(class_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "classes")
    updated = []
    found = False
    for c in items:
        if c["id"] == class_id:
            updated.append({**c, **data, "id": class_id})
            found = True
        else:
            updated.append(c)
    if not found:
        raise HTTPException(status_code=404, detail="Class not found")
    _save_table(db, "classes", updated, "academics")
    return next(c for c in updated if c["id"] == class_id)


@router.delete("/classes/{class_id}")
def delete_class(class_id: str, db: Session = Depends(get_db)):
    items = [c for c in _load_table(db, "classes") if c["id"] != class_id]
    _save_table(db, "classes", items, "academics")
    return {"message": "Deleted"}


# ─── Exams ──────────────────────────────────────────────────────────────────

@router.get("/exams")
def list_exams(db: Session = Depends(get_db)):
    items = _load_table(db, "exams")
    return {"items": items, "total": len(items)}


@router.post("/exams")
def create_exam(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "exams")
    new_item = {**data, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
    items.insert(0, new_item)
    _save_table(db, "exams", items, "academics")
    return new_item


@router.put("/exams/{item_id}")
def update_exam(item_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "exams")
    updated = []
    found = False
    for e in items:
        if e["id"] == item_id:
            updated.append({**e, **data, "id": item_id})
            found = True
        else:
            updated.append(e)
    if not found:
        raise HTTPException(status_code=404, detail="Exam not found")
    _save_table(db, "exams", updated, "academics")
    return next(e for e in updated if e["id"] == item_id)


@router.delete("/exams/{item_id}")
def delete_exam(item_id: str, db: Session = Depends(get_db)):
    items = [e for e in _load_table(db, "exams") if e["id"] != item_id]
    _save_table(db, "exams", items, "academics")
    return {"message": "Deleted"}


# ─── Schedule / Timetable ────────────────────────────────────────────────────

@router.get("/schedule")
def list_schedule(class_name: Optional[str] = None, db: Session = Depends(get_db)):
    items = _load_table(db, "schedule")
    if class_name:
        items = [s for s in items if s.get("class_name") == class_name]
    return {"items": items, "total": len(items)}


@router.post("/schedule")
def create_schedule(data: dict, db: Session = Depends(get_db)):
    teacher_id = data.get("teacher_id", "")
    teacher = None
    if teacher_id:
        teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

        # Keep the timetable honest: only let a teacher be scheduled for a
        # subject they're actually assigned to (once they have any subjects set).
        subject = (data.get("subject") or "").strip()
        assigned = _subjects_list(_extra_prefs(teacher))
        if subject and assigned and subject not in assigned:
            raise HTTPException(
                status_code=400,
                detail=f"{teacher.full_name} is not assigned to teach '{subject}'. Assigned subjects: {', '.join(assigned)}",
            )

    items = _load_table(db, "schedule")
    day  = data.get("day", "")
    time = data.get("time", "")
    cls  = data.get("class_name", "").strip().lower()
    teacher_name_input = data.get("teacher", "").strip().lower()

    # Conflict detection: same teacher (by id if linked, else by typed name) or same class, same time/day
    conflicts = []
    for s in items:
        if s.get("day") == day and s.get("time") == time:
            same_teacher = (
                (teacher_id and s.get("teacher_id") == teacher_id) or
                (not teacher_id and teacher_name_input and (s.get("teacher") or "").strip().lower() == teacher_name_input)
            )
            if same_teacher:
                who = teacher.full_name if teacher else data.get("teacher", "This teacher")
                conflicts.append(f"{who} is already scheduled at {time} on {day} for {s.get('class_name')}")
            if cls and s.get("class_name", "").strip().lower() == cls:
                conflicts.append(f"Class '{data.get('class_name')}' already has '{s.get('subject')}' at {time} on {day}")

    if conflicts:
        raise HTTPException(status_code=409, detail={"message": "Schedule conflict detected", "conflicts": conflicts})

    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "teacher_id": teacher_id or None,
        "teacher_name": teacher.full_name if teacher else data.get("teacher_name", data.get("teacher", "")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.append(new_item)
    _save_table(db, "schedule", items, "academics")
    return new_item


@router.delete("/schedule/{item_id}")
def delete_schedule(item_id: str, db: Session = Depends(get_db)):
    items = [s for s in _load_table(db, "schedule") if s["id"] != item_id]
    _save_table(db, "schedule", items, "academics")
    return {"message": "Deleted"}


# ─── Admissions ─────────────────────────────────────────────────────────────

@router.get("/admissions")
def list_admissions(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load_table(db, "admissions")
    if status:
        items = [a for a in items if a.get("status") == status]
    if search:
        s = search.lower()
        items = [a for a in items if s in (a.get("applicant_name", "")).lower() or s in (a.get("email", "")).lower()]
    items = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/admissions")
def create_admission(data: dict, db: Session = Depends(get_db)):
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


@router.put("/admissions/{item_id}/status")
def update_admission_status(item_id: str, status: str = Query(...), db: Session = Depends(get_db)):
    valid_statuses = ["pending", "approved", "rejected", "enrolled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    items = _load_table(db, "admissions")
    updated = []
    found = False
    for a in items:
        if a["id"] == item_id:
            updated.append({**a, "status": status, "updated_at": datetime.now(timezone.utc).isoformat()})
            found = True
        else:
            updated.append(a)
    if not found:
        raise HTTPException(status_code=404, detail="Admission not found")
    _save_table(db, "admissions", updated, "admissions")
    return {"message": f"Status updated to {status}"}


@router.post("/admissions/{item_id}/enroll")
def enroll_student(item_id: str, db: Session = Depends(get_db)):
    """Convert an approved admission into a student account and send welcome email."""
    items = _load_table(db, "admissions")
    admission = next((a for a in items if a["id"] == item_id), None)
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    if admission.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved admissions can be enrolled")
    if admission.get("enrolled_user_id"):
        raise HTTPException(status_code=400, detail="This applicant has already been enrolled")

    from app.models.user import User
    from app.core.security import hash_password
    import json, secrets

    # Check if user already exists by email
    email = admission.get("email")
    if email:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"A user account already exists with email {email}")

    # Generate admission number based login
    app_num = admission.get("application_number", "")
    username = app_num.lower().replace("/", "").replace(" ", "") or uuid.uuid4().hex[:8]
    suffix = 1
    base = username
    while db.query(User).filter(User.username == username).first():
        username = f"{base}{suffix}"; suffix += 1

    default_password = f"Sch@{secrets.token_urlsafe(6)}"
    student = User(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        full_name=admission.get("applicant_name", ""),
        phone=admission.get("phone", ""),
        hashed_password=hash_password(default_password),
        role="student",
        is_active=True,
        is_verified=True,
        preferences=json.dumps({
            "class_name": admission.get("class_applying", ""),
            "parent_name": admission.get("parent_name", ""),
            "admission_number": app_num,
        }),
    )
    db.add(student)

    # Mark admission as enrolled
    for a in items:
        if a["id"] == item_id:
            a["status"] = "enrolled"
            a["enrolled_user_id"] = str(student.id)
            a["enrolled_at"] = datetime.now(timezone.utc).isoformat()
    _save_table(db, "admissions", items, "admissions")
    db.commit()

    # Send welcome email in background
    try:
        from app.core.email_service import send_account_created
        if email:
            send_account_created(email, admission.get("applicant_name",""), username, default_password)
    except Exception:
        pass

    return {
        "message": "Student enrolled successfully",
        "student_id": str(student.id),
        "username": username,
        "password": default_password,
        "note": "Login credentials have been emailed to the student.",
    }


@router.delete("/admissions/{item_id}")
def delete_admission(item_id: str, db: Session = Depends(get_db)):
    items = [a for a in _load_table(db, "admissions") if a["id"] != item_id]
    _save_table(db, "admissions", items, "admissions")
    return {"message": "Deleted"}


# ─── Announcements ──────────────────────────────────────────────────────────

@router.get("/announcements")
def list_announcements(
    audience: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load_table(db, "announcements")
    if audience:
        items = [a for a in items if a.get("audience") == audience or a.get("audience") == "all"]
    items = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/announcements")
def create_announcement(data: dict, db: Session = Depends(get_db)):
    if not data.get("title") or not data.get("content"):
        raise HTTPException(status_code=422, detail="title and content are required")
    items = _load_table(db, "announcements")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save_table(db, "announcements", items, "communication")
    _sse_publish(None, "announcement", {"title": new_item.get("title",""), "id": new_item["id"]})
    return new_item


@router.post("/announcements/{item_id}/blast")
def email_blast_announcement(item_id: str, audience: str = "all", db: Session = Depends(get_db)):
    """Send an announcement as email to all users matching the audience."""
    from app.models.user import User
    from app.core.email_service import send_with_attachment
    from app.core.config import settings

    items = _load_table(db, "announcements")
    ann = next((a for a in items if a["id"] == item_id), None)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Determine recipients
    query = db.query(User).filter(User.is_active == True, User.email != None)
    if audience == "students":
        query = query.filter(User.role == "student")
    elif audience == "teachers":
        query = query.filter(User.role.in_(["teacher", "staff"]))
    elif audience == "parents":
        query = query.filter(User.role == "parent")
    # "all" sends to everyone

    users = query.all()
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:#1e40af;padding:24px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0">{settings.SCHOOL_NAME}</h2>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h3 style="color:#1e40af">{ann.get('title','Announcement')}</h3>
        <p style="color:#374151;line-height:1.6">{ann.get('content','')}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="color:#6b7280;font-size:12px">{settings.SCHOOL_NAME} | {settings.SCHOOL_ADDRESS}</p>
      </div>
    </div>"""

    sent = 0
    failed = 0
    for user in users:
        if user.email:
            ok = send_with_attachment(user.email, ann.get("title","Announcement"), html, b"", "")
            if ok: sent += 1
            else: failed += 1

    return {"message": f"Email blast complete: {sent} sent, {failed} failed", "sent": sent, "failed": failed}


@router.delete("/announcements/{item_id}")
def delete_announcement(item_id: str, db: Session = Depends(get_db)):
    items = [a for a in _load_table(db, "announcements") if a["id"] != item_id]
    _save_table(db, "announcements", items, "communication")
    return {"message": "Deleted"}


# ─── CMS Pages ──────────────────────────────────────────────────────────────

@router.get("/cms/pages")
def list_cms_pages(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items = _load_table(db, "cms_pages")
    if status:
        items = [p for p in items if p.get("status") == status]
    return {"items": items, "total": len(items)}


@router.post("/cms/pages")
def create_cms_page(data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "cms_pages")
    # Ensure unique slug
    slug = data.get("slug", "").strip().lower().replace(" ", "-")
    if any(p.get("slug") == slug for p in items):
        raise HTTPException(status_code=400, detail="A page with this slug already exists")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "slug": slug,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save_table(db, "cms_pages", items, "cms")
    return new_item


@router.put("/cms/pages/{page_id}")
def update_cms_page(page_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "cms_pages")
    updated = []
    found = False
    for p in items:
        if p["id"] == page_id:
            updated.append({**p, **data, "id": page_id, "updated_at": datetime.now(timezone.utc).isoformat()})
            found = True
        else:
            updated.append(p)
    if not found:
        raise HTTPException(status_code=404, detail="Page not found")
    _save_table(db, "cms_pages", updated, "cms")
    return next(p for p in updated if p["id"] == page_id)


@router.delete("/cms/pages/{page_id}")
def delete_cms_page(page_id: str, db: Session = Depends(get_db)):
    items = [p for p in _load_table(db, "cms_pages") if p["id"] != page_id]
    _save_table(db, "cms_pages", items, "cms")
    return {"message": "Deleted"}


# ─── AI / Knowledge Base ────────────────────────────────────────────────────

@router.get("/ai/knowledge")
def list_knowledge(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items = _load_table(db, "ai_knowledge")
    if category:
        items = [k for k in items if k.get("category") == category]
    if search:
        s = search.lower()
        items = [k for k in items if s in k.get("question", "").lower() or s in k.get("answer", "").lower()]
    return {"items": items, "total": len(items)}


@router.post("/ai/knowledge")
def create_knowledge(data: dict, db: Session = Depends(get_db)):
    if not data.get("question") or not data.get("answer"):
        raise HTTPException(status_code=422, detail="Question and answer are required")
    items = _load_table(db, "ai_knowledge")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save_table(db, "ai_knowledge", items, "ai")
    return new_item


@router.put("/ai/knowledge/{item_id}")
def update_knowledge(item_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load_table(db, "ai_knowledge")
    updated = []
    found = False
    for k in items:
        if k["id"] == item_id:
            updated.append({**k, **data, "id": item_id})
            found = True
        else:
            updated.append(k)
    if not found:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    _save_table(db, "ai_knowledge", updated, "ai")
    return next(k for k in updated if k["id"] == item_id)


@router.delete("/ai/knowledge/{item_id}")
def delete_knowledge(item_id: str, db: Session = Depends(get_db)):
    items = [k for k in _load_table(db, "ai_knowledge") if k["id"] != item_id]
    _save_table(db, "ai_knowledge", items, "ai")
    return {"message": "Deleted"}


# ─── Settings ───────────────────────────────────────────────────────────────

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = _load_dict(db, "school_settings")
    if not settings:
        settings = {
            "name": "Caliphate International Schools Gusau Ltd",
            "motto": "Excellence Through Knowledge",
            "email": "info@caliphateschools.edu.ng",
            "phone": "+234 803 000 0000",
            "address": "Gusau, Zamfara State, Nigeria",
            "current_session": "2025/2026",
            "current_term": "Second Term",
            "logo_url": "",
            "website": "https://caliphateschools.edu.ng",
        }
    return settings


@router.put("/settings")
def update_settings(data: dict, db: Session = Depends(get_db)):
    current = _load_dict(db, "school_settings")
    updated = {**current, **data, "updated_at": datetime.now(timezone.utc).isoformat()}
    _save_table(db, "school_settings", updated, "settings")
    return updated


TERM_ORDER = ["First Term", "Second Term", "Third Term"]


@router.post("/settings/advance-term")
def advance_term(db: Session = Depends(get_db)):
    """Move to the next term. Advancing past Third Term rolls over to a new
    academic session (e.g. 2025/2026 -> 2026/2027) and flags that a class
    promotion pass is due, since that's the only time promotion applies."""
    settings = _load_dict(db, "school_settings")
    current_term = settings.get("current_term", "First Term")
    current_session = settings.get("current_session", "2025/2026")

    try:
        idx = TERM_ORDER.index(current_term)
    except ValueError:
        idx = 0

    is_rollover = idx == len(TERM_ORDER) - 1
    next_term = TERM_ORDER[(idx + 1) % len(TERM_ORDER)]
    next_session = current_session

    if is_rollover:
        try:
            start, end = current_session.split("/")
            next_session = f"{int(start) + 1}/{int(end) + 1}"
        except (ValueError, IndexError):
            next_session = current_session

    updated = {**settings, "current_term": next_term, "current_session": next_session, "updated_at": datetime.now(timezone.utc).isoformat()}
    _save_table(db, "school_settings", updated, "settings")

    return {
        "current_term": next_term,
        "current_session": next_session,
        "previous_term": current_term,
        "previous_session": current_session,
        "is_session_rollover": is_rollover,
    }


# ─── Reports ────────────────────────────────────────────────────────────────

@router.get("/reports/generate/{report_type}")
def generate_report(report_type: str, db: Session = Depends(get_db)):
    from app.models.user import User
    from sqlalchemy import func

    valid_types = ["student_performance", "financial_summary", "attendance_analysis", "examination_results"]
    if report_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Valid: {valid_types}")

    if report_type == "student_performance":
        total_students = db.query(User).filter(User.role == "student").count()
        results = _load_table(db, "results")
        grades = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0}
        for r in results:
            g = r.get("grade", "F")
            if g in grades:
                grades[g] += 1
        return {
            "type": report_type,
            "title": "Student Performance Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_students": total_students,
                "total_results": len(results),
                "grade_distribution": grades,
            },
            "data": results[:50],
        }

    elif report_type == "financial_summary":
        payments = _load_table(db, "payments")
        total_collected = sum(float(p.get("amount", 0)) for p in payments if p.get("status") == "paid")
        by_type: dict = {}
        for p in payments:
            t = p.get("type", "other")
            by_type[t] = by_type.get(t, 0) + float(p.get("amount", 0))
        return {
            "type": report_type,
            "title": "Financial Summary Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_collected": total_collected,
                "total_transactions": len(payments),
                "by_type": by_type,
            },
            "data": payments[:50],
        }

    elif report_type == "attendance_analysis":
        records = _load_table(db, "attendance_records")
        present = sum(1 for r in records if r.get("status") == "present")
        absent = sum(1 for r in records if r.get("status") == "absent")
        total = present + absent
        return {
            "type": report_type,
            "title": "Attendance Analysis Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_records": total,
                "present": present,
                "absent": absent,
                "rate": round((present / total * 100) if total else 0, 1),
            },
            "data": records[:50],
        }

    elif report_type == "examination_results":
        exams = _load_table(db, "exams")
        results = _load_table(db, "results")
        return {
            "type": report_type,
            "title": "Examination Results Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_exams": len(exams),
                "total_results": len(results),
            },
            "data": results[:50],
        }

    return {"type": report_type, "data": [], "generated_at": datetime.now(timezone.utc).isoformat()}


# ─── Dashboard Stats ─────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    from app.models.user import User
    from sqlalchemy import func
    from datetime import date as _date

    total_students = db.query(User).filter(User.role == "student", User.is_active == True).count()
    total_teachers = db.query(User).filter(User.role == "teacher", User.is_active == True).count()
    classes = _load_table(db, "classes")
    payments = _load_table(db, "payments")
    total_revenue = sum(float(p.get("amount", 0)) for p in payments)
    recent_admissions = _load_table(db, "admissions")[:5]
    exams = _load_table(db, "exams")
    upcoming_exams = [e for e in exams if e.get("status") == "scheduled"][:3]
    announcements = _load_table(db, "announcements")[:3]

    # Attendance stats
    records = _load_table(db, "attendance_records")
    today = _date.today().isoformat()
    today_records = [r for r in records if r.get("date") == today]
    present_today = sum(1 for r in today_records if r.get("status") == "present")
    total_today = len(today_records)

    # Outstanding fees (lightweight version of fee_structures.outstanding_fees)
    structures = _load_table(db, "fee_structures")
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    class_expected = {s.get("class_name", ""): float(s.get("total_amount", 0)) for s in structures}
    outstanding_count = 0
    total_outstanding = 0.0
    for student in students:
        extra = json.loads(student.preferences) if student.preferences else {}
        s_class = extra.get("class_name", "")
        expected = class_expected.get(s_class, 0)
        if expected == 0:
            continue
        paid = sum(
            float(p.get("amount", 0)) for p in payments
            if p.get("student_name", "").lower() == student.full_name.lower() or p.get("student_id") == str(student.id)
        )
        owed = max(0, expected - paid)
        if owed > 0:
            outstanding_count += 1
            total_outstanding += owed

    # Overdue library books
    txns = _load_table(db, "library_transactions")
    overdue_books = sum(1 for t in txns if t.get("status") == "issued" and t.get("due_date") and t["due_date"] < today)

    # Low stock inventory
    inventory = _load_table(db, "inventory")
    low_stock_count = sum(1 for i in inventory if int(i.get("quantity", 0)) <= int(i.get("min_quantity", 10)))

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": len(classes),
        "total_revenue": total_revenue,
        "present_today": present_today,
        "total_today": total_today,
        "attendance_rate": round((present_today / total_today * 100) if total_today else 0, 1),
        "recent_admissions": recent_admissions,
        "upcoming_exams": upcoming_exams,
        "recent_announcements": announcements,
        "outstanding_fees_count": outstanding_count,
        "outstanding_fees_total": total_outstanding,
        "overdue_books_count": overdue_books,
        "low_stock_count": low_stock_count,
    }
