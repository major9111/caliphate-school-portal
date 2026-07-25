"""FUGUSAU Portal — Reports Views"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from fugusau.apps.permissions import IsAdmin, IsAdminOrLecturer, IsStudent
from fugusau.apps.students.models import StudentProfile, Department
from fugusau.apps.exams.models import Result
from fugusau.apps.fees.models import Invoice, Payment
from fugusau.apps.courses.models import AcademicSession, Enrollment
from .services import generate_transcript_pdf, generate_fee_report


class MyTranscriptView(APIView):
    """GET /api/v1/reports/transcript/ — Student's own transcript"""
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user.student_profile
        results = Result.objects.filter(
            enrollment__student=student,
            is_senate_approved=True,
        ).select_related(
            'enrollment__course', 'enrollment__session'
        ).order_by('enrollment__session__name', 'enrollment__course__code')

        # Group by session
        transcript = {}
        for r in results:
            sess = r.enrollment.session.name
            if sess not in transcript:
                transcript[sess] = {'courses': [], 'gpa': 0, 'total_units': 0}
            transcript[sess]['courses'].append({
                'code': r.enrollment.course.code,
                'title': r.enrollment.course.title,
                'credit_units': r.enrollment.course.credit_units,
                'ca': float(r.ca_score),
                'exam': float(r.exam_score),
                'total': float(r.total_score),
                'grade': r.grade,
                'grade_point': float(r.grade_point),
            })

        # Compute session GPAs
        for sess_data in transcript.values():
            courses = sess_data['courses']
            total_units = sum(c['credit_units'] for c in courses)
            total_gp = sum(c['grade_point'] * c['credit_units'] for c in courses)
            sess_data['total_units'] = total_units
            sess_data['gpa'] = round(total_gp / total_units, 2) if total_units > 0 else 0

        return Response({
            'student': {
                'name': request.user.get_full_name(),
                'matric_number': student.matric_number,
                'department': student.department.name if student.department else '',
                'level': student.level,
                'cgpa': float(student.cgpa),
                'total_units_earned': student.total_credit_units_earned,
            },
            'transcript': transcript,
        })


class StudentTranscriptView(APIView):
    """GET /api/v1/reports/transcript/<matric>/ — Any student's transcript (admin/lecturer)"""
    permission_classes = [IsAdminOrLecturer]

    def get(self, request, matric_number):
        student = get_object_or_404(StudentProfile, matric_number=matric_number)
        results = Result.objects.filter(
            enrollment__student=student,
        ).select_related(
            'enrollment__course', 'enrollment__session'
        ).order_by('enrollment__session__name', 'enrollment__course__code')

        data = [
            {
                'session': r.enrollment.session.name,
                'semester': r.enrollment.semester,
                'code': r.enrollment.course.code,
                'title': r.enrollment.course.title,
                'credit_units': r.enrollment.course.credit_units,
                'total': float(r.total_score),
                'grade': r.grade,
                'grade_point': float(r.grade_point),
                'approved': r.is_senate_approved,
            }
            for r in results
        ]
        return Response({
            'student': {
                'name': student.user.get_full_name(),
                'matric_number': student.matric_number,
                'department': student.department.name if student.department else '',
                'cgpa': float(student.cgpa),
            },
            'results': data,
        })


class DepartmentReportView(APIView):
    """GET /api/v1/reports/department/<dept_id>/ — Department performance stats"""
    permission_classes = [IsAdminOrLecturer]

    def get(self, request, dept_id):
        dept = get_object_or_404(Department, id=dept_id)
        session = AcademicSession.objects.filter(is_current=True).first()
        students = StudentProfile.objects.filter(department=dept, status='active')

        avg_cgpa = sum(float(s.cgpa) for s in students) / len(students) if students else 0

        # Grade distribution for current session
        results = Result.objects.filter(
            enrollment__student__department=dept,
            enrollment__session=session,
            is_senate_approved=True,
        )
        grade_dist = {}
        for r in results:
            grade_dist[r.grade] = grade_dist.get(r.grade, 0) + 1

        return Response({
            'department': dept.name,
            'session': session.name if session else None,
            'total_students': students.count(),
            'average_cgpa': round(avg_cgpa, 2),
            'grade_distribution': grade_dist,
        })


class FeeCollectionReportView(APIView):
    """GET /api/v1/reports/fees/ — Fee collection summary (admin)"""
    permission_classes = [IsAdmin]

    def get(self, request):
        session_name = request.query_params.get('session')
        if session_name:
            invoices = Invoice.objects.filter(fee_types__session__name=session_name)
        else:
            invoices = Invoice.objects.filter(fee_types__session__is_current=True)

        invoices = invoices.distinct()

        total_expected = sum(i.total_amount for i in invoices)
        total_collected = sum(i.amount_paid for i in invoices)
        outstanding = total_expected - total_collected

        by_status = {}
        for inv in invoices:
            by_status[inv.status] = by_status.get(inv.status, 0) + 1

        return Response({
            'total_invoices': invoices.count(),
            'total_expected': float(total_expected),
            'total_collected': float(total_collected),
            'outstanding': float(outstanding),
            'collection_rate': round(float(total_collected / total_expected * 100), 1) if total_expected else 0,
            'by_status': by_status,
        })


class EnrollmentReportView(APIView):
    """GET /api/v1/reports/enrollments/ — Enrollment stats (admin/lecturer)"""
    permission_classes = [IsAdminOrLecturer]

    def get(self, request):
        session = AcademicSession.objects.filter(is_current=True).first()
        semester = request.query_params.get('semester', 'first')

        enrollments = Enrollment.objects.filter(
            session=session, semester=semester, status='registered'
        ).select_related('course__department', 'student__department')

        dept_breakdown = {}
        for e in enrollments:
            dept = e.student.department.name if e.student.department else 'Unknown'
            dept_breakdown[dept] = dept_breakdown.get(dept, 0) + 1

        # Convert dept_breakdown dict to array for frontend chart compatibility
        by_dept_list = [
            {'department': dept, 'count': count}
            for dept, count in sorted(dept_breakdown.items(), key=lambda x: -x[1])
        ]
        total_students = StudentProfile.objects.filter(status='active').count()
        total_departments = Department.objects.count()

        return Response({
            'session': session.name if session else None,
            'semester': semester,
            'total_enrollments': enrollments.count(),
            'total_students':    total_students,
            'total_departments': total_departments,
            'by_department':     by_dept_list,
        })
