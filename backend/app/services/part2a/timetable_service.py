"""Timetable service with conflict detection and clash prevention."""
from typing import Optional, List, Dict, Any
from datetime import time
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.part2a.academic_structure import TimetableSlot


class TimetableConflictError(Exception):
    def __init__(self, message: str, conflicts: List[Dict[str, Any]] = None):
        super().__init__(message)
        self.conflicts = conflicts or []


class TimetableService:
    def __init__(self, db: Session):
        self.db = db

    def check_conflicts(
        self,
        class_level_id: int,
        arm_id: Optional[int],
        day_of_week: int,
        period: int,
        teacher_id: int,
        session_id: int,
        term_id: int,
        exclude_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Check for timetable conflicts before inserting a slot."""
        conflicts = []

        # 1. Class conflict: same class, same day, same period
        class_conflict = self.db.query(TimetableSlot).filter(
            TimetableSlot.class_level_id == class_level_id,
            TimetableSlot.arm_id == arm_id,
            TimetableSlot.day_of_week == day_of_week,
            TimetableSlot.period == period,
            TimetableSlot.session_id == session_id,
            TimetableSlot.term_id == term_id,
        )
        if exclude_id:
            class_conflict = class_conflict.filter(TimetableSlot.id != exclude_id)
        class_conflict = class_conflict.first()
        if class_conflict:
            conflicts.append({
                "type": "class_conflict",
                "message": f"Class already has a slot scheduled on this day/period",
                "conflicting_slot_id": class_conflict.id,
            })

        # 2. Teacher conflict: same teacher, same day, same period (different class)
        teacher_conflict = self.db.query(TimetableSlot).filter(
            TimetableSlot.teacher_id == teacher_id,
            TimetableSlot.day_of_week == day_of_week,
            TimetableSlot.period == period,
            TimetableSlot.session_id == session_id,
            TimetableSlot.term_id == term_id,
        )
        if exclude_id:
            teacher_conflict = teacher_conflict.filter(TimetableSlot.id != exclude_id)
        teacher_conflict = teacher_conflict.first()
        if teacher_conflict:
            conflicts.append({
                "type": "teacher_conflict",
                "message": f"Teacher already teaching another class on this day/period",
                "conflicting_slot_id": teacher_conflict.id,
                "teacher_id": teacher_id,
            })

        return conflicts

    def add_slot(
        self,
        class_level_id: int,
        arm_id: Optional[int],
        day_of_week: int,
        period: int,
        start_time: time,
        end_time: time,
        subject_id: int,
        teacher_id: int,
        session_id: int,
        term_id: int,
        room: Optional[str] = None,
        slot_type: str = "regular",
        color: Optional[str] = None,
        notes: Optional[str] = None,
        allow_conflicts: bool = False,
    ) -> TimetableSlot:
        """Add a timetable slot with automatic conflict detection."""
        conflicts = self.check_conflicts(
            class_level_id, arm_id, day_of_week, period,
            teacher_id, session_id, term_id,
        )
        if conflicts and not allow_conflicts:
            raise TimetableConflictError(
                f"Cannot add slot: {len(conflicts)} conflict(s) detected",
                conflicts=conflicts,
            )

        slot = TimetableSlot(
            class_level_id=class_level_id,
            arm_id=arm_id,
            day_of_week=day_of_week,
            period=period,
            start_time=start_time,
            end_time=end_time,
            subject_id=subject_id,
            teacher_id=teacher_id,
            session_id=session_id,
            term_id=term_id,
            room=room,
            slot_type=slot_type,
            color=color,
            notes=notes,
        )
        self.db.add(slot)
        self.db.commit()
        self.db.refresh(slot)
        return slot

    def update_slot(self, slot_id: int, **kwargs) -> TimetableSlot:
        slot = self.db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
        if not slot:
            raise ValueError("Slot not found")

        # Check conflicts with new values
        new_values = {**slot.__dict__, **kwargs}
        conflicts = self.check_conflicts(
            new_values.get("class_level_id"),
            new_values.get("arm_id"),
            new_values.get("day_of_week"),
            new_values.get("period"),
            new_values.get("teacher_id"),
            new_values.get("session_id"),
            new_values.get("term_id"),
            exclude_id=slot_id,
        )
        if conflicts:
            raise TimetableConflictError(
                f"Cannot update slot: {len(conflicts)} conflict(s) detected",
                conflicts=conflicts,
            )

        for k, v in kwargs.items():
            if hasattr(slot, k):
                setattr(slot, k, v)
        self.db.commit()
        self.db.refresh(slot)
        return slot

    def delete_slot(self, slot_id: int) -> bool:
        slot = self.db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
        if slot:
            self.db.delete(slot)
            self.db.commit()
            return True
        return False

    def bulk_add_slots(self, slots: List[Dict[str, Any]]) -> List[TimetableSlot]:
        """Bulk add slots with conflict detection per slot."""
        added = []
        for s in slots:
            try:
                added.append(self.add_slot(**s))
            except TimetableConflictError:
                continue
        return added

    def get_class_timetable(
        self,
        class_level_id: int,
        arm_id: Optional[int],
        session_id: int,
        term_id: int,
    ) -> List[TimetableSlot]:
        return self.db.query(TimetableSlot).filter(
            TimetableSlot.class_level_id == class_level_id,
            TimetableSlot.arm_id == arm_id,
            TimetableSlot.session_id == session_id,
            TimetableSlot.term_id == term_id,
        ).order_by(TimetableSlot.day_of_week, TimetableSlot.period).all()

    def get_teacher_timetable(
        self,
        teacher_id: int,
        session_id: int,
        term_id: int,
    ) -> List[TimetableSlot]:
        return self.db.query(TimetableSlot).filter(
            TimetableSlot.teacher_id == teacher_id,
            TimetableSlot.session_id == session_id,
            TimetableSlot.term_id == term_id,
        ).order_by(TimetableSlot.day_of_week, TimetableSlot.period).all()

    def get_as_grid(self, slots: List[TimetableSlot]) -> Dict[int, Dict[int, Any]]:
        """Convert slots to a day -> period -> slot grid."""
        grid = {}
        for slot in slots:
            if slot.day_of_week not in grid:
                grid[slot.day_of_week] = {}
            grid[slot.day_of_week][slot.period] = slot
        return grid
