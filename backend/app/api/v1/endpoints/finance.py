"""Finance endpoints - complete implementation."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
import json
import uuid
from datetime import datetime, date, timezone
try:
    from app.api.v1.endpoints.stream import publish as _sse_publish
except ImportError:
    def _sse_publish(*a, **kw): pass

router = APIRouter()


def _ensure_table(db: Session):
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


def _load(db: Session, table: str) -> list:
    from sqlalchemy import text
    _ensure_table(db)
    try:
        row = db.execute(text("SELECT value FROM system_settings WHERE key = :k"), {"k": table}).fetchone()
        return json.loads(row[0]) if row else []
    except Exception:
        return []


def _save(db: Session, table: str, data, category: str = "finance"):
    from sqlalchemy import text
    _ensure_table(db)
    v = json.dumps(data, default=str)
    exists = db.execute(text("SELECT 1 FROM system_settings WHERE key = :k"), {"k": table}).fetchone()
    if exists:
        db.execute(text("UPDATE system_settings SET value=:v, updated_at=CURRENT_TIMESTAMP WHERE key=:k"), {"k": table, "v": v})
    else:
        db.execute(text("INSERT INTO system_settings (key, value, category) VALUES (:k, :v, :cat)"), {"k": table, "v": v, "cat": category})
    db.commit()


@router.get("/stats")
def get_finance_stats(db: Session = Depends(get_db)):
    payments = _load(db, "payments")
    total_revenue = sum(float(p.get("amount", 0)) for p in payments if p.get("status") == "paid")
    collected = sum(float(p.get("amount", 0)) for p in payments if p.get("status") == "paid")
    outstanding = sum(float(p.get("amount", 0)) for p in payments if p.get("status") == "pending")
    expenses = sum(float(e.get("amount", 0)) for e in _load(db, "expenses"))

    # Monthly breakdown for current year
    current_year = str(date.today().year)
    monthly: dict[str, float] = {}
    for p in payments:
        if p.get("status") == "paid" and p.get("created_at", "").startswith(current_year):
            month = p.get("created_at", "")[:7]
            monthly[month] = monthly.get(month, 0) + float(p.get("amount", 0))

    return {
        "total_revenue": total_revenue,
        "collected": collected,
        "outstanding": outstanding,
        "expenses": expenses,
        "net_income": total_revenue - expenses,
        "total_transactions": len(payments),
        "monthly_breakdown": [{"month": k, "amount": v} for k, v in sorted(monthly.items())],
    }


@router.get("/payments")
def get_payments(
    status: Optional[str] = None,
    type_: Optional[str] = Query(None, alias="type"),
    student_name: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "payments")
    if status:
        items = [p for p in items if p.get("status") == status]
    if type_:
        items = [p for p in items if p.get("type") == type_]
    if student_name:
        s = student_name.lower()
        items = [p for p in items if s in p.get("student_name", "").lower()]
    items = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/payments")
def record_payment(data: dict, db: Session = Depends(get_db)):
    if not data.get("student_name"):
        raise HTTPException(status_code=422, detail="student_name is required")
    if not data.get("amount"):
        raise HTTPException(status_code=422, detail="amount is required")
    items = _load(db, "payments")
    receipt_number = f"RCP/{datetime.now(timezone.utc).year}/{uuid.uuid4().hex[:6].upper()}"
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "receipt_number": receipt_number,
        "status": "paid",
        "amount": float(data.get("amount", 0)),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payment_date": date.today().isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "payments", items, "finance")
    _sse_publish(None, "payment", {"student_name": new_item.get("student_name",""), "amount": new_item.get("amount",0)})
    return new_item


@router.put("/payments/{pay_id}")
def update_payment(pay_id: str, data: dict, db: Session = Depends(get_db)):
    items = _load(db, "payments")
    updated = [{**p, **data, "id": pay_id} if p["id"] == pay_id else p for p in items]
    _save(db, "payments", updated, "finance")
    return next((p for p in updated if p["id"] == pay_id), {"message": "Updated"})


@router.delete("/payments/{pay_id}")
def delete_payment(pay_id: str, db: Session = Depends(get_db)):
    items = [p for p in _load(db, "payments") if p["id"] != pay_id]
    _save(db, "payments", items, "finance")
    return {"message": "Deleted"}


@router.get("/expenses")
def list_expenses(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    items = _load(db, "expenses")
    if category:
        items = [e for e in items if e.get("category") == category]
    items = sorted(items, key=lambda x: x.get("expense_date", ""), reverse=True)
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "total": total, "page": page, "page_size": limit}


@router.post("/expenses")
def create_expense(data: dict, db: Session = Depends(get_db)):
    items = _load(db, "expenses")
    new_item = {
        **data,
        "id": str(uuid.uuid4()),
        "amount": float(data.get("amount", 0)),
        "expense_date": data.get("expense_date", date.today().isoformat()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, new_item)
    _save(db, "expenses", items, "finance")
    return new_item


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    items = [e for e in _load(db, "expenses") if e["id"] != expense_id]
    _save(db, "expenses", items, "finance")
    return {"message": "Deleted"}
