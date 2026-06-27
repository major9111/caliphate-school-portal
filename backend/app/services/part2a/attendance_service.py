"""Enhanced attendance with registers and approval workflow."""
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.part2a.attendance_extended import AttendanceRegister, AttendanceRecord
from app.models.student import Student


class AttendanceService:
    def __init__(self, db: Session):
        self.db = db

    def create_register(
        self,
        class_level_id: int,
        arm_id: Optional[int],
        session_id: int,
        term_id: int,
        attendance_date: date,
        period: str,
        marked_by_id: int,
    ) -> AttendanceRegister:
        """Create an attendance register for a class on a specific day."""
        existing = self.db.query(AttendanceRegister).filter(
            AttendanceRegister.class_level_id == class_level_id,
            AttendanceRegister.arm_id == arm_id,
            AttendanceRegister.date == attendance_date,
            AttendanceRegister.period == period,
        ).first()
        if existing:
            return existing

        students = self.db.query(Student).filter(
            Student.entry_class_id == class_level_id,
            Student.is_active == 1,
        ).all()

        register = AttendanceRegister(
            class_level_id=class_level_id,
            arm_id=arm_id,
            session_id=session_id,
            term_id=term_id,
            date=attendance_date,
            period=period,
            marked_by_id=marked_by_id,
            status="draft",
            total_students=len(students),
        )
        self.db.add(register)
        self.db.flush()

        # Pre-populate records for all students as absent (to be updated)
        for student in students:
            record = AttendanceRecord(
                register_id=register.id,
                student_id=student.id,
                status="absent",  # default; teacher will mark
            )
            self.db.add(record)

        self.db.commit()
        self.db.refresh(register)
        return register

    def mark_attendance_bulk(
        self,
        register_id: int,
        records: List[Dict[str, Any]],
        user_id: int,
    ) -> AttendanceRegister:
        """Bulk mark attendance."""
        register = self.db.query(AttendanceRegister).filter(
            AttendanceRegister.id == register_id
        ).first()
        if not register:
            raise ValueError("Register not found")

        for r in records:
            existing = self.db.query(AttendanceRecord).filter(
                AttendanceRecord.register_id == register_id,
                AttendanceRecord.student_id == r["student_id"],
            ).first()
            if existing:
                existing.status = r["status"]
                existing.remark = r.get("remark")
                existing.check_in_time = r.get("check_in_time")
                existing.check_out_time = r.get("check_out_time")

        register.status = "submitted"
        register.marked_by_id = user_id

        # Update counts
        all_records = self.db.query(AttendanceRecord).filter(
            AttendanceRecord.register_id == register_id
        ).all()
        register.total_students = len(all_records)
        register.present_count = sum(1 for r in all_records if r.status == "present")
        register.absent_count = sum(1 for r in all_records if r.status == "absent")
        register.late_count = sum(1 for r in all_records if r.status == "late")
        register.excused_count = sum(1 for r in all_records if r.status == "excused")

        self.db.commit()
        self.db.refresh(register)
        return register

    def correct_attendance(
        self,
        record_id: int,
        new_status: str,
        reason: str,
        user_id: int,
    ) -> AttendanceRecord:
        """Correct an attendance record (principal approval)."""
        record = self.db.query(AttendanceRecord).filter(
            AttendanceRecord.id == record_id
        ).first()
        if not record:
            raise ValueError("Record not found")
        record.status = new_status
        record.is_corrected = True
        record.correction_reason = reason
        record.corrected_by_id = user_id
        self.db.commit()
        self.db.refresh(record)

        # Update register counts
        register = self.db.query(AttendanceRegister).filter(
            AttendanceRegister.id == record.register_id
        ).first()
        if register:
            all_records = self.db.query(AttendanceRecord).filter(
                AttendanceRecord.register_id == register.id
            ).all()
            register.present_count = sum(1 for r in all_records if r.status == "present")
            register.absent_count = sum(1 for r in all_records if r.status == "absent")
            register.late_count = sum(1 for r in all_records if r.status == "late")
            register.excused_count = sum(1 for r in all_records if r.status == "excused")
            self.db.commit()
        return record

    def approve_register(self, register_id: int, user_id: int) -> AttendanceRegister:
        register = self.db.query(AttendanceRegister).filter(
            AttendanceRegister.id == register_id
        ).first()
        if not register:
            raise ValueError("Register not found")
        register.status = "approved"
        register.approved_by_id = user_id
        register.approved_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(register)
        return register

    def get_register(self, register_id: int) -> Dict[str, Any]:
        register = self.db.query(AttendanceRegister).filter(
            AttendanceRegister.id == register_id
        ).first()
        if not register:
            raise ValueError("Register not found")
        records = self.db.query(AttendanceRecord).filter(
            AttendanceRecord.register_id == register_id
        ).all()
        return {"register": register, "records": records}

    def list_registers(
        self,
        class_level_id: Optional[int] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> List[AttendanceRegister]:
        q = self.db.query(AttendanceRegister)
        if class_level_id:
            q = q.filter(AttendanceRegister.class_level_id == class_level_id)
        if from_date:
            q = q.filter(AttendanceRegister.date >= from_date)
        if to_date:
            q = q.filter(AttendanceRegister.date <= to_date)
        if status:
            q = q.filter(AttendanceRegister.status == status)
        return q.order_by(AttendanceRegister.date.desc()).all()

    def get_student_attendance(
        self,
        student_id: int,
        session_id: Optional[int] = None,
        term_id: Optional[int] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get attendance summary for a student."""
        q = self.db.query(AttendanceRecord).join(AttendanceRegister).filter(
            AttendanceRecord.student_id == student_id
        )
        if session_id:
            q = q.filter(AttendanceRegister.session_id == session_id)
        if term_id:
            q = q.filter(AttendanceRegister.term_id == term_id)
        if from_date:
            q = q.filter(AttendanceRegister.date >= from_date)
        if to_date:
            q = q.filter(AttendanceRegister.date <= to_date)

        records = q.all()
        total = len(records)
        present = sum(1 for r in records if r.status == "present")
        absent = sum(1 for r in records if r.status == "absent")
        late = sum(1 for r in records if r.status == "late")
        excused = sum(1 for r in records if r.status == "excused")
        pct = round((present / total * 100), 1) if total else 0

        return {
            "records": records,
            "total": total,
            "present": present,
            "absent": absent,
            "late": late,
            "excused": excused,
            "percentage": pct,
        }

    def get_monthly_report(
        self,
        class_level_id: int,
        year: int,
        month: int,
    ) -> Dict[str, Any]:
        """Get monthly attendance report for a class."""
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)
        end = date.fromordinal(end.toordinal() - 1)

        registers = self.db.query(AttendanceRegister).filter(
            AttendanceRegister.class_level_id == class_level_id,
            AttendanceRegister.date >= start,
            AttendanceRegister.date <= end,
        ).all()

        total_students = sum(r.total_students for r in registers)
        total_present = sum(r.present_count for r in registers)
        total_absent = sum(r.absent_count for r in registers)
        total_late = sum(r.late_count for r in registers)
        total_excused = sum(r.excused_count for r in registers)

        return {
            "class_level_id": class_level_id,
            "year": year,
            "month": month,
            "total_days": len(registers),
            "total_students_recorded": total_students,
            "total_present": total_present,
            "total_absent": total_absent,
            "total_late": total_late,
            "total_excused": total_excused,
            "percentage": round((total_present / total_students * 100), 1) if total_students else 0,
            "daily_breakdown": [
                {
                    "date": r.date.isoformat(),
                    "total": r.total_students,
                    "present": r.present_count,
                    "absent": r.absent_count,
                    "late": r.late_count,
                    "excused": r.excused_count,
                }
                for r in registers
            ],
        }
