"""FUGUSAU Portal — Exams Views"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from fugusau.apps.permissions import IsAdmin, IsAdminOrLecturer, IsStudent
from .models import ExamSchedule, Result, ExamClearance
from .serializers import (
    ExamScheduleSerializer, ResultSerializer,
    ResultUploadSerializer, ExamClearanceSerializer,
)


class ExamScheduleListView(generics.ListCreateAPIView):
    """GET /api/v1/exams/schedule/ — All exam schedules for current session"""
    serializer_class = ExamScheduleSerializer

    def get_permissions(self):
        return [IsAdminOrLecturer()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = ExamSchedule.objects.select_related('course', 'session').filter(
            session__is_current=True
        )
        if user.is_student:
            from fugusau.apps.courses.models import Enrollment, AcademicSession
            session = AcademicSession.objects.filter(is_current=True).first()
            enrolled_courses = Enrollment.objects.filter(
                student__user=user, session=session, status='registered'
            ).values_list('course_id', flat=True)
            qs = qs.filter(course__in=enrolled_courses)
        semester = self.request.query_params.get('semester')
        if semester:
            qs = qs.filter(semester=semester)
        return qs.order_by('exam_date', 'start_time')


class ExamScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExamScheduleSerializer
    queryset = ExamSchedule.objects.all()

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class MyResultsView(generics.ListAPIView):
    """GET /api/v1/exams/results/ — Student's results"""
    serializer_class = ResultSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        qs = Result.objects.filter(
            enrollment__student__user=self.request.user
        ).select_related(
            'enrollment__course', 'enrollment__session'
        ).order_by('-enrollment__session__name', 'enrollment__course__code')

        session = self.request.query_params.get('session')
        if session:
            qs = qs.filter(enrollment__session__name=session)
        return qs


class UploadResultView(generics.CreateAPIView):
    """POST /api/v1/exams/results/upload/ — Upload result (lecturer/admin)"""
    serializer_class = ResultUploadSerializer
    permission_classes = [IsAdminOrLecturer]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class UpdateResultView(generics.UpdateAPIView):
    """PATCH /api/v1/exams/results/<pk>/ — Edit result before senate approval"""
    serializer_class = ResultUploadSerializer
    permission_classes = [IsAdminOrLecturer]
    queryset = Result.objects.all()

    def update(self, request, *args, **kwargs):
        result = self.get_object()
        if result.is_senate_approved:
            return Response({'error': 'Senate-approved results cannot be edited.'}, status=403)
        return super().update(request, *args, **kwargs)


class ApproveResultView(APIView):
    """POST /api/v1/exams/results/<pk>/approve/ — Senate approval (admin only)"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        result = get_object_or_404(Result, id=pk)
        result.is_senate_approved = True
        result.save(update_fields=['is_senate_approved'])
        return Response({'detail': 'Result approved by senate.'})


class ExamCardView(APIView):
    """GET /api/v1/exams/exam-card/ — Student's exam clearance card"""
    permission_classes = [IsStudent]

    def get(self, request):
        from fugusau.apps.courses.models import AcademicSession
        session = AcademicSession.objects.filter(is_current=True).first()
        if not session:
            return Response({'error': 'No active academic session.'}, status=404)

        student_profile = request.user.student_profile
        clearances = ExamClearance.objects.filter(
            student=student_profile, session=session
        )
        serializer = ExamClearanceSerializer(clearances, many=True)
        return Response({
            'student': {
                'name': request.user.get_full_name(),
                'matric_number': student_profile.matric_number,
                'department': student_profile.department.name if student_profile.department else '',
                'level': student_profile.level,
            },
            'session': session.name,
            'clearances': serializer.data,
        })


class ExamClearanceListView(generics.ListCreateAPIView):
    """GET/POST /api/v1/exams/clearances/ — Manage exam clearances (admin)"""
    serializer_class = ExamClearanceSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['session', 'semester', 'is_cleared']

    def get_queryset(self):
        return ExamClearance.objects.select_related('student__user', 'session').all()

    def perform_create(self, serializer):
        serializer.save(cleared_by=self.request.user, cleared_at=timezone.now())


class GrantClearanceView(APIView):
    """POST /api/v1/exams/clearances/<pk>/grant/ — Grant individual clearance"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        clearance = get_object_or_404(ExamClearance, id=pk)
        clearance.is_cleared = True
        clearance.cleared_by = request.user
        clearance.cleared_at = timezone.now()
        clearance.save()
        return Response({'detail': 'Clearance granted.'})

"""
Add to fugusau/apps/exams/views.py
Wire up to exams/urls.py:
    path('results/bulk-upload/', BulkGradeUploadView.as_view()),

CSV format (header row required):
matric_number,course_code,ca_score,exam_score
22/1/03/08/001,CSC301,25.5,48.0
"""
import csv
import io
from rest_framework.parsers import MultiPartParser
from fugusau.apps.permissions import IsAdminOrLecturer
from fugusau.apps.courses.models import Enrollment, AcademicSession
from fugusau.apps.students.models import StudentProfile
from fugusau.apps.courses.models import Course
from fugusau.apps.users.models import AuditLog




class AdminResultsView(generics.ListAPIView):
    """GET /api/v1/exams/results/admin/ — All results (admin/lecturer only)"""
    serializer_class   = ResultSerializer
    permission_classes = [IsAdminOrLecturer]

    def get_queryset(self):
        qs = Result.objects.select_related(
            'enrollment__course',
            'enrollment__session',
            'enrollment__student__user',
            'uploaded_by',
        ).order_by('-enrollment__session__name', 'enrollment__course__code')

        user = self.request.user
        # Lecturers only see results for courses they teach
        if hasattr(user, 'role') and user.role == 'lecturer':
            try:
                lp = user.lecturer_profile
                qs = qs.filter(enrollment__course__lecturer=lp)
            except Exception:
                pass

        session = self.request.query_params.get('session')
        search  = self.request.query_params.get('search', '')
        status  = self.request.query_params.get('status')  # approved/pending

        if session:
            qs = qs.filter(enrollment__session__name=session)
        if search:
            qs = qs.filter(
                enrollment__student__matric_number__icontains=search
            ) | qs.filter(
                enrollment__student__user__first_name__icontains=search
            ) | qs.filter(
                enrollment__course__code__icontains=search
            )
        if status == 'approved':
            qs = qs.filter(is_senate_approved=True)
        elif status == 'pending':
            qs = qs.filter(is_senate_approved=False)

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['include_student'] = True
        return ctx

class BulkGradeUploadView(APIView):
    """POST /api/v1/exams/results/bulk-upload/ — Upload a CSV of grades"""
    permission_classes = [IsAdminOrLecturer]
    parser_classes = [MultiPartParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        semester = request.data.get('semester', 'first')

        if not csv_file:
            return Response({'error': 'No file provided. Attach a CSV as "file".'}, status=400)

        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a .csv'}, status=400)

        session = AcademicSession.objects.filter(is_current=True).first()
        if not session:
            return Response({'error': 'No active academic session found.'}, status=400)

        text = csv_file.read().decode('utf-8-sig')  # handle BOM
        reader = csv.DictReader(io.StringIO(text))

        required_cols = {'matric_number', 'course_code', 'ca_score', 'exam_score'}
        if not required_cols.issubset(set(reader.fieldnames or [])):
            return Response({
                'error': f'CSV must have columns: {", ".join(required_cols)}'
            }, status=400)

        created, updated, errors = 0, 0, []

        for i, row in enumerate(reader, start=2):  # line 2 onwards (1 = header)
            matric      = row.get('matric_number', '').strip()
            course_code = row.get('course_code', '').strip()
            try:
                ca_score   = float(row.get('ca_score', 0))
                exam_score = float(row.get('exam_score', 0))
            except ValueError:
                errors.append({'row': i, 'error': 'ca_score and exam_score must be numbers'})
                continue

            if ca_score < 0 or ca_score > 40:
                errors.append({'row': i, 'error': 'ca_score must be 0-40'})
                continue
            if exam_score < 0 or exam_score > 60:
                errors.append({'row': i, 'error': 'exam_score must be 0-60'})
                continue

            try:
                student = StudentProfile.objects.get(matric_number=matric)
            except StudentProfile.DoesNotExist:
                errors.append({'row': i, 'error': f'Student {matric} not found'})
                continue

            try:
                course = Course.objects.get(code=course_code)
            except Course.DoesNotExist:
                errors.append({'row': i, 'error': f'Course {course_code} not found'})
                continue

            try:
                enrollment = Enrollment.objects.get(
                    student=student, course=course,
                    session=session, semester=semester, status='registered'
                )
            except Enrollment.DoesNotExist:
                errors.append({'row': i, 'error': f'{matric} is not enrolled in {course_code} this semester'})
                continue

            result, is_new = Result.objects.update_or_create(
                enrollment=enrollment,
                defaults={
                    'ca_score': ca_score,
                    'exam_score': exam_score,
                    'uploaded_by': request.user,
                }
            )
            if is_new:
                created += 1
            else:
                updated += 1

        AuditLog.objects.create(
            user=request.user, action='GRADE_UPLOAD',
            description=f'Bulk upload: {created} created, {updated} updated, {len(errors)} errors',
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response({
            'created': created,
            'updated': updated,
            'errors': errors,
            'total_rows_processed': created + updated + len(errors),
        })

"""
Add to fugusau/apps/exams/views.py
Wire up: path('results/senate-approve/', SenateBatchApprovalView.as_view()),
"""


class SenateBatchApprovalView(APIView):
    """
    POST /api/v1/exams/results/senate-approve/
    Batch-approve senate results for a session/semester.
    Checks for timetable clashes before approving.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        session_id = request.data.get('session_id')
        semester   = request.data.get('semester', 'first')
        course_ids = request.data.get('course_ids', [])  # Optional: limit to specific courses

        session = AcademicSession.objects.filter(
            id=session_id if session_id else None, is_current=True
        ).first()
        if not session:
            session = AcademicSession.objects.filter(is_current=True).first()
        if not session:
            return Response({'error': 'No active academic session found.'}, status=400)

        # Detect timetable clashes before approval
        clashes = _detect_timetable_clashes(session, semester)
        if clashes:
            return Response({
                'error': 'Timetable clashes detected. Resolve before senate approval.',
                'clashes': clashes,
            }, status=409)

        # Build the queryset to approve
        results_qs = Result.objects.filter(
            enrollment__session=session,
            enrollment__semester=semester,
            is_senate_approved=False,
        )
        if course_ids:
            results_qs = results_qs.filter(enrollment__course__id__in=course_ids)

        total = results_qs.count()
        if total == 0:
            return Response({'detail': 'No pending results found for approval.'})

        results_qs.update(is_senate_approved=True)

        # Trigger CGPA recomputation for affected students (async via Celery)
        from fugusau.apps.exams.tasks import recompute_cgpa_for_session
        recompute_cgpa_for_session.delay(str(session.id), semester)

        return Response({
            'approved': total,
            'session': session.name,
            'semester': semester,
            'detail': f'{total} results approved by senate.',
        })


def _detect_timetable_clashes(session, semester) -> list:
    """
    Return list of clashing exam pairs for a session+semester.
    Two exams clash if the same student is enrolled in both
    and they overlap in time on the same date.
    """
    from fugusau.apps.courses.models import Enrollment
    from collections import defaultdict
    from datetime import datetime, timedelta

    schedules = ExamSchedule.objects.filter(
        session=session, semester=semester
    ).select_related('course')

    clashes = []
    schedule_list = list(schedules)

    for i in range(len(schedule_list)):
        for j in range(i + 1, len(schedule_list)):
            s1, s2 = schedule_list[i], schedule_list[j]
            if s1.exam_date != s2.exam_date:
                continue

            # Check time overlap
            s1_end = (datetime.combine(s1.exam_date, s1.start_time) +
                      timedelta(minutes=s1.duration_minutes)).time()
            s2_end = (datetime.combine(s2.exam_date, s2.start_time) +
                      timedelta(minutes=s2.duration_minutes)).time()

            overlaps = s1.start_time < s2_end and s2.start_time < s1_end
            if not overlaps:
                continue

            # Check if any student is in both
            students1 = set(Enrollment.objects.filter(
                course=s1.course, session=session, semester=semester
            ).values_list('student_id', flat=True))
            students2 = set(Enrollment.objects.filter(
                course=s2.course, session=session, semester=semester
            ).values_list('student_id', flat=True))

            affected = students1 & students2
            if affected:
                clashes.append({
                    'course1': s1.course.code,
                    'course2': s2.course.code,
                    'date': str(s1.exam_date),
                    'time1': str(s1.start_time),
                    'time2': str(s2.start_time),
                    'affected_students': len(affected),
                })

    return clashes
