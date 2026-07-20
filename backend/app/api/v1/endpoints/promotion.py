"""Class promotion — end-of-session workflow.

Preview shows each student's computed average from Results (if any) with a
suggested promote/repeat action; the admin makes the final call per student
before executing. Executing updates each student's class (or marks them
graduated) and records a promotion_history entry for audit purposes.
"""
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import require_staff
from app.models.user import User
from app.api.v1.endpoints.students import _extra as _student_extra
from app.api.v1.endpoints.complete_system import _load as _load_system_table, _save as _save_system_table

router = APIRouter()

PASS_THRESHOLD = 50.0


def _load_results(db: Session) -> list:
    return _load_system_table(db, "results")


def _student_average(results: list, student: User, term: Optional[str], session: Optional[str]) -> tuple:
    matching = [
        r for r in results
        if (r.get("student_id") == str(student.id) or r.get("student_name", "").strip().lower() == (student.full_name or "").strip().lower())
        and (not term or r.get("term") == term)
        and (not session or r.get("session") == session)
    ]
    if not matching:
        return None, False
    total = sum(float(r.get("total", 0)) for r in matching)
    return round(total / len(matching), 1), True


@router.get("/promotion/preview")
def preview_promotion(
    class_name: str,
    term: Optional[str] = None,
    session: Optional[str] = None,
    db: Session = Depends(get_db),
):
    students = db.query(User).filter(User.role == "student").all()
    results = _load_results(db)

    in_class = []
    for s in students:
        extra = _student_extra(s)
        if extra.get("class_name", "Unassigned") != class_name:
            continue
        avg, has_data = _student_average(results, s, term, session)
        in_class.append({
            "id": str(s.id),
            "name": s.full_name,
            "admission_number": s.username,
            "average": avg,
            "has_data": has_data,
            "suggested": "promote" if (avg is None or avg >= PASS_THRESHOLD) else "repeat",
        })

    in_class.sort(key=lambda x: x["name"])
    return {"class_name": class_name, "students": in_class, "total": len(in_class)}


@router.post("/promotion/execute")
def execute_promotion(data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_staff)):
    from_class = data.get("from_class")
    promotions = data.get("promotions", [])
    if not from_class or not promotions:
        raise HTTPException(status_code=422, detail="from_class and promotions are required")

    counts = {"promoted": 0, "repeated": 0, "graduated": 0, "skipped": 0}

    for p in promotions:
        student = db.query(User).filter(User.id == p.get("student_id"), User.role == "student").first()
        if not student:
            counts["skipped"] += 1
            continue

        action = p.get("action")
        extra = _student_extra(student)

        if action == "promote":
            target = p.get("target_class")
            if not target:
                counts["skipped"] += 1
                continue
            extra["class_name"] = target
            student.preferences = json.dumps(extra)
            counts["promoted"] += 1
        elif action == "graduate":
            extra["class_name"] = "Graduated"
            student.preferences = json.dumps(extra)
            student.is_active = False
            counts["graduated"] += 1
        elif action == "repeat":
            counts["repeated"] += 1
        else:
            counts["skipped"] += 1

    db.commit()

    history = _load_system_table(db, "promotion_history")
    history.insert(0, {
        "id": str(uuid.uuid4()),
        "from_class": from_class,
        "session": data.get("session", ""),
        "counts": counts,
        "executed_by": current_user.full_name,
        "executed_at": datetime.now(timezone.utc).isoformat(),
    })
    _save_system_table(db, "promotion_history", history, "academics")

    return {"message": "Promotion complete", "counts": counts}


@router.get("/promotion/history")
def get_promotion_history(db: Session = Depends(get_db)):
    return {"items": _load_system_table(db, "promotion_history")}
