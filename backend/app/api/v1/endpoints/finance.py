"""Finance endpoints."""
from typing import List
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.models.enums import UserRole
from app.services.finance_service import FinanceService
from app.schemas.finance import (
    FeeStructureCreate, FeeStructureOut,
    InvoiceCreate, InvoiceOut,
    PaymentCreate, PaymentOut,
    ExpenseCreate, ExpenseOut,
    IncomeCreate, IncomeOut,
)
from app.models.finance import FeeStructure, Invoice, Payment, Expense, Income
from app.models.user import User

router = APIRouter()

require_accountant = require_roles([UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.PRINCIPAL])


@router.get("/fee-structures", response_model=List[FeeStructureOut])
def list_fee_structures(db: Session = Depends(get_db), _: User = Depends(require_accountant)):
    return db.query(FeeStructure).all()


@router.post("/fee-structures", response_model=FeeStructureOut, status_code=201)
def create_fee_structure(payload: FeeStructureCreate, db: Session = Depends(get_db), _: User = Depends(require_accountant)):
    service = FinanceService(db)
    return service.create_fee_structure(payload)


@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(student_id: int = None, status: str = None, db: Session = Depends(get_db), _: User = Depends(require_accountant)):
    q = db.query(Invoice)
    if student_id:
        q = q.filter(Invoice.student_id == student_id)
    if status:
        q = q.filter(Invoice.status == status)
    return q.all()


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_accountant)):
    service = FinanceService(db)
    return service.create_invoice(payload, current_user.id)


@router.post("/payments", response_model=PaymentOut, status_code=201)
def record_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_accountant)):
    service = FinanceService(db)
    return service.record_payment(payload, current_user.id)


@router.get("/payments", response_model=List[PaymentOut])
def list_payments(student_id: int = None, db: Session = Depends(get_db), _: User = Depends(require_accountant)):
    q = db.query(Payment)
    if student_id:
        q = q.filter(Payment.student_id == student_id)
    return q.order_by(Payment.paid_at.desc()).all()


@router.post("/expenses", response_model=ExpenseOut, status_code=201)
def record_expense(payload: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_accountant)):
    service = FinanceService(db)
    return service.record_expense(payload, current_user.id)


@router.get("/expenses", response_model=List[ExpenseOut])
def list_expenses(db: Session = Depends(get_db), _: User = Depends(require_accountant)):
    return db.query(Expense).order_by(Expense.date.desc()).all()


@router.post("/income", response_model=IncomeOut, status_code=201)
def record_income(payload: IncomeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_accountant)):
    service = FinanceService(db)
    return service.record_income(payload, current_user.id)


@router.get("/income", response_model=List[IncomeOut])
def list_income(db: Session = Depends(get_db), _: User = Depends(require_accountant)):
    return db.query(Income).order_by(Income.date.desc()).all()


@router.get("/summary")
def finance_summary(
    start: date = Query(None),
    end: date = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_accountant),
):
    service = FinanceService(db)
    return service.get_summary(start, end)
