
"""FUGUSAU Portal — Reports Services (PDF generation via WeasyPrint)"""
import io
from django.template.loader import render_to_string
from django.http import HttpResponse

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


def _build_transcript_context(student_profile):
    """Gather all transcript data into a dict suitable for a Django template."""
    from fugusau.apps.exams.models import Result

    results = Result.objects.filter(
        enrollment__student=student_profile,
        is_senate_approved=True,
    ).select_related(
        'enrollment__course', 'enrollment__session'
    ).order_by('enrollment__session__name', 'enrollment__course__code')

    sessions = {}
    for r in results:
        sess = r.enrollment.session.name
        if sess not in sessions:
            sessions[sess] = {'courses': [], 'gpa': 0, 'total_units': 0}
        sessions[sess]['courses'].append({
            'code': r.enrollment.course.code,
            'title': r.enrollment.course.title,
            'credit_units': r.enrollment.course.credit_units,
            'ca': float(r.ca_score),
            'exam': float(r.exam_score),
            'total': float(r.total_score),
            'grade': r.grade,
            'grade_point': float(r.grade_point),
        })

    for sess_data in sessions.values():
        courses = sess_data['courses']
        total_units = sum(c['credit_units'] for c in courses)
        total_gp    = sum(c['grade_point'] * c['credit_units'] for c in courses)
        sess_data['total_units'] = total_units
        sess_data['gpa'] = round(total_gp / total_units, 2) if total_units else 0.0

    return {
        'student': {
            'name': student_profile.user.get_full_name(),
            'matric_number': student_profile.matric_number,
            'department': student_profile.department.name if student_profile.department else '',
            'level': student_profile.level,
            'cgpa': float(student_profile.cgpa),
            'total_units_earned': student_profile.total_credit_units_earned,
        },
        'sessions': sessions,
        'university_name': 'Federal University Gusau (FUGUSAU)',
    }


def generate_transcript_pdf(student_profile) -> bytes:
    """
    Generate an official PDF transcript for a student.
    Returns raw PDF bytes.

    Template required: templates/reports/transcript.html
    Add WeasyPrint to requirements.txt: weasyprint==62.3

    Falls back to a plain-text bytes placeholder if WeasyPrint is not installed.
    """
    context = _build_transcript_context(student_profile)

    if not WEASYPRINT_AVAILABLE:
        # Plain-text fallback
        lines = [
            f"FUGUSAU OFFICIAL TRANSCRIPT",
            f"Student: {context['student']['name']}",
            f"Matric: {context['student']['matric_number']}",
            f"Department: {context['student']['department']}",
            f"CGPA: {context['student']['cgpa']}",
            "",
        ]
        for sess, data in context['sessions'].items():
            lines.append(f"Session: {sess}  GPA: {data['gpa']}")
            for c in data['courses']:
                lines.append(f"  {c['code']}  {c['title']}  Grade: {c['grade']}")
        return "\\n".join(lines).encode()

    html_string = render_to_string('reports/transcript.html', context)
    pdf_bytes = HTML(string=html_string, base_url='/').write_pdf()
    return pdf_bytes


def transcript_pdf_response(student_profile) -> HttpResponse:
    """Helper: return an HttpResponse with the PDF attached."""
    pdf_bytes = generate_transcript_pdf(student_profile)
    matric = student_profile.matric_number
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="transcript_{matric}.pdf"'
    return response


def generate_fee_report(session_name: str) -> bytes:
    """Generate a fee collection PDF report."""
    from fugusau.apps.fees.models import Invoice
    invoices = Invoice.objects.filter(fee_types__session__name=session_name).distinct()

    context = {
        'session_name': session_name,
        'invoices': list(invoices.values(
            'invoice_no', 'student__matric_number', 'total_amount', 'amount_paid', 'status'
        )),
        'total_expected': sum(i.total_amount for i in invoices),
        'total_collected': sum(i.amount_paid for i in invoices),
    }

    if not WEASYPRINT_AVAILABLE:
        lines = [f"Fee Report — {session_name}"]
        for inv in context['invoices']:
            lines.append(f"{inv['invoice_no']}  {inv['status']}  ₦{inv['amount_paid']}/{inv['total_amount']}")
        return "\\n".join(lines).encode()

    html_string = render_to_string('reports/fee_report.html', context)
    return HTML(string=html_string, base_url='/').write_pdf()
