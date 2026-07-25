"""FUGUSAU Portal — Courses Views"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from fugusau.apps.permissions import IsAdmin, IsAdminOrLecturer, IsStudent
from .models import AcademicSession, Course, CourseAssignment, Enrollment, Timetable, Attendance
from .serializers import (
    AcademicSessionSerializer, CourseSerializer, CourseAssignmentSerializer,
    EnrollmentSerializer, TimetableSerializer, AttendanceSerializer, AttendanceBulkSerializer,
)


class AcademicSessionListView(generics.ListCreateAPIView):
    queryset = AcademicSession.objects.all()
    serializer_class = AcademicSessionSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class CurrentSessionView(generics.RetrieveAPIView):
    """GET /api/v1/courses/session/current/ — Active academic session"""
    serializer_class = AcademicSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(AcademicSession, is_current=True)


class CourseListView(generics.ListCreateAPIView):
    """GET /api/v1/courses/ — All courses (filterable)"""
    serializer_class = CourseSerializer
    filterset_fields = ['department', 'level', 'semester', 'is_active', 'is_elective']
    search_fields = ['code', 'title']

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Course.objects.select_related('department').filter(is_active=True)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseSerializer
    queryset = Course.objects.all()

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class CourseAssignmentListView(generics.ListCreateAPIView):
    """GET /api/v1/courses/assignments/ — Course-lecturer assignments"""
    serializer_class = CourseAssignmentSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = CourseAssignment.objects.select_related('course', 'lecturer', 'session').all()
        lecturer_id = self.request.query_params.get('lecturer')
        if lecturer_id:
            qs = qs.filter(lecturer__id=lecturer_id)
        if self.request.user.is_lecturer:
            qs = qs.filter(lecturer=self.request.user)
        return qs


class MyEnrollmentsView(generics.ListAPIView):
    """GET /api/v1/courses/my-enrollments/ — Student's enrolled courses"""
    serializer_class = EnrollmentSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Enrollment.objects.filter(
            student__user=self.request.user,
            status='registered',
        ).select_related('course', 'session').order_by('-enrolled_at')


class EnrollCourseView(APIView):
    """POST /api/v1/courses/enroll/ — Enroll student in a course"""
    permission_classes = [IsStudent]

    def post(self, request):
        course_id = request.data.get('course_id')
        semester  = request.data.get('semester')

        if not course_id:
            return Response({'error': 'course_id is required.'}, status=400)

        # Guard: ensure the user has a student profile
        student_profile = getattr(request.user, 'student_profile', None)
        if student_profile is None:
            return Response({'error': 'No student profile found for this account.'}, status=403)

        session = get_object_or_404(AcademicSession, is_current=True)
        course  = get_object_or_404(Course, id=course_id, is_active=True)

        # FIX: Derive semester from the course if the client did not send one.
        # Courses with semester='both' default to 'first'.
        if not semester:
            semester = course.semester if course.semester != Course.BOTH else Course.FIRST

        # Validate semester value
        valid_semesters = [Course.FIRST, Course.SECOND]
        if semester not in valid_semesters:
            return Response(
                {'error': f'Invalid semester "{semester}". Must be "first" or "second".'},
                status=400,
            )

        existing = Enrollment.objects.filter(
            student=student_profile, course=course,
            session=session, semester=semester
        ).first()

        if existing:
            if existing.status == 'dropped':
                existing.status = 'registered'
                existing.save()
                return Response(EnrollmentSerializer(existing).data)
            return Response({'error': 'Already enrolled in this course.'}, status=400)

        # Prerequisite check
        from fugusau.apps.courses.models import check_prerequisites
        failures = check_prerequisites(student_profile, course)
        if failures:
            return Response(
                {'error': 'Prerequisite requirements not met.', 'details': failures},
                status=400,
            )

        enrollment = Enrollment.objects.create(
            student=student_profile, course=course,
            session=session, semester=semester,
        )
        return Response(EnrollmentSerializer(enrollment).data, status=201)


class DropCourseView(APIView):
    """POST /api/v1/courses/drop/<enrollment_id>/ — Drop a registered course"""
    permission_classes = [IsStudent]

    def post(self, request, pk):
        enrollment = get_object_or_404(
            Enrollment, id=pk, student__user=request.user, status='registered'
        )
        enrollment.status = 'dropped'
        enrollment.save()
        return Response({'detail': 'Course dropped successfully.'})


class TimetableView(generics.ListAPIView):
    """GET /api/v1/courses/timetable/ — Timetable for current user"""
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        session = AcademicSession.objects.filter(is_current=True).first()
        if not session:
            return Timetable.objects.none()

        if user.is_student:
            enrolled_course_ids = Enrollment.objects.filter(
                student__user=user, session=session, status='registered'
            ).values_list('course_id', flat=True)
            return Timetable.objects.filter(
                assignment__course__in=enrolled_course_ids,
                assignment__session=session,
            ).select_related('assignment__course', 'assignment__lecturer')

        if user.is_lecturer:
            return Timetable.objects.filter(
                assignment__lecturer=user,
                assignment__session=session,
            ).select_related('assignment__course')

        return Timetable.objects.filter(assignment__session=session)


class MarkAttendanceView(APIView):
    """POST /api/v1/courses/attendance/ — Bulk mark attendance (lecturer/admin)"""
    permission_classes = [IsAdminOrLecturer]

    def post(self, request):
        serializer = AttendanceBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        created, updated = 0, 0
        for record in data['records']:
            enrollment = get_object_or_404(Enrollment, id=record['enrollment_id'])
            obj, is_new = Attendance.objects.update_or_create(
                enrollment=enrollment, date=data['date'],
                defaults={'status': record['status'], 'marked_by': request.user}
            )
            if is_new:
                created += 1
            else:
                updated += 1

        return Response({'created': created, 'updated': updated})


class AttendanceReportView(generics.ListAPIView):
    """GET /api/v1/courses/attendance/<enrollment_id>/ — Attendance for one enrollment"""
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        enrollment_id = self.kwargs.get('enrollment_id')
        return Attendance.objects.filter(enrollment__id=enrollment_id).order_by('date')


class RolloverSessionView(APIView):
    """POST /api/v1/courses/sessions/rollover/ — Trigger academic session rollover & promotion"""
    permission_classes = [IsAdmin]

    def post(self, request):
        next_session_name = request.data.get('next_session_name')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        if not all([next_session_name, start_date, end_date]):
            return Response({'error': 'next_session_name, start_date, and end_date are required.'}, status=400)

        from .tasks import rollover_academic_session

        try:
            res = rollover_academic_session.delay(next_session_name, start_date, end_date)
            return Response({
                'detail': 'Academic session rollover initiated in the background.',
                'task_id': res.id
            }, status=202)
        except Exception:
            # Fallback if Celery worker or broker is not running locally
            res_dict = rollover_academic_session(next_session_name, start_date, end_date)
            return Response({
                'detail': 'Academic session rollover completed successfully (synchronous execution).',
                'result': res_dict
            }, status=200)

