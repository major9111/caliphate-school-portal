"""Student and Parent portal endpoints.

Mounted separately from /system so that students and parents (not just
staff) can reach their own portal data, while still preventing them
from viewing anyone else's.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
import json

router = APIRouter()


def _ensure_self_or_staff(requested_id: str, current_user: User):
    staff_roles = {"admin", "super_admin", "teacher", "staff"}
    if current_user.role in staff_roles:
        return
    if str(current_user.id) != str(requested_id):
        raise HTTPException(status_code=403, detail="You can only view your own portal data")


def _load(db: Session, table: str) -> list:
    from sqlalchemy import text
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
    try:
        row = db.execute(text("SELECT value FROM system_settings WHERE key = :k"), {"k": table}).fetchone()
        return json.loads(row[0]) if row else []
    except Exception:
        return []


# ─── Student Portal ───────────────────────────────────────────────────────────

@router.get("/student/{student_id}")
def get_student_portal(student_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    _ensure_self_or_staff(student_id, current_user)
    from app.models.user import User
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = [r for r in _load(db, "results") if r.get("student_id") == student_id]
    homework = [h for h in _load(db, "homework") if h.get("class_name") == "Unassigned"]  # show all for now
    notifications = [n for n in _load(db, "notifications") if n.get("audience") in ("all", "students")][:5]
    payments = [p for p in _load(db, "payments") if p.get("student_id") == student_id]

    return {
        "student": {
            "id": str(student.id),
            "full_name": student.full_name,
            "email": student.email,
            "admission_number": student.username,
        },
        "results": results[-10:],
        "homework": homework[:10],
        "notifications": notifications,
        "payments": payments[-5:],
    }


# ─── Parent Portal ────────────────────────────────────────────────────────────

@router.get("/parent/{parent_id}")
def get_parent_portal(parent_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    _ensure_self_or_staff(parent_id, current_user)
    from app.models.user import User
    parent = db.query(User).filter(User.id == parent_id, User.role == "parent").first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Load linked children (stored in parent_children table)
    children_links = _load(db, f"parent_children_{parent_id}")
    children = []
    for link in children_links:
        child = db.query(User).filter(User.id == link.get("student_id")).first()
        if child:
            results = [r for r in _load(db, "results") if r.get("student_id") == link.get("student_id")]
            children.append({
                "id": str(child.id),
                "full_name": child.full_name,
                "admission_number": child.username,
                "results": results[-5:],
            })

    notifications = [n for n in _load(db, "notifications") if n.get("audience") in ("all", "parents")][:5]

    return {
        "parent": {
            "id": str(parent.id),
            "full_name": parent.full_name,
            "email": parent.email,
        },
        "children": children,
        "notifications": notifications,
    }


