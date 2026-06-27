"""Analytics service for dashboard statistics."""
from typing import Optional
from datetime import date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.user import User
from app.models.academic import ClassLevel, Subject
from app.models.attendance import StudentAttendance
from app.models.finance import Payment, Invoice, Expense, Income
from app.models.student import Enrollment


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_stats(self) -> dict:
        total_students = self.db.query(func.count(Student.id)).filter(Student.is_active == 1).scalar() or 0
        male_students = self.db.query(func.count(Student.id)).filter(Student.is_active == 1, Student.gender == "male").scalar() or 0
        female_students = self.db.query(func.count(Student.id)).filter(Student.is_active == 1, Student.gender == "female").scalar() or 0
        teachers = self.db.query(func.count(User.id)).filter(User.role == "teacher", User.is_active == 1).scalar() or 0
        staff = self.db.query(func.count(User.id)).filter(User.role != "teacher", User.is_active == 1, User.role != "super_admin").scalar() or 0
        classes = self.db.query(func.count(ClassLevel.id)).filter(ClassLevel.is_active == 1).scalar() or 0
        subjects = self.db.query(func.count(Subject.id)).scalar() or 0

        today = date.today()
        month_start = today.replace(day=1)
        monthly_income = self.db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.paid_at >= month_start).scalar() or 0
        monthly_expenses = self.db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.date >= month_start).scalar() or 0

        outstanding = self.db.query(func.coalesce(func.sum(Invoice.balance), 0)).filter(Invoice.status.in_(["pending", "partial"])).scalar() or 0

        # Attendance percentage for today
        today_attendance = self.db.query(StudentAttendance).filter(StudentAttendance.date == today).all()
        if today_attendance:
            present = sum(1 for a in today_attendance if a.status == "present")
            attendance_pct = round((present / len(today_attendance)) * 100, 1)
        else:
            attendance_pct = 0.0

        return {
            "total_students": total_students,
            "male_students": male_students,
            "female_students": female_students,
            "teachers": teachers,
            "staff": staff,
            "classes": classes,
            "subjects": subjects,
            "attendance_percentage": attendance_pct,
            "monthly_income": float(monthly_income),
            "monthly_expenses": float(monthly_expenses),
            "outstanding_fees": float(outstanding),
        }

    def get_student_growth(self, months: int = 12) -> list:
        """Monthly student enrollment counts (simplified)."""
        result = []
        today = date.today()
        for i in range(months - 1, -1, -1):
            month_date = today - timedelta(days=i * 30)
            label = month_date.strftime("%b %Y")
            count = self.db.query(func.count(Student.id)).filter(
                Student.created_at <= f"{month_date.year}-{month_date.month:02d}-28"
            ).scalar() or 0
            result.append({"label": label, "count": count})
        return result

    def get_fee_collection_trend(self, months: int = 12) -> list:
        result = []
        today = date.today()
        for i in range(months - 1, -1, -1):
            month_date = today - timedelta(days=i * 30)
            start = month_date.replace(day=1)
            if month_date.month == 12:
                end = date(month_date.year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(month_date.year, month_date.month + 1, 1) - timedelta(days=1)
            total = self.db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
                Payment.paid_at >= start, Payment.paid_at <= end
            ).scalar() or 0
            result.append({"label": month_date.strftime("%b %Y"), "amount": float(total)})
        return result
