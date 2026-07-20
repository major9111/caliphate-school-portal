"""File upload endpoints — student photos, documents, bulk CSV imports."""
import csv
import io
import uuid
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.upload_service import upload_image, upload_document
from app.core.security import hash_password
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


def _load(db: Session, key: str) -> list:
    from sqlalchemy import text
    db.execute(text("""CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR PRIMARY KEY, value TEXT, category VARCHAR DEFAULT 'system',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"""))
    db.commit()
    row = db.execute(text("SELECT value FROM system_settings WHERE key=:k"), {"k": key}).fetchone()
    return json.loads(row[0]) if row else []


def _save(db: Session, key: str, data, category="system"):
    from sqlalchemy import text
    v = json.dumps(data, default=str)
    exists = db.execute(text("SELECT 1 FROM system_settings WHERE key=:k"), {"k": key}).fetchone()
    if exists:
        db.execute(text("UPDATE system_settings SET value=:v, updated_at=CURRENT_TIMESTAMP WHERE key=:k"), {"k": key, "v": v})
    else:
        db.execute(text("INSERT INTO system_settings (key,value,category) VALUES (:k,:v,:c)"), {"k": key, "v": v, "c": category})
    db.commit()


# ── Image uploads ─────────────────────────────────────────────────────────────

@router.post("/student-photo/{student_id}")
async def upload_student_photo(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    url, public_id = await upload_image(file, folder="students")
    student.avatar_url = url
    extra = json.loads(student.preferences) if student.preferences else {}
    extra["photo_public_id"] = public_id
    student.preferences = json.dumps(extra)
    db.commit()
    return {"url": url, "message": "Photo uploaded successfully"}


@router.post("/general")
async def upload_general(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    url, public_id = await upload_document(file, folder="general")
    return {"url": url, "public_id": public_id}


# ── Bulk CSV import: Students ─────────────────────────────────────────────────

@router.post("/bulk/students")
async def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    CSV columns (header row required):
    admission_number, first_name, last_name, gender, email, phone, class_name, date_of_birth,
    parent_name, parent_phone, parent_email
    """
    if file.content_type not in ("text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"):
        raise HTTPException(415, "Please upload a CSV file.")

    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    required = {"first_name", "last_name"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(422, f"CSV must have at least these columns: {required}. Found: {reader.fieldnames}")

    created = []
    errors = []
    for i, row in enumerate(reader, 2):  # row 1 = header
        try:
            email = (row.get("email") or "").strip()
            if email and db.query(User).filter(User.email == email).first():
                errors.append({"row": i, "error": f"Email already exists: {email}"})
                continue

            adm_no = (row.get("admission_number") or f"CIS/{datetime.now(timezone.utc).year}/{uuid.uuid4().hex[:5].upper()}").strip()
            username = adm_no.lower().replace("/", "").replace(" ", "")
            suffix = 1
            base = username
            while db.query(User).filter(User.username == username).first():
                username = f"{base}{suffix}"; suffix += 1

            first = row.get("first_name", "").strip()
            last  = row.get("last_name", "").strip()
            default_password = f"Student@{adm_no[:6]}"

            student = User(
                id=str(uuid.uuid4()),
                username=username,
                email=email or None,
                full_name=f"{first} {last}",
                phone=(row.get("phone") or "").strip(),
                hashed_password=hash_password(default_password),
                role="student",
                is_active=True,
                is_verified=True,
                preferences=json.dumps({
                    "admission_number": adm_no,
                    "class_name": (row.get("class_name") or "").strip(),
                    "gender": (row.get("gender") or "").strip().lower(),
                    "date_of_birth": (row.get("date_of_birth") or "").strip(),
                    "first_name": first,
                    "last_name": last,
                    "parent_name": (row.get("parent_name") or "").strip(),
                    "parent_phone": (row.get("parent_phone") or "").strip(),
                    "parent_email": (row.get("parent_email") or "").strip(),
                }),
            )
            db.add(student)
            created.append({"name": student.full_name, "admission_number": adm_no, "default_password": default_password})
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    db.commit()
    return {
        "message": f"Import complete: {len(created)} students created, {len(errors)} errors.",
        "created": created,
        "errors": errors,
    }


# ── Bulk CSV import: Results ──────────────────────────────────────────────────

@router.post("/bulk/results")
async def bulk_import_results(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    CSV columns: student_name, student_id, class_name, subject, ca_score, exam_score, term, session
    """
    if file.content_type not in ("text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"):
        raise HTTPException(415, "Please upload a CSV file.")

    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    required = {"student_name", "subject", "ca_score", "exam_score"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(422, f"CSV must have: {required}. Found: {reader.fieldnames}")

    def calc_grade(total: float):
        if total >= 70: return "A", "Excellent"
        if total >= 60: return "B", "Very Good"
        if total >= 50: return "C", "Good"
        if total >= 45: return "D", "Pass"
        if total >= 40: return "E", "Weak Pass"
        return "F", "Fail"

    existing = _load(db, "results")
    created = []
    errors = []

    for i, row in enumerate(reader, 2):
        try:
            ca   = float(row.get("ca_score", 0))
            exam = float(row.get("exam_score", 0))
            total = ca + exam
            grade, remark = calc_grade(total)
            new_result = {
                "id": str(uuid.uuid4()),
                "student_name": row.get("student_name", "").strip(),
                "student_id":   row.get("student_id", "").strip(),
                "class_name":   row.get("class_name", "").strip(),
                "subject":      row.get("subject", "").strip(),
                "ca_score": ca, "exam_score": exam, "total": total,
                "grade": grade, "remark": remark,
                "term":    row.get("term", "Second Term").strip(),
                "session": row.get("session", "2025/2026").strip(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            existing.insert(0, new_result)
            created.append(new_result)
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    _save(db, "results", existing, "academics")
    return {
        "message": f"Import complete: {len(created)} results created, {len(errors)} errors.",
        "created_count": len(created),
        "errors": errors,
    }


# ── Bulk CSV import: Payments ─────────────────────────────────────────────────

@router.post("/bulk/payments")
async def bulk_import_payments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    CSV columns: student_name, amount, type, method, payment_date, class_name, term, session
    """
    if file.content_type not in ("text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"):
        raise HTTPException(415, "Please upload a CSV file.")

    content = await file.read()
    text_content = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text_content))

    existing = _load(db, "payments")
    created = []
    errors = []

    for i, row in enumerate(reader, 2):
        try:
            amount = float(row.get("amount", 0))
            receipt = f"RCP/{datetime.now(timezone.utc).year}/{uuid.uuid4().hex[:6].upper()}"
            payment = {
                "id": str(uuid.uuid4()),
                "student_name": row.get("student_name", "").strip(),
                "amount": amount,
                "type": row.get("type", "tuition").strip(),
                "method": row.get("method", "cash").strip(),
                "status": "paid",
                "receipt_number": receipt,
                "payment_date": row.get("payment_date", datetime.now(timezone.utc).date().isoformat()),
                "class_name": row.get("class_name", "").strip(),
                "term": row.get("term", "Second Term").strip(),
                "session": row.get("session", "2025/2026").strip(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            existing.insert(0, payment)
            created.append(payment)
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    _save(db, "payments", existing, "finance")
    return {
        "message": f"Import complete: {len(created)} payments recorded, {len(errors)} errors.",
        "created_count": len(created),
        "errors": errors,
    }
