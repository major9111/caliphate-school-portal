"""Complete system endpoints - all modules."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.core.database import get_db
from app.models.user import User
import json
import uuid
from datetime import datetime, date, timezone
try:
    from app.api.v1.endpoints.stream import publish as _sse_publish
except ImportError:
    def _sse_publish(*a, **kw): pass

router = APIRouter()


# ─── Shared helpers ──────────────────────────────────────────────────────────

def _ensure_table(db: Session):
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


def _load(db: Session, table: str) -> list:
    _ensure_table(db)
    try:
        row = db.execute(text("SELECT value FROM system_settings WHERE key = :k"), {"k": table}).fetchone()
        return json.loads(row[0]) if row else []
    except Exception:
        return []


def _save(db: Session, table: str, data, category: str = "system"):
    _ensure_table(db)
    v = json.dumps(data, default=str)
    exists = db.execute(text("SELECT 1 FROM system_settings WHERE key = :k"), {"k": table}).fetchone()
    if exists:
        db.execute(
            text("UPDATE system_settings SET value=:v, updated_at=CURRENT_TIMESTAMP WHERE key=:k"),
            {"k": table, "v": v}
        )
    else:
        db.execute(
            text("INSERT INTO system_settings (key, value, category) VALUES (:k, :v, :cat)"),
            {"k": table, "v": v, "cat": category}
        )
    db.commit()


# ─── Results & Grading ───────────────────────────────────────────────────────

def _calc_grade(total: float) -> tuple[str, str]:
    if total >= 70:
        return "A", "Excellent"
    elif total >= 60:
        return "B", "Very Good"
    elif total >= 50:
        return "C", "Good"
    elif total >= 45:
        return "D", "Pass"
    elif total >= 40:
        return "E", "Weak Pass"
    else:
        return "F", "Fail"


@router.get("/results")
def list_results(
    class_name: Optional[str] = None,
    term: Optional[str] = None,
    student_name: Optional[str] = None,
    subject: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "results")
    if class_name:
        items = [r for r in items if r.get("class_name") == class_name]
    if term:
        items = [r for r in items if r.get("term") == term]
    if student_name:
        s = student_name.lower()
        items = [r for r in items if s in r.get("student_name", "").lower()]
    if subject:
        items = [r for r in items if r.get("subject", "").lower() == subject.lower()]
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/results")
def create_result(data: dict, db: Session = Depends(get_db)):
    if not data.get("student_name") or not data.get("subject"):
        raise HTTPException(status_code=422, detail="student_name and subject are required")
    ca = float(data.get("ca_score", 0))
    exam = float(data.get("exam_score", 0))
    total = ca + exam
    grade, remark = _calc_grade(total)
    items = _load(db, "results")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "ca_score": ca,
        "exam_score": exam,
        "total": total,
        "grade": grade,
        "remark": remark,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "results", items, "academics")
    return new_item


@router.put("/results/{result_id}")
def update_result(result_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "results")
    updated = []
    found = False
    for r in items:
        if r["id"] == result_id:
            ca = float(data.get("ca_score", r.get("ca_score", 0)))
            exam = float(data.get("exam_score", r.get("exam_score", 0)))
            total = ca + exam
            grade, remark = _calc_grade(total)
            updated.append({**r, **data, "id": result_id, "ca_score": ca, "exam_score": exam, "total": total, "grade": grade, "remark": remark})
            found = True
        else:
            updated.append(r)
    if not found:
        raise HTTPException(status_code=404, detail="Result not found")
    _save(db, "results", updated, "academics")
    return next(r for r in updated if r["id"] == result_id)


@router.delete("/results/{result_id}")
def delete_result(result_id: str, db: Session = Depends(get_db)):
    items = [r for r in _load(db, "results") if r["id"] != result_id]
    _save(db, "results", items, "academics")
    return {"message": "Deleted"}


# ─── Homework ─────────────────────────────────────────────────────────────────

@router.get("/homework")
def list_homework(
    class_name: Optional[str] = None,
    subject: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "homework")
    if class_name:
        items = [h for h in items if h.get("class_name") == class_name]
    if subject:
        items = [h for h in items if h.get("subject", "").lower() == subject.lower()]
    if status:
        items = [h for h in items if h.get("status") == status]
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/homework")
def create_homework(data: dict, db: Session = Depends(get_db)):
    items = _load(db, "homework")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "assigned_date": date.today().isoformat(),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "homework", items, "academics")
    return new_item


@router.put("/homework/{hw_id}")
def update_homework(hw_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "homework")
    updated = [{**h, **data, "id": hw_id} if h["id"] == hw_id else h for h in items]
    _save(db, "homework", updated, "academics")
    return next((h for h in updated if h["id"] == hw_id), {"message": "Updated"})


@router.delete("/homework/{hw_id}")
def delete_homework(hw_id: str, db: Session = Depends(get_db)):
    items = [h for h in _load(db, "homework") if h["id"] != hw_id]
    _save(db, "homework", items, "academics")
    return {"message": "Deleted"}


# ─── Assignments (student submissions) ──────────────────────────────────────

@router.get("/assignments")
def list_assignments(student_id: Optional[str] = None, homework_id: Optional[str] = None, db: Session = Depends(get_db)):
    items = _load(db, "assignments")
    if student_id:
        items = [a for a in items if a.get("student_id") == student_id]
    if homework_id:
        items = [a for a in items if a.get("homework_id") == homework_id]
    return {"items": items, "total": len(items)}


@router.post("/assignments")
def submit_assignment(data: dict, db: Session = Depends(get_db)):
    if not data.get("homework_id") or not data.get("student_id"):
        raise HTTPException(status_code=422, detail="homework_id and student_id are required")
    items = _load(db, "assignments")
    new_item = {**data, "id": str(uuid.uuid4()), "submitted_at": datetime.now(timezone.utc).isoformat(), "status": "submitted"}
    items.insert(0, new_item)
    _save(db, "assignments", items, "academics")
    return new_item


# ─── Notifications ────────────────────────────────────────────────────────────

@router.get("/notifications")
def list_notifications(
    audience: Optional[str] = None,
    type_: Optional[str] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "notifications")
    if audience:
        items = [n for n in items if n.get("audience") == audience or n.get("audience") == "all"]
    if type_:
        items = [n for n in items if n.get("type") == type_]
    items = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/notifications")
def create_notification(data: dict, db: Session = Depends(get_db)):
    items = _load(db, "notifications")
    new_item = {**data, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat(), "read": False}
    items.insert(0, new_item)
    _save(db, "notifications", items, "communication")
    # Broadcast to all connected clients of the target audience
    _sse_publish(None, "notification", {"title": new_item.get("title",""), "message": new_item.get("message",""), "id": new_item["id"]})
    return new_item


@router.delete("/notifications/{notif_id}")
def delete_notification(notif_id: str, db: Session = Depends(get_db)):
    items = [n for n in _load(db, "notifications") if n["id"] != notif_id]
    _save(db, "notifications", items, "communication")
    return {"message": "Deleted"}


# ─── Events ──────────────────────────────────────────────────────────────────

@router.get("/events")
def list_events(
    event_type: Optional[str] = None,
    upcoming: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "events")
    if event_type:
        items = [e for e in items if e.get("type") == event_type]
    if upcoming is not None:
        today = date.today().isoformat()
        if upcoming:
            items = [e for e in items if e.get("event_date", "") >= today]
        else:
            items = [e for e in items if e.get("event_date", "") < today]
    items = sorted(items, key=lambda x: x.get("event_date", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/events")
def create_event(data: dict, db: Session = Depends(get_db)):
    items = _load(db, "events")
    new_item = {**data, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
    items.append(new_item)
    _save(db, "events", items, "events")
    return new_item


@router.put("/events/{event_id}")
def update_event(event_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "events")
    updated = [{**e, **data, "id": event_id} if e["id"] == event_id else e for e in items]
    _save(db, "events", updated, "events")
    return next((e for e in updated if e["id"] == event_id), {"message": "Updated"})


@router.delete("/events/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    items = [e for e in _load(db, "events") if e["id"] != event_id]
    _save(db, "events", items, "events")
    return {"message": "Deleted"}


# ─── Library ─────────────────────────────────────────────────────────────────

@router.get("/library/books")
def list_books(
    search: Optional[str] = None,
    category: Optional[str] = None,
    available: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "library_books")
    if search:
        s = search.lower()
        items = [b for b in items if s in b.get("title", "").lower() or s in b.get("author", "").lower() or s in b.get("isbn", "").lower()]
    if category:
        items = [b for b in items if b.get("category") == category]
    if available is not None:
        items = [b for b in items if b.get("available_copies", 0) > 0] if available else [b for b in items if b.get("available_copies", 0) == 0]
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/library/books")
def add_book(data: dict, db: Session = Depends(get_db)):
    if not data.get("title"):
        raise HTTPException(status_code=422, detail="title is required")
    items = _load(db, "library_books")
    total_copies = int(data.get("total_copies", 1))
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "total_copies": total_copies,
        "available_copies": total_copies,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "library_books", items, "library")
    return new_item


@router.put("/library/books/{book_id}")
def update_book(book_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "library_books")
    updated = [{**b, **data, "id": book_id} if b["id"] == book_id else b for b in items]
    _save(db, "library_books", updated, "library")
    return next((b for b in updated if b["id"] == book_id), {"message": "Updated"})


@router.delete("/library/books/{book_id}")
def delete_book(book_id: str, db: Session = Depends(get_db)):
    items = [b for b in _load(db, "library_books") if b["id"] != book_id]
    _save(db, "library_books", items, "library")
    return {"message": "Deleted"}


@router.get("/library/transactions")
def list_transactions(
    status: Optional[str] = None,
    student_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "library_transactions")
    if status:
        items = [t for t in items if t.get("status") == status]
    if student_id:
        items = [t for t in items if t.get("student_id") == student_id]
    items = sorted(items, key=lambda x: x.get("issued_at", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/library/issue")
def issue_book(data: dict, db: Session = Depends(get_db)):
    book_id = data.get("book_id")
    if not book_id:
        raise HTTPException(status_code=422, detail="book_id is required")
    books = _load(db, "library_books")
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.get("available_copies", 0) < 1:
        raise HTTPException(status_code=400, detail="No copies available")
    # Update available copies
    for b in books:
        if b["id"] == book_id:
            b["available_copies"] = b.get("available_copies", 1) - 1
    _save(db, "library_books", books, "library")
    # Create transaction
    txns = _load(db, "library_transactions")
    txn = {
        **data,
        "id": str(uuid.uuid4()),
        "book_title": book.get("title", ""),
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "due_date": data.get("due_date", ""),
        "status": "issued",
    }
    txns.insert(0, txn)
    _save(db, "library_transactions", txns, "library")
    return txn


@router.post("/library/return/{txn_id}")
def return_book(txn_id: str, db: Session = Depends(get_db)):
    txns = _load(db, "library_transactions")
    txn = next((t for t in txns if t["id"] == txn_id), None)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.get("status") == "returned":
        raise HTTPException(status_code=400, detail="Book already returned")
    # Update available copies
    book_id = txn.get("book_id")
    if book_id:
        books = _load(db, "library_books")
        for b in books:
            if b["id"] == book_id:
                b["available_copies"] = b.get("available_copies", 0) + 1
        _save(db, "library_books", books, "library")
    # Update transaction
    for t in txns:
        if t["id"] == txn_id:
            t["status"] = "returned"
            t["returned_at"] = datetime.now(timezone.utc).isoformat()
    _save(db, "library_transactions", txns, "library")
    return {"message": "Book returned successfully"}


@router.get("/library/overdue")
def list_overdue(fine_per_day: float = 50.0, db: Session = Depends(get_db)):
    """List all overdue library transactions with calculated fines."""
    from datetime import date as _date
    txns = _load(db, "library_transactions")
    today = _date.today().isoformat()
    overdue = []
    total_fines = 0.0
    for t in txns:
        if t.get("status") == "issued" and t.get("due_date") and t["due_date"] < today:
            # Calculate days overdue
            from datetime import datetime
            due = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
            days_overdue = (_date.today() - due).days
            fine = days_overdue * fine_per_day
            total_fines += fine
            overdue.append({**t, "days_overdue": days_overdue, "fine": fine})
    overdue.sort(key=lambda x: x["days_overdue"], reverse=True)
    return {"items": overdue, "total": len(overdue), "total_fines": total_fines}


@router.post("/library/send-reminders")
def send_library_reminders(db: Session = Depends(get_db)):
    """Send email reminders to all students with overdue books."""
    from app.core.email_service import _send, _render
    overdue_data = list_overdue(db=db)
    sent = 0
    for item in overdue_data["items"]:
        email = item.get("student_email", "")
        if email:
            html = f"""<div style="font-family:Arial,sans-serif;padding:20px">
                <h3>Library Book Overdue Reminder</h3>
                <p>Dear {item.get('student_name','Student')},</p>
                <p>The book <strong>{item.get('book_title','')}</strong> was due on <strong>{item.get('due_date','')}</strong>.</p>
                <p>You have <strong>{item['days_overdue']} days</strong> overdue. Accumulated fine: <strong>₦{item['fine']:,.0f}</strong>.</p>
                <p>Please return the book immediately to the school library.</p></div>"""
            ok = _send(email, f"Library Overdue — {item.get('book_title','')}", html)
            if ok: sent += 1
    return {"message": f"Reminders sent to {sent} students", "sent": sent}


# ─── Transport ───────────────────────────────────────────────────────────────

@router.get("/transport/routes")
def list_routes(db: Session = Depends(get_db)):
    items = _load(db, "transport_routes")
    return {"items": items, "total": len(items)}


@router.post("/transport/routes")
def create_route(data: dict, db: Session = Depends(get_db)):
    if not data.get("route_name"):
        raise HTTPException(status_code=422, detail="route_name is required")
    items = _load(db, "transport_routes")
    new_item = {**data, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
    items.append(new_item)
    _save(db, "transport_routes", items, "transport")
    return new_item


@router.put("/transport/routes/{route_id}")
def update_route(route_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "transport_routes")
    updated = [{**r, **data, "id": route_id} if r["id"] == route_id else r for r in items]
    _save(db, "transport_routes", updated, "transport")
    return next((r for r in updated if r["id"] == route_id), {"message": "Updated"})


@router.delete("/transport/routes/{route_id}")
def delete_route(route_id: str, db: Session = Depends(get_db)):
    items = [r for r in _load(db, "transport_routes") if r["id"] != route_id]
    _save(db, "transport_routes", items, "transport")
    return {"message": "Deleted"}


@router.get("/transport/students")
def list_transport_students(route_id: Optional[str] = None, db: Session = Depends(get_db)):
    items = _load(db, "transport_students")
    if route_id:
        items = [s for s in items if s.get("route_id") == route_id]
    return {"items": items, "total": len(items)}


@router.post("/transport/students")
def assign_transport_student(data: dict, db: Session = Depends(get_db)):
    items = _load(db, "transport_students")
    new_item = {**data, "id": str(uuid.uuid4()), "assigned_at": datetime.now(timezone.utc).isoformat()}
    items.append(new_item)
    _save(db, "transport_students", items, "transport")
    return new_item


@router.delete("/transport/students/{assign_id}")
def remove_transport_student(assign_id: str, db: Session = Depends(get_db)):
    items = [s for s in _load(db, "transport_students") if s["id"] != assign_id]
    _save(db, "transport_students", items, "transport")
    return {"message": "Removed"}


# ─── Inventory ────────────────────────────────────────────────────────────────

@router.get("/inventory")
def list_inventory(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "inventory")
    if category:
        items = [i for i in items if i.get("category") == category]
    if search:
        s = search.lower()
        items = [i for i in items if s in i.get("name", "").lower()]
    if low_stock is not None and low_stock:
        items = [i for i in items if int(i.get("quantity", 0)) <= int(i.get("min_quantity", 10))]
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/inventory")
def add_inventory(data: dict, db: Session = Depends(get_db)):
    if not data.get("name"):
        raise HTTPException(status_code=422, detail="name is required")
    items = _load(db, "inventory")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "quantity": int(data.get("quantity", 0)),
        "min_quantity": int(data.get("min_quantity", 10)),
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "inventory", items, "inventory")
    return new_item


@router.put("/inventory/{item_id}")
def update_inventory(item_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "inventory")
    updated = [{**i, **data, "id": item_id, "updated_at": datetime.now(timezone.utc).isoformat()} if i["id"] == item_id else i for i in items]
    _save(db, "inventory", updated, "inventory")
    return next((i for i in updated if i["id"] == item_id), {"message": "Updated"})


@router.delete("/inventory/{item_id}")
def delete_inventory(item_id: str, db: Session = Depends(get_db)):
    items = [i for i in _load(db, "inventory") if i["id"] != item_id]
    _save(db, "inventory", items, "inventory")
    return {"message": "Deleted"}


# ─── Payroll ─────────────────────────────────────────────────────────────────

@router.get("/payroll")
def list_payroll(
    month: Optional[str] = None,
    year: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "payroll")
    if month:
        items = [p for p in items if p.get("month") == month]
    if year:
        items = [p for p in items if p.get("year") == str(year)]
    if status:
        items = [p for p in items if p.get("status") == status]
    items = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    total_amount = sum(float(p.get("net_salary", 0)) for p in items)
    return {
        "items": items[start:start + limit],
        "total": total,
        "page": page,
        "page_size": limit,
        "total_amount": total_amount,
    }


def _calc_tax(annual_basic: float, annual_allowances: float) -> dict:
    """Nigerian PAYE, NHIS (1.75%), NHF (2.5%), Pension (8%) — monthly amounts."""
    gross = annual_basic + annual_allowances
    nhis    = gross * 0.0175
    nhf     = annual_basic * 0.025
    pension = annual_basic * 0.08
    cra = max(200_000.0, gross * 0.01) + gross * 0.20
    taxable = max(0.0, gross - cra - pension - nhis - nhf)
    paye = 0.0
    for band_size, rate in [(300_000,.07),(300_000,.11),(500_000,.15),(500_000,.19),(1_600_000,.21),(float("inf"),.24)]:
        if taxable <= 0: break
        paye += min(taxable, band_size) * rate
        taxable -= min(taxable, band_size)
    return {
        "nhis":   round(nhis / 12, 2),
        "nhf":    round(nhf / 12, 2),
        "pension": round(pension / 12, 2),
        "paye":   round(paye / 12, 2),
        "total_statutory": round((nhis + nhf + pension + paye) / 12, 2),
    }


@router.post("/payroll")
def create_payroll(data: dict, db: Session = Depends(get_db)):
    if not data.get("employee_name") or not data.get("employee_id"):
        raise HTTPException(status_code=422, detail="employee_id and employee_name are required")
    items = _load(db, "payroll")
    basic      = float(data.get("basic_salary", 0))
    allowances = float(data.get("allowances", 0))
    manual_ded = float(data.get("deductions", 0))
    tax_data   = _calc_tax(basic * 12, allowances * 12)
    total_ded  = manual_ded + tax_data["total_statutory"]
    net        = basic + allowances - total_ded
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "basic_salary": basic,
        "allowances": allowances,
        "deductions": round(total_ded, 2),
        "manual_deductions": manual_ded,
        "tax_breakdown": tax_data,
        "net_salary": round(net, 2),
        "status": data.get("status", "pending"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "payroll", items, "finance")
    return new_item


@router.post("/payroll/bulk-run")
def bulk_payroll_run(data: dict, db: Session = Depends(get_db)):
    """Generate payroll entries for all active teachers for a given month/year."""
    month = data.get("month")
    year  = str(data.get("year", ""))
    if not month or not year:
        raise HTTPException(status_code=422, detail="month and year are required")

    base_salary = float(data.get("base_salary", 80_000))
    allowances  = float(data.get("allowances", 15_000))

    import json as _json
    teachers = db.query(User).filter(User.role.in_(["teacher", "staff"]), User.is_active == True).all()
    existing = _load(db, "payroll")
    already  = {p.get("employee_id") for p in existing if p.get("month") == month and p.get("year") == year}

    created: list = []
    skipped: list = []
    for t in teachers:
        if str(t.id) in already:
            skipped.append(t.full_name)
            continue
        extra   = _json.loads(t.preferences) if t.preferences else {}
        t_basic = float(extra.get("salary", base_salary))
        t_allow = float(extra.get("allowances", allowances))
        td      = _calc_tax(t_basic * 12, t_allow * 12)
        net     = t_basic + t_allow - td["total_statutory"]
        entry   = {
            "id": str(uuid.uuid4()),
            "employee_id": str(t.id),
            "employee_name": t.full_name,
            "role": extra.get("subject", t.role),
            "basic_salary": t_basic, "allowances": t_allow,
            "deductions": td["total_statutory"],
            "tax_breakdown": td, "net_salary": round(net, 2),
            "month": month, "year": year,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        existing.insert(0, entry)
        created.append(entry)

    _save(db, "payroll", existing, "finance")
    return {"message": f"Bulk run: {len(created)} created, {len(skipped)} skipped.", "created_count": len(created), "skipped": skipped}


@router.put("/payroll/{pay_id}")
def update_payroll(pay_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "payroll")
    existing = next((p for p in items if p["id"] == pay_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Payroll entry not found")

    merged = {**existing, **data}
    # If any salary figure changed, recalculate statutory deductions and net pay
    # the same way create_payroll does, so payslips stay accurate after an edit.
    if any(k in data for k in ("basic_salary", "allowances", "deductions")):
        basic      = float(merged.get("basic_salary", 0))
        allowances = float(merged.get("allowances", 0))
        manual_ded = float(data.get("deductions", merged.get("manual_deductions", 0)))
        tax_data   = _calc_tax(basic * 12, allowances * 12)
        total_ded  = manual_ded + tax_data["total_statutory"]
        merged["basic_salary"] = basic
        merged["allowances"] = allowances
        merged["deductions"] = round(total_ded, 2)
        merged["manual_deductions"] = manual_ded
        merged["tax_breakdown"] = tax_data
        merged["net_salary"] = round(basic + allowances - total_ded, 2)
    merged["id"] = pay_id

    updated = [merged if p["id"] == pay_id else p for p in items]
    _save(db, "payroll", updated, "finance")
    return merged


@router.delete("/payroll/{pay_id}")
def delete_payroll(pay_id: str, db: Session = Depends(get_db)):
    items = [p for p in _load(db, "payroll") if p["id"] != pay_id]
    _save(db, "payroll", items, "finance")
    return {"message": "Deleted"}


# ─── Attendance ───────────────────────────────────────────────────────────────

@router.get("/attendance/stats")
def attendance_stats(db: Session = Depends(get_db)):
    records = _load(db, "attendance_records")
    today = date.today().isoformat()
    today_records = [r for r in records if r.get("date") == today]
    present = sum(1 for r in today_records if r.get("status") == "present")
    absent = sum(1 for r in today_records if r.get("status") == "absent")
    late = sum(1 for r in today_records if r.get("status") == "late")
    total = present + absent + late
    return {
        "present": present,
        "absent": absent,
        "late": late,
        "total": total,
        "rate": round((present / total * 100) if total else 0, 1),
        "date": today,
    }


@router.get("/attendance/records")
def list_attendance(
    class_name: Optional[str] = None,
    date_: Optional[str] = Query(None, alias="date"),
    student_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    records = _load(db, "attendance_records")
    if class_name:
        records = [r for r in records if r.get("class_name") == class_name]
    if date_:
        records = [r for r in records if r.get("date") == date_]
    if student_id:
        records = [r for r in records if r.get("student_id") == student_id]
    records = sorted(records, key=lambda x: (x.get("date", ""), x.get("student_name", "")), reverse=True)
    total = len(records)
    start = (page - 1) * limit
    return {"items": records[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/attendance/mark")
def mark_attendance(data: dict, db: Session = Depends(get_db)):
    """Mark attendance for multiple students at once."""
    records_data = data.get("records", [])
    if not records_data:
        raise HTTPException(status_code=422, detail="records list is required")
    all_records = _load(db, "attendance_records")
    mark_date = data.get("date", date.today().isoformat())
    class_name = data.get("class_name", "")
    # Remove existing records for this date+class
    all_records = [r for r in all_records if not (r.get("date") == mark_date and r.get("class_name") == class_name)]
    for rec in records_data:
        all_records.insert(0, {
            **rec,
            "id": str(uuid.uuid4()),
            "date": mark_date,
            "class_name": class_name,
            "marked_at": datetime.now(timezone.utc).isoformat(),
        })
    _save(db, "attendance_records", all_records, "academics")
    return {"message": f"Marked {len(records_data)} attendance records"}
