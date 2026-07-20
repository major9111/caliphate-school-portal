"""PDF generation service using ReportLab.

Generates: fee receipts, student report cards, payslips, admission letters,
           library cards, and generic export tables.
"""
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from app.core.config import settings

# Brand colours
PRIMARY   = HexColor("#1e40af")
PRIMARY_L = HexColor("#dbeafe")
ACCENT    = HexColor("#f59e0b")
GREY_L    = HexColor("#f3f4f6")
GREY_D    = HexColor("#374151")
GREEN     = HexColor("#10b981")
RED       = HexColor("#ef4444")

styles = getSampleStyleSheet()

def _school_header(story: list, subtitle: str = ""):
    """Adds school logo / name header block to a story."""
    header_style = ParagraphStyle("H", fontName="Helvetica-Bold", fontSize=16,
                                   textColor=PRIMARY, alignment=TA_CENTER)
    sub_style = ParagraphStyle("HS", fontName="Helvetica", fontSize=10,
                                textColor=GREY_D, alignment=TA_CENTER)
    addr_style = ParagraphStyle("HA", fontName="Helvetica", fontSize=8,
                                 textColor=GREY_D, alignment=TA_CENTER)

    story.append(Paragraph(settings.SCHOOL_NAME, header_style))
    story.append(Paragraph(settings.SCHOOL_ADDRESS, addr_style))
    story.append(Paragraph(f"{settings.SCHOOL_PHONE}  |  {settings.SCHOOL_EMAIL}", addr_style))
    if subtitle:
        story.append(Spacer(1, 6))
        story.append(Paragraph(subtitle, sub_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY))
    story.append(Spacer(1, 10))


def _grade_color(grade: str):
    if grade in ("A",):         return GREEN
    if grade in ("B", "C"):     return PRIMARY
    if grade in ("D", "E"):     return ACCENT
    return RED


# ── Fee Receipt ───────────────────────────────────────────────────────────────

def generate_fee_receipt(payment: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm,
                             leftMargin=2*cm, rightMargin=2*cm)
    story: list = []
    _school_header(story, "FEE PAYMENT RECEIPT")

    lbl = ParagraphStyle("lbl", fontName="Helvetica-Bold", fontSize=10)
    val = ParagraphStyle("val", fontName="Helvetica", fontSize=10)
    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=14,
                          textColor=GREEN, alignment=TA_CENTER)

    meta = [
        ["Receipt No:", payment.get("receipt_number", "N/A"), "Date:", payment.get("payment_date", "N/A")],
        ["Student:", payment.get("student_name", ""), "Class:", payment.get("class_name", "N/A")],
        ["Payment Type:", payment.get("type", "").title(), "Method:", payment.get("method", "").title()],
        ["Term:", payment.get("term", "N/A"), "Session:", payment.get("session", "N/A")],
    ]
    t = Table(meta, colWidths=[3.5*cm, 6.5*cm, 2.5*cm, 5.5*cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [GREY_L, white]),
        ("GRID", (0,0), (-1,-1), 0.3, HexColor("#e5e7eb")),
        ("PADDING", (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))

    story.append(Paragraph(f"Amount Paid: ₦{float(payment.get('amount', 0)):,.2f}", big))
    story.append(Spacer(1, 30))

    story.append(HRFlowable(width="40%", thickness=1, color=GREY_D))
    story.append(Paragraph("Authorised Signature / Bursar Stamp", ParagraphStyle(
        "sig", fontName="Helvetica", fontSize=8, textColor=GREY_D, alignment=TA_CENTER)))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"This receipt was generated on {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M')} UTC. "
        "Please keep it for your records.",
        ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=7, textColor=GREY_D, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()


# ── Report Card ───────────────────────────────────────────────────────────────

def generate_report_card(student: Dict[str, Any], results: List[Dict[str, Any]],
                         term: str, session: str, position: Optional[int] = None,
                         total_students: Optional[int] = None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm,
                             leftMargin=2*cm, rightMargin=2*cm)
    story: list = []
    _school_header(story, f"STUDENT REPORT CARD — {term.upper()}, {session}")

    bold = ParagraphStyle("bold", fontName="Helvetica-Bold", fontSize=10)
    normal = ParagraphStyle("norm", fontName="Helvetica", fontSize=10)

    # Student info block
    info_data = [
        ["Name:", student.get("full_name", ""), "Admission No:", student.get("admission_number", "")],
        ["Class:", student.get("class_name", ""), "Gender:", student.get("gender", "").title()],
        ["Term:", term, "Session:", session],
    ]
    info_t = Table(info_data, colWidths=[3.5*cm, 6*cm, 3.5*cm, 5*cm])
    info_t.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [GREY_L, white]),
        ("GRID", (0,0), (-1,-1), 0.3, HexColor("#e5e7eb")),
        ("PADDING", (0,0), (-1,-1), 5),
    ]))
    story.append(info_t)
    story.append(Spacer(1, 14))

    # Results table
    story.append(Paragraph("Academic Performance", ParagraphStyle(
        "sh", fontName="Helvetica-Bold", fontSize=11, textColor=PRIMARY)))
    story.append(Spacer(1, 6))

    headers = ["#", "Subject", "CA (40)", "Exam (60)", "Total (100)", "Grade", "Remark"]
    table_data = [headers]
    total_score = 0
    for i, r in enumerate(results, 1):
        total = float(r.get("total", 0))
        total_score += total
        table_data.append([
            str(i), r.get("subject", ""), str(r.get("ca_score", "")),
            str(r.get("exam_score", "")), f"{total:.0f}",
            r.get("grade", ""), r.get("remark", "")
        ])

    if results:
        avg = total_score / len(results)
        avg_grade, avg_remark = ("A","Excellent") if avg>=70 else ("B","Very Good") if avg>=60 else ("C","Good") if avg>=50 else ("D","Pass") if avg>=45 else ("F","Fail")
        table_data.append(["", "AVERAGE", "", "", f"{avg:.1f}", avg_grade, avg_remark])

    col_widths = [1*cm, 5.5*cm, 2*cm, 2.3*cm, 2.5*cm, 1.8*cm, 3.4*cm]
    rt = Table(table_data, colWidths=col_widths, repeatRows=1)

    ts = TableStyle([
        ("BACKGROUND", (0,0), (-1,0), PRIMARY),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-2), [white, GREY_L]),
        ("BACKGROUND", (0,-1), (-1,-1), PRIMARY_L),
        ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
        ("GRID", (0,0), (-1,-1), 0.3, HexColor("#d1d5db")),
        ("PADDING", (0,0), (-1,-1), 4),
        ("ALIGN", (2,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ])
    # Colour grade cells
    for row_i, row in enumerate(table_data[1:], 1):
        if len(row) >= 6 and row[5]:
            color = _grade_color(row[5])
            ts.add("TEXTCOLOR", (5, row_i), (5, row_i), color)
            ts.add("FONTNAME", (5, row_i), (5, row_i), "Helvetica-Bold")
    rt.setStyle(ts)
    story.append(rt)
    story.append(Spacer(1, 14))

    # Summary box
    if results:
        summary_data = [
            ["Total Score:", f"{total_score:.0f}", "Average:", f"{avg:.1f}%"],
            ["No. of Subjects:", str(len(results)), "Overall Grade:", avg_grade],
        ]
        if position and total_students:
            summary_data.append(["Class Position:", f"{position}", "Out of:", str(total_students)])
        st = Table(summary_data, colWidths=[3.5*cm, 4*cm, 3.5*cm, 7*cm])
        st.setStyle(TableStyle([
            ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
            ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 9),
            ("BACKGROUND", (0,0), (-1,-1), PRIMARY_L),
            ("GRID", (0,0), (-1,-1), 0.3, HexColor("#bfdbfe")),
            ("PADDING", (0,0), (-1,-1), 5),
        ]))
        story.append(st)
        story.append(Spacer(1, 14))

    # Grading key
    story.append(Paragraph("Grading Scale", ParagraphStyle("gs", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_D)))
    grade_key = [["A: 70-100 (Excellent)", "B: 60-69 (Very Good)", "C: 50-59 (Good)", "D: 45-49 (Pass)", "F: 0-44 (Fail)"]]
    gkt = Table(grade_key, colWidths=[3.6*cm]*5)
    gkt.setStyle(TableStyle([("FONTSIZE", (0,0), (-1,-1), 7), ("ALIGN", (0,0), (-1,-1), "CENTER"),
                               ("TEXTCOLOR", (0,0), (-1,-1), GREY_D), ("PADDING", (0,0), (-1,-1), 2)]))
    story.append(gkt)
    story.append(Spacer(1, 20))

    # Signatures
    sig_data = [["Class Teacher:", "_____________________", "Head Teacher:", "_____________________"],
                ["Date:", "_____________________", "School Stamp:", ""]]
    sigt = Table(sig_data, colWidths=[3*cm, 6*cm, 3*cm, 6*cm])
    sigt.setStyle(TableStyle([("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
                                ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
                                ("FONTSIZE", (0,0), (-1,-1), 9),
                                ("PADDING", (0,0), (-1,-1), 5)]))
    story.append(sigt)

    doc.build(story)
    return buf.getvalue()


# ── Payslip ───────────────────────────────────────────────────────────────────

def generate_payslip(payroll: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm,
                             leftMargin=2*cm, rightMargin=2*cm)
    story: list = []
    _school_header(story, "EMPLOYEE PAYSLIP")

    info_data = [
        ["Employee Name:", payroll.get("employee_name", ""), "Employee ID:", payroll.get("employee_id", "")],
        ["Role:", payroll.get("role", "").title(), "Period:", f"{payroll.get('month','')} {payroll.get('year','')}"],
        ["Status:", payroll.get("status", "").title(), "Payment Date:", payroll.get("payment_date", "N/A")],
    ]
    it = Table(info_data, colWidths=[3.5*cm, 6*cm, 3.5*cm, 5*cm])
    it.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [GREY_L, white]),
        ("GRID", (0,0), (-1,-1), 0.3, HexColor("#e5e7eb")),
        ("PADDING", (0,0), (-1,-1), 5),
    ]))
    story.append(it)
    story.append(Spacer(1, 14))

    basic     = float(payroll.get("basic_salary", 0))
    allow     = float(payroll.get("allowances", 0))
    deductions= float(payroll.get("deductions", 0))
    gross     = basic + allow
    net       = gross - deductions

    earn_data = [
        ["EARNINGS", "Amount (₦)"],
        ["Basic Salary", f"{basic:,.2f}"],
        ["Allowances", f"{allow:,.2f}"],
        ["Gross Salary", f"{gross:,.2f}"],
    ]
    ded_data = [
        ["DEDUCTIONS", "Amount (₦)"],
        ["Total Deductions", f"{deductions:,.2f}"],
        ["", ""],
        ["NET PAY", f"{net:,.2f}"],
    ]

    combined = Table([[Table(earn_data, colWidths=[7*cm, 4*cm]), Table(ded_data, colWidths=[7*cm, 4*cm])]],
                     colWidths=[9*cm, 9*cm])
    combined.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("PADDING", (0,0), (-1,-1), 5)]))

    for sub in [earn_data, ded_data]:
        pass  # styled inline

    story.append(combined)
    story.append(Spacer(1, 20))

    net_style = ParagraphStyle("net", fontName="Helvetica-Bold", fontSize=16,
                                textColor=GREEN, alignment=TA_CENTER)
    story.append(Paragraph(f"NET PAY: ₦{net:,.2f}", net_style))
    story.append(Spacer(1, 30))

    sig_data = [["Employee Signature:", "_____________________", "Authorised By:", "_____________________"]]
    sigt = Table(sig_data, colWidths=[4*cm, 6*cm, 4*cm, 4*cm])
    sigt.setStyle(TableStyle([("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
                                ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
                                ("FONTSIZE", (0,0), (-1,-1), 9),
                                ("PADDING", (0,0), (-1,-1), 5)]))
    story.append(sigt)
    doc.build(story)
    return buf.getvalue()


# ── Admission Letter ──────────────────────────────────────────────────────────

def generate_admission_letter(admission: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm,
                             leftMargin=2.5*cm, rightMargin=2.5*cm)
    story: list = []
    _school_header(story, "OFFER OF ADMISSION")

    body = ParagraphStyle("body", fontName="Helvetica", fontSize=11, leading=18)
    bold = ParagraphStyle("bold", fontName="Helvetica-Bold", fontSize=11, leading=18)
    date_str = datetime.now(timezone.utc).strftime("%d %B %Y")

    story.append(Paragraph(date_str, ParagraphStyle("r", fontName="Helvetica", fontSize=10, alignment=TA_RIGHT)))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Dear {admission.get('parent_name', 'Parent/Guardian')},", body))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<b>RE: OFFER OF ADMISSION — {admission.get('applicant_name','').upper()}</b>", body))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"We are delighted to inform you that following the assessment of the application "
        f"(Reference: <b>{admission.get('application_number','')}</b>), "
        f"<b>{admission.get('applicant_name','')}</b> has been offered admission into "
        f"<b>{settings.SCHOOL_NAME}</b> for the academic session.", body))
    story.append(Spacer(1, 10))

    details = [
        ["Applicant Name:", admission.get("applicant_name", "")],
        ["Class Admitted:", admission.get("class_applying", "")],
        ["Application Number:", admission.get("application_number", "")],
        ["Session:", "2025/2026"],
    ]
    dt = Table(details, colWidths=[5*cm, 12*cm])
    dt.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 10),
        ("BACKGROUND", (0,0), (-1,-1), PRIMARY_L),
        ("GRID", (0,0), (-1,-1), 0.3, HexColor("#bfdbfe")),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(dt)
    story.append(Spacer(1, 14))
    story.append(Paragraph("This offer is conditional on the following:", bold))
    conditions = [
        "1. Payment of the acceptance fee within 14 days of this letter.",
        "2. Submission of original copies of all required documents.",
        "3. Satisfactory medical report from a registered physician.",
        "4. Compliance with the school's rules and regulations.",
    ]
    for c in conditions:
        story.append(Paragraph(c, body))
    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "We look forward to welcoming your ward into our school community. "
        "Please visit the school office to complete the enrolment formalities.", body))
    story.append(Spacer(1, 30))
    story.append(Paragraph("Yours faithfully,", body))
    story.append(Spacer(1, 40))
    story.append(Paragraph("_____________________________", body))
    story.append(Paragraph("The Principal", bold))
    story.append(Paragraph(settings.SCHOOL_NAME, ParagraphStyle("sc", fontName="Helvetica", fontSize=9)))

    doc.build(story)
    return buf.getvalue()


# ── Generic table export ──────────────────────────────────────────────────────

def generate_table_pdf(title: str, headers: List[str], rows: List[List[str]]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm,
                             leftMargin=1.5*cm, rightMargin=1.5*cm)
    story: list = []
    _school_header(story, title.upper())

    col_width = (A4[0] - 3*cm) / max(len(headers), 1)
    data = [headers] + rows
    t = Table(data, colWidths=[col_width]*len(headers), repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), PRIMARY),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GREY_L]),
        ("GRID", (0,0), (-1,-1), 0.3, HexColor("#d1d5db")),
        ("PADDING", (0,0), (-1,-1), 4),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M')} UTC | Total records: {len(rows)}",
        ParagraphStyle("foot", fontName="Helvetica-Oblique", fontSize=7, textColor=GREY_D)
    ))
    doc.build(story)
    return buf.getvalue()
