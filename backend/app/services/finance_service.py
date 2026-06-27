"""Finance service."""
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from app.models.finance import Invoice, Payment, FeeStructure, Expense, Income
from app.repositories.finance_repo import InvoiceRepository, PaymentRepository, ExpenseRepository, IncomeRepository
from app.schemas.finance import InvoiceCreate, PaymentCreate, FeeStructureCreate, ExpenseCreate, IncomeCreate
from app.core.exceptions import NotFoundError, AppException


class FinanceService:
    def __init__(self, db: Session):
        self.db = db
        self.invoice_repo = InvoiceRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.expense_repo = ExpenseRepository(db)
        self.income_repo = IncomeRepository(db)

    def create_fee_structure(self, data: FeeStructureCreate) -> FeeStructure:
        total = (
            data.tuition_fee + data.development_fee + data.books_fee
            + data.uniform_fee + data.transport_fee + data.other_fees
        )
        fs = FeeStructure(**data.model_dump(), total_amount=total)
        self.db.add(fs)
        self.db.commit()
        self.db.refresh(fs)
        return fs

    def create_invoice(self, data: InvoiceCreate, issued_by_id: int) -> Invoice:
        invoice = Invoice(
            invoice_number=self.invoice_repo.generate_number(),
            student_id=data.student_id,
            fee_structure_id=data.fee_structure_id,
            term_id=data.term_id,
            amount=data.amount,
            amount_paid=0,
            balance=data.amount,
            status="pending",
            due_date=data.due_date,
            issued_at=date.today(),
        )
        return self.invoice_repo.create(invoice)

    def record_payment(self, data: PaymentCreate, collected_by_id: int) -> Payment:
        invoice = self.invoice_repo.get(data.invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        if data.amount > invoice.balance:
            raise AppException(status_code=400, detail="Payment exceeds outstanding balance")

        payment = Payment(
            receipt_number=self.payment_repo.generate_receipt(),
            **data.model_dump(),
            collected_by_id=collected_by_id,
        )
        self.db.add(payment)

        invoice.amount_paid += data.amount
        invoice.balance -= data.amount
        if invoice.balance <= 0:
            invoice.status = "paid"
            invoice.balance = 0
        else:
            invoice.status = "partial"
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def record_expense(self, data: ExpenseCreate, recorded_by_id: int) -> Expense:
        expense = Expense(**data.model_dump(), recorded_by_id=recorded_by_id)
        return self.expense_repo.create(expense)

    def record_income(self, data: IncomeCreate, recorded_by_id: int) -> Income:
        income = Income(**data.model_dump(), recorded_by_id=recorded_by_id)
        return self.income_repo.create(income)

    def get_summary(self, start: Optional[date] = None, end: Optional[date] = None) -> dict:
        income_total = self.payment_repo.total_collected(start, end)
        expense_total = self.expense_repo.total(start, end)
        outstanding = self.db.query(Invoice).filter(Invoice.status.in_(["pending", "partial"])).all()
        outstanding_balance = sum(i.balance for i in outstanding)
        return {
            "total_income": income_total,
            "total_expenses": expense_total,
            "net": income_total - expense_total,
            "outstanding_fees": outstanding_balance,
        }
