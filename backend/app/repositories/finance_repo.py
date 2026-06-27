"""Finance repositories."""
from typing import Optional, List
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.finance import Invoice, Payment, Expense, Income, FeeStructure
from app.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self, db: Session):
        super().__init__(Invoice, db)

    def generate_number(self) -> str:
        import datetime as dt
        prefix = f"INV-{dt.date.today().strftime('%Y%m')}"
        last = self.db.query(Invoice).filter(Invoice.invoice_number.like(f"{prefix}%")).order_by(Invoice.id.desc()).first()
        seq = 1
        if last:
            try:
                seq = int(last.invoice_number.split("-")[-1]) + 1
            except Exception:
                seq = 1
        return f"{prefix}-{seq:04d}"


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: Session):
        super().__init__(Payment, db)

    def generate_receipt(self) -> str:
        import datetime as dt
        prefix = f"RCP-{dt.date.today().strftime('%Y%m%d')}"
        last = self.db.query(Payment).filter(Payment.receipt_number.like(f"{prefix}%")).order_by(Payment.id.desc()).first()
        seq = 1
        if last:
            try:
                seq = int(last.receipt_number.split("-")[-1]) + 1
            except Exception:
                seq = 1
        return f"{prefix}-{seq:04d}"

    def total_collected(self, start: Optional[date] = None, end: Optional[date] = None) -> float:
        q = self.db.query(func.coalesce(func.sum(Payment.amount), 0))
        if start:
            q = q.filter(Payment.paid_at >= start)
        if end:
            q = q.filter(Payment.paid_at <= end)
        return float(q.scalar() or 0)


class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, db: Session):
        super().__init__(Expense, db)

    def total(self, start: Optional[date] = None, end: Optional[date] = None) -> float:
        q = self.db.query(func.coalesce(func.sum(Expense.amount), 0))
        if start:
            q = q.filter(Expense.date >= start)
        if end:
            q = q.filter(Expense.date <= end)
        return float(q.scalar() or 0)


class IncomeRepository(BaseRepository[Income]):
    def __init__(self, db: Session):
        super().__init__(Income, db)
