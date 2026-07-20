"""Export endpoints — PDF and Excel downloads for every major module."""
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.pdf_service import (
    generate_fee_receipt, generate_report_card, generate_payslip,
    generate_admission_letter, generate_table_pdf
)
from app.core.excel_service import (
    generate_results_excel, generate_students_excel,
    generate_payments_excel, generate_attendance_excel, generate_payroll_excel
)
from app.models.user import User

router = APIRouter()


def _load(db: Session, key: str) -> list:
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR PRIMARY KEY, value TEXT,
            category VARCHAR DEFAULT 'system',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )"""))
    db.commit()
    row = db.execute(text("SELECT value FROM system_settings WHERE key=:k"), {"k": key}).fetchone()
    return json.loads(row[0]) if row else []


# ── PDF exports ───────────────────────────────────────────────────────────────

@router.get("/pdf/receipt/{payment_id}")
def pdf_receipt(payment_id: str, db: Session = Depends(get_db)):
    payments = _load(db, "payments")
    payment = next((p for p in payments if p["id"] == payment_id), None)
    if not payment:
        raise HTTPException(404, "Payment not found")
    pdf_bytes = generate_fee_receipt(payment)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="receipt-{payment.get("receipt_number","")}.pdf"'}
    )


@router.get("/pdf/report-card/{student_id}")
def pdf_report_card(
    student_id: str,
    term: str = Query("Second Term"),
    session: str = Query("2025/2026"),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        raise HTTPException(404, "Student not found")
    extra = json.loads(user.preferences) if user.preferences else {}
    student_info = {
        "full_name": user.full_name,
        "admission_number": user.username,
        "class_name": extra.get("class_name", "N/A"),
        "gender": extra.get("gender", ""),
    }
    results = [r for r in _load(db, "results")
               if r.get("student_id") == student_id and r.get("term") == term and r.get("session") == session]
    if not results:
        # Try matching by name
        results = [r for r in _load(db, "results")
                   if r.get("student_name","").lower() == user.full_name.lower()
                   and r.get("term") == term and r.get("session") == session]

    all_results = _load(db, "results")
    class_results = [r for r in all_results if r.get("class_name") == student_info["class_name"]
                     and r.get("term") == term and r.get("session") == session]
    student_totals = {}
    for r in class_results:
        sid = r.get("student_id", r.get("student_name",""))
        student_totals[sid] = student_totals.get(sid, 0) + float(r.get("total", 0))
    sorted_totals = sorted(student_totals.values(), reverse=True)
    my_total = sum(float(r.get("total", 0)) for r in results)
    position = sorted_totals.index(my_total) + 1 if my_total in sorted_totals else None

    pdf_bytes = generate_report_card(
        student=student_info, results=results, term=term, session=session,
        position=position, total_students=len(student_totals)
    )
    safe_name = user.full_name.replace(" ", "_")
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report-card-{safe_name}-{term.replace(" ","-")}.pdf"'}
    )


@router.get("/pdf/payslip/{payroll_id}")
def pdf_payslip(payroll_id: str, db: Session = Depends(get_db)):
    payroll = _load(db, "payroll")
    entry = next((p for p in payroll if p["id"] == payroll_id), None)
    if not entry:
        raise HTTPException(404, "Payroll entry not found")
    pdf_bytes = generate_payslip(entry)
    safe = entry.get("employee_name","").replace(" ","_")
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="payslip-{safe}-{entry.get("month","")}.pdf"'}
    )


@router.get("/pdf/admission-letter/{admission_id}")
def pdf_admission_letter(admission_id: str, db: Session = Depends(get_db)):
    admissions = _load(db, "admissions")
    admission = next((a for a in admissions if a["id"] == admission_id), None)
    if not admission:
        raise HTTPException(404, "Admission not found")
    if admission.get("status") != "approved":
        raise HTTPException(400, "Admission letter can only be generated for approved applications.")
    pdf_bytes = generate_admission_letter(admission)
    safe = admission.get("applicant_name","").replace(" ","_")
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="admission-letter-{safe}.pdf"'}
    )


@router.get("/pdf/students")
def pdf_students_list(db: Session = Depends(get_db)):
    from app.models.user import User as UserModel
    import json as _json
    users = db.query(UserModel).filter(UserModel.role == "student").all()
    headers = ["#", "Admission No", "Full Name", "Class", "Gender", "Email", "Phone"]
    rows = []
    for i, u in enumerate(users, 1):
        extra = _json.loads(u.preferences) if u.preferences else {}
        rows.append([str(i), u.username, u.full_name, extra.get("class_name",""), extra.get("gender",""), u.email or "", u.phone or ""])
    pdf_bytes = generate_table_pdf("Student List", headers, rows)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="students.pdf"'})


# ── Excel exports ─────────────────────────────────────────────────────────────

@router.get("/excel/results")
def excel_results(
    term: Optional[str] = None,
    session_: Optional[str] = Query(None, alias="session"),
    class_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    results = _load(db, "results")
    if term: results = [r for r in results if r.get("term") == term]
    if session_: results = [r for r in results if r.get("session") == session_]
    if class_name: results = [r for r in results if r.get("class_name") == class_name]
    xlsx = generate_results_excel(results, term or "All Terms", session_ or "All Sessions")
    return Response(content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="results.xlsx"'})


@router.get("/excel/students")
def excel_students(db: Session = Depends(get_db)):
    from app.models.user import User as UserModel
    import json as _json
    users = db.query(UserModel).filter(UserModel.role == "student").all()
    data = []
    for u in users:
        extra = _json.loads(u.preferences) if u.preferences else {}
        data.append({"admission_number": u.username, "first_name": u.full_name.split()[0] if u.full_name else "",
                      "last_name": " ".join(u.full_name.split()[1:]) if u.full_name else "",
                      "class_name": extra.get("class_name",""), "gender": extra.get("gender",""),
                      "email": u.email or "", "phone": u.phone or "", "enrollment_status": "active" if u.is_active else "inactive"})
    xlsx = generate_students_excel(data)
    return Response(content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="students.xlsx"'})


@router.get("/excel/payments")
def excel_payments(db: Session = Depends(get_db)):
    payments = _load(db, "payments")
    xlsx = generate_payments_excel(payments)
    return Response(content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="payments.xlsx"'})


@router.get("/excel/attendance")
def excel_attendance(date: Optional[str] = None, class_name: Optional[str] = None,
                     db: Session = Depends(get_db)):
    records = _load(db, "attendance_records")
    if date: records = [r for r in records if r.get("date") == date]
    if class_name: records = [r for r in records if r.get("class_name") == class_name]
    xlsx = generate_attendance_excel(records, date or "")
    return Response(content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="attendance.xlsx"'})


@router.get("/excel/payroll")
def excel_payroll(month: Optional[str] = None, year: Optional[str] = None,
                  db: Session = Depends(get_db)):
    payroll = _load(db, "payroll")
    if month: payroll = [p for p in payroll if p.get("month") == month]
    if year:  payroll = [p for p in payroll if p.get("year") == str(year)]
    xlsx = generate_payroll_excel(payroll)
    return Response(content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="payroll.xlsx"'})


# ── CSV export (lightweight alternative) ─────────────────────────────────────

@router.get("/csv/results")
def csv_results(term: Optional[str] = None, db: Session = Depends(get_db)):
    results = _load(db, "results")
    if term: results = [r for r in results if r.get("term") == term]
    lines = ["Student Name,Class,Subject,CA,Exam,Total,Grade,Remark,Term,Session"]
    for r in results:
        lines.append(f"{r.get('student_name','')},{r.get('class_name','')},{r.get('subject','')},"
                     f"{r.get('ca_score','')},{r.get('exam_score','')},{r.get('total','')},{r.get('grade','')},"
                     f"{r.get('remark','')},{r.get('term','')},{r.get('session','')}")
    return Response(content="\n".join(lines), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="results.csv"'})


@router.get("/csv/payments")
def csv_payments(db: Session = Depends(get_db)):
    payments = _load(db, "payments")
    lines = ["Receipt No,Student Name,Type,Method,Amount,Date,Status"]
    for p in payments:
        lines.append(f"{p.get('receipt_number','')},{p.get('student_name','')},{p.get('type','')},"
                     f"{p.get('method','')},{p.get('amount','')},{p.get('payment_date','')},{p.get('status','')}")
    return Response(content="\n".join(lines), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="payments.csv"'})
