"""Fee structures — define fees by class/level, generate outstanding fee reports,
   send fee reminders, and trigger per-student invoice generation."""
import json
import uuid
from datetime import datetime, date, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.email_service import send_fee_reminder
from app.models.user import User

router = APIRouter()


def _load(db: Session, key: str) -> list:
    from sqlalchemy import text
    db.execute(text("""CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR PRIMARY KEY, value TEXT, category VARCHAR DEFAULT 'system',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"""))
    db.commit()
    row = db.execute(text("SELECT value FROM system_settings WHERE key=:k"), {"k": key}).fetchone()
    return json.loads(row[0]) if row else []


def _save(db: Session, key: str, data, category="finance"):
    from sqlalchemy import text
    v = json.dumps(data, default=str)
    exists = db.execute(text("SELECT 1 FROM system_settings WHERE key=:k"), {"k": key}).fetchone()
    if exists:
        db.execute(text("UPDATE system_settings SET value=:v, updated_at=CURRENT_TIMESTAMP WHERE key=:k"), {"k": key, "v": v})
    else:
        db.execute(text("INSERT INTO system_settings(key,value,category) VALUES(:k,:v,:c)"), {"k": key, "v": v, "c": category})
    db.commit()


# ── Fee Structures ────────────────────────────────────────────────────────────

@router.get("/structures")
def list_fee_structures(db: Session = Depends(get_db)):
    items = _load(db, "fee_structures")
    return {"items": items, "total": len(items)}


@router.post("/structures")
def create_fee_structure(data: dict, db: Session = Depends(get_db)):
    """
    Example payload:
    {
      "class_name": "JSS 1", "level": "junior_secondary",
      "term": "Second Term", "session": "2025/2026",
      "fees": [
        {"type": "tuition", "amount": 45000},
        {"type": "development_levy", "amount": 5000},
        {"type": "pta", "amount": 2000}
      ],
      "due_date": "2026-02-15",
      "description": "JSS 1 fees for Second Term 2025/2026"
    }
    """
    required = {"class_name", "term", "session", "fees"}
    missing = required - set(data.keys())
    if missing:
        raise HTTPException(422, f"Missing required fields: {missing}")

    fees_list = data.get("fees", [])
    total = sum(float(f.get("amount", 0)) for f in fees_list)

    items = _load(db, "fee_structures")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "total_amount": total,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "fee_structures", items)
    return new_item


@router.post("/structures/copy-forward")
def copy_forward_structures(data: dict, db: Session = Depends(get_db)):
    """Copy all fee structures from one term/session to another — e.g. when
    advancing to a new term, instead of rebuilding every class's fees from
    scratch. Skips any class that already has a structure for the target
    term/session, so it's safe to run more than once."""
    from_term = data.get("from_term")
    from_session = data.get("from_session")
    to_term = data.get("to_term")
    to_session = data.get("to_session")
    new_due_date = data.get("due_date")  # optional override applied to every copy
    if not all([from_term, from_session, to_term, to_session]):
        raise HTTPException(422, "from_term, from_session, to_term, to_session are required")

    items = _load(db, "fee_structures")
    source = [s for s in items if s.get("term") == from_term and s.get("session") == from_session]
    existing_targets = {s.get("class_name") for s in items if s.get("term") == to_term and s.get("session") == to_session}

    created = []
    for s in source:
        if s.get("class_name") in existing_targets:
            continue
        new_item = {
            **s,
            "id": str(uuid.uuid4()),
            "term": to_term,
            "session": to_session,
            "due_date": new_due_date or s.get("due_date", ""),
            "description": f"{s.get('class_name')} fees for {to_term} {to_session}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        items.insert(0, new_item)
        created.append(new_item)

    if created:
        _save(db, "fee_structures", items)

    return {
        "message": f"Copied {len(created)} fee structure(s) to {to_term} {to_session}",
        "created_count": len(created),
        "skipped_count": len(source) - len(created),
    }


@router.put("/structures/{structure_id}")
def update_fee_structure(structure_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "fee_structures")
    updated = []
    found = False
    for item in items:
        if item["id"] == structure_id:
            fees_list = data.get("fees", item.get("fees", []))
            total = sum(float(f.get("amount", 0)) for f in fees_list)
            updated.append({**item, **data, "id": structure_id, "total_amount": total,
                            "updated_at": datetime.now(timezone.utc).isoformat()})
            found = True
        else:
            updated.append(item)
    if not found:
        raise HTTPException(404, "Fee structure not found")
    _save(db, "fee_structures", updated)
    return next(i for i in updated if i["id"] == structure_id)


@router.delete("/structures/{structure_id}")
def delete_fee_structure(structure_id: str, db: Session = Depends(get_db)):
    items = [i for i in _load(db, "fee_structures") if i["id"] != structure_id]
    _save(db, "fee_structures", items)
    return {"message": "Deleted"}


# ── Outstanding Fees ──────────────────────────────────────────────────────────

@router.get("/outstanding")
def outstanding_fees(
    class_name: Optional[str] = None,
    term: Optional[str] = None,
    session_: Optional[str] = Query(None, alias="session"),
    db: Session = Depends(get_db)
):
    """
    Compares fee structures vs actual payments to compute outstanding balances
    per student in each class.
    """
    structures = _load(db, "fee_structures")
    payments   = _load(db, "payments")
    students   = db.query(User).filter(User.role == "student", User.is_active == True).all()

    # Filter structures
    target_structures = structures
    if class_name: target_structures = [s for s in target_structures if s.get("class_name") == class_name]
    if term:       target_structures = [s for s in target_structures if s.get("term") == term]
    if session_:   target_structures = [s for s in target_structures if s.get("session") == session_]

    # Map class → expected total
    class_expected: dict[str, float] = {}
    class_structure: dict[str, dict] = {}
    for s in target_structures:
        cn = s.get("class_name", "")
        class_expected[cn] = float(s.get("total_amount", 0))
        class_structure[cn] = s

    report = []
    for student in students:
        extra = json.loads(student.preferences) if student.preferences else {}
        s_class = extra.get("class_name", "")
        if class_name and s_class != class_name:
            continue
        expected = class_expected.get(s_class, 0)
        if expected == 0:
            continue

        # Sum paid by this student for matching term/session
        paid = 0.0
        for p in payments:
            matches_student = (p.get("student_name","").lower() == student.full_name.lower()
                               or p.get("student_id") == str(student.id))
            matches_term = (not term or p.get("term") == term)
            matches_session = (not session_ or p.get("session") == session_)
            if matches_student and matches_term and matches_session:
                paid += float(p.get("amount", 0))

        outstanding = max(0, expected - paid)
        report.append({
            "student_id": str(student.id),
            "student_name": student.full_name,
            "class_name": s_class,
            "email": student.email or "",
            "phone": student.phone or "",
            "expected": expected,
            "paid": paid,
            "outstanding": outstanding,
            "fully_paid": outstanding == 0,
            "structure_id": class_structure.get(s_class, {}).get("id", ""),
            "due_date": class_structure.get(s_class, {}).get("due_date", ""),
        })

    report.sort(key=lambda x: x["outstanding"], reverse=True)
    total_expected  = sum(r["expected"] for r in report)
    total_paid      = sum(r["paid"] for r in report)
    total_outstanding = sum(r["outstanding"] for r in report)

    return {
        "students": report,
        "total_students": len(report),
        "fully_paid_count": sum(1 for r in report if r["fully_paid"]),
        "outstanding_count": sum(1 for r in report if not r["fully_paid"]),
        "total_expected": total_expected,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
    }


# ── Fee Reminders ─────────────────────────────────────────────────────────────

@router.post("/remind/{student_id}")
def send_reminder(
    student_id: str,
    term: str = Query("Second Term"),
    session_: str = Query("2025/2026", alias="session"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    if not student.email:
        raise HTTPException(400, "Student has no email address on record")

    extra = json.loads(student.preferences) if student.preferences else {}
    class_name = extra.get("class_name", "")

    # Calculate outstanding
    structures = _load(db, "fee_structures")
    payments   = _load(db, "payments")
    struct = next((s for s in structures if s.get("class_name") == class_name
                   and s.get("term") == term and s.get("session") == session_), None)
    if not struct:
        raise HTTPException(404, f"No fee structure found for {class_name} / {term} / {session_}")

    expected = float(struct.get("total_amount", 0))
    paid = sum(float(p.get("amount", 0)) for p in payments
               if (p.get("student_name","").lower() == student.full_name.lower()
                   or p.get("student_id") == student_id)
               and p.get("term") == term and p.get("session") == session_)
    outstanding = max(0, expected - paid)

    if outstanding == 0:
        return {"message": "Student has no outstanding fees for this period."}

    due_date = struct.get("due_date", "")
    parent_name = extra.get("parent_name", student.full_name)

    background_tasks.add_task(
        send_fee_reminder,
        student.email, parent_name, student.full_name,
        class_name, term, outstanding, due_date
    )
    return {"message": f"Fee reminder queued for {student.full_name}. Outstanding: ₦{outstanding:,.2f}"}


@router.post("/remind-all")
def send_all_reminders(
    term: str = Query("Second Term"),
    session_: str = Query("2025/2026", alias="session"),
    class_name: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Send fee reminders to all students with outstanding balances."""
    outstanding_report = outstanding_fees(class_name=class_name, term=term, session_=session_, db=db)
    debtors = [r for r in outstanding_report["students"] if not r["fully_paid"] and r["email"]]

    structures = _load(db, "fee_structures")

    count = 0
    for debtor in debtors:
        struct = next((s for s in structures if s.get("class_name") == debtor["class_name"]
                       and s.get("term") == term and s.get("session") == session_), {})
        student = db.query(User).filter(User.id == debtor["student_id"]).first()
        if not student: continue
        extra = json.loads(student.preferences) if student.preferences else {}
        parent_name = extra.get("parent_name", student.full_name)
        background_tasks.add_task(
            send_fee_reminder,
            debtor["email"], parent_name, debtor["student_name"],
            debtor["class_name"], term, debtor["outstanding"],
            struct.get("due_date", "")
        )
        count += 1

    return {"message": f"Fee reminders queued for {count} students with outstanding balances."}
