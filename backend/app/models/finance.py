"""Finance: fee structures, invoices, payments, income, expenses."""
from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Text
from app.core.database import Base
from app.models.base import TimestampMixin


class FeeStructure(TimestampMixin, Base):
    __tablename__ = "fee_structures"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    class_id = Column(Integer, ForeignKey("class_levels.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=False)
    tuition_fee = Column(Float, default=0)
    development_fee = Column(Float, default=0)
    books_fee = Column(Float, default=0)
    uniform_fee = Column(Float, default=0)
    transport_fee = Column(Float, default=0)
    other_fees = Column(Float, default=0)
    total_amount = Column(Float, default=0)


class Invoice(TimestampMixin, Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(30), unique=True, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic_terms.id"), nullable=False)
    amount = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0)
    balance = Column(Float, nullable=False)
    status = Column(String(20), default="pending")
    due_date = Column(Date, nullable=False)
    issued_at = Column(Date, nullable=False)


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(30), unique=True, nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(30), nullable=False)  # cash, transfer, card, cheque
    reference = Column(String(100), nullable=True)
    paid_by = Column(String(100), nullable=True)
    collected_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    paid_at = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)


class Income(TimestampMixin, Base):
    __tablename__ = "income"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class Expense(TimestampMixin, Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    vendor = Column(String(100), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
