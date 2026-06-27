"""Bulk import/export for students."""
import csv
import io
from typing import List, Dict, Any, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.models.student import Student, Guardian


class BulkService:
    def __init__(self, db: Session):
        self.db = db

    STUDENT_CSV_HEADERS = [
        "admission_number", "first_name", "last_name", "other_names",
        "gender", "date_of_birth", "nationality", "state_of_origin",
        "lga", "religion", "home_address", "guardian_name",
        "guardian_phone", "guardian_email", "guardian_relationship",
        "entry_class_name",
    ]

    def export_students_csv(self, class_level_id: Optional[int] = None, session_id: Optional[int] = None) -> bytes:
        """Export students as CSV."""
        q = self.db.query(Student)
        if class_level_id:
            q = q.filter(Student.entry_class_id == class_level_id)
        students = q.all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(self.STUDENT_CSV_HEADERS)

        for s in students:
            guardian = s.guardian if s.guardian_id else None
            class_level = self.db.query(Student.entry_class_id).filter(Student.id == s.id).first()
            from app.models.academic import ClassLevel
            class_obj = self.db.query(ClassLevel).filter(ClassLevel.id == s.entry_class_id).first() if s.entry_class_id else None

            writer.writerow([
                s.admission_number,
                s.first_name,
                s.last_name,
                s.other_names or "",
                s.gender,
                s.date_of_birth.isoformat() if s.date_of_birth else "",
                s.nationality or "",
                s.state_of_origin or "",
                s.lga or "",
                s.religion or "",
                s.home_address or "",
                guardian.full_name if guardian else "",
                guardian.phone if guardian else "",
                guardian.email if guardian else "",
                guardian.relationship_to_student if guardian else "",
                class_obj.name if class_obj else "",
            ])

        return output.getvalue().encode("utf-8")

    def import_students_csv(self, csv_content: str, user_id: int) -> Dict[str, Any]:
        """Import students from CSV."""
        results = {"imported": [], "failed": [], "skipped": []}
        reader = csv.DictReader(io.StringIO(csv_content))

        from app.models.academic import ClassLevel

        for row in reader:
            try:
                # Validate required fields
                if not row.get("admission_number") or not row.get("first_name") or not row.get("last_name"):
                    results["skipped"].append({"row": row, "reason": "Missing required fields"})
                    continue

                # Check duplicate
                existing = self.db.query(Student).filter(
                    Student.admission_number == row["admission_number"]
                ).first()
                if existing:
                    results["skipped"].append({
                        "row": row,
                        "reason": f"Admission number {row['admission_number']} already exists",
                    })
                    continue

                # Find class
                class_obj = None
                if row.get("entry_class_name"):
                    class_obj = self.db.query(ClassLevel).filter(
                        ClassLevel.name == row["entry_class_name"]
                    ).first()

                # Create guardian if info provided
                guardian = None
                if row.get("guardian_name"):
                    guardian = Guardian(
                        full_name=row["guardian_name"],
                        relationship_to_student=row.get("guardian_relationship", "Guardian"),
                        phone=row.get("guardian_phone", ""),
                        email=row.get("guardian_email"),
                    )
                    self.db.add(guardian)
                    self.db.flush()

                # Parse date of birth
                dob = None
                if row.get("date_of_birth"):
                    try:
                        dob = date.fromisoformat(row["date_of_birth"])
                    except ValueError:
                        pass

                student = Student(
                    admission_number=row["admission_number"],
                    first_name=row["first_name"],
                    last_name=row["last_name"],
                    other_names=row.get("other_names"),
                    gender=row.get("gender", "male"),
                    date_of_birth=dob or date.today(),
                    nationality=row.get("nationality", "Nigerian"),
                    state_of_origin=row.get("state_of_origin"),
                    lga=row.get("lga"),
                    religion=row.get("religion"),
                    home_address=row.get("home_address"),
                    guardian_id=guardian.id if guardian else None,
                    admission_status="enrolled",
                    admission_date=date.today(),
                    entry_class_id=class_obj.id if class_obj else None,
                    is_active=1,
                )
                self.db.add(student)
                results["imported"].append(row["admission_number"])
            except Exception as e:
                results["failed"].append({"row": row, "reason": str(e)})

        self.db.commit()
        return {
            "imported_count": len(results["imported"]),
            "skipped_count": len(results["skipped"]),
            "failed_count": len(results["failed"]),
            "imported": results["imported"],
            "skipped": results["skipped"][:10],  # cap
            "failed": results["failed"][:10],
        }
