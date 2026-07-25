"""FUGUSAU Portal — Students Views (fixed)

Added SpecializationListView which was imported in api.ts as
GET /students/specializations/ but was never registered in urls.py.

All other views preserved exactly as-is.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Avg
from django.contrib.auth import get_user_model

from fugusau.apps.permissions import IsAdmin, IsAdminOrLecturer, IsOwnerOrAdmin
from .models import Faculty, Department, Specialization, StudentProfile, LecturerProfile
from .serializers import (
    FacultySerializer, DepartmentSerializer, SpecializationSerializer,
    StudentProfileSerializer, StudentProfileUpdateSerializer, LecturerProfileSerializer,
)

User = get_user_model()


# ─── Faculty / Department / Specialization ─────────────────────────────────

class FacultyListView(generics.ListCreateAPIView):
    """GET /api/v1/students/faculties/"""
    queryset = Faculty.objects.all().order_by('name')
    serializer_class = FacultySerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class DepartmentListView(generics.ListCreateAPIView):
    """GET /api/v1/students/departments/ — filterable by ?faculty=<uuid>. Public GET (needed by the admission form); writes remain admin-only."""
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = Department.objects.select_related('faculty').all()
        faculty_id = self.request.query_params.get('faculty')
        if faculty_id:
            qs = qs.filter(faculty__id=faculty_id)
        return qs.order_by('name')


class SpecializationListView(generics.ListAPIView):
    """
    GET /api/v1/students/specializations/
    Optional filter: ?department=<uuid>
    """
    serializer_class = SpecializationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Specialization.objects.select_related('department').all()
        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department__id=dept_id)
        return qs.order_by('name')


# ─── Students ──────────────────────────────────────────────────────────────

class StudentProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/students/profile/"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return StudentProfileUpdateSerializer
        return StudentProfileSerializer

    def get_object(self):
        return get_object_or_404(StudentProfile, user=self.request.user)


class StudentDetailView(generics.RetrieveAPIView):
    """GET /api/v1/students/<matric>/ — admin/lecturer only"""
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAdminOrLecturer]
    lookup_field = 'matric_number'

    def get_queryset(self):
        return StudentProfile.objects.select_related('user', 'department').all()


class StudentListView(generics.ListAPIView):
    """GET /api/v1/students/ — admin/lecturer only"""
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAdminOrLecturer]
    filterset_fields = ['department', 'level', 'status', 'admission_year']
    search_fields = ['matric_number', 'user__first_name', 'user__last_name', 'user__email']

    def get_queryset(self):
        return StudentProfile.objects.select_related('user', 'department').order_by('matric_number')


# ─── Lecturers ─────────────────────────────────────────────────────────────

class LecturerProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/students/lecturer-profile/"""
    serializer_class = LecturerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(LecturerProfile, user=self.request.user)


class LecturerListView(generics.ListAPIView):
    """GET /api/v1/students/lecturers/ — admin only"""
    serializer_class = LecturerProfileSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['department']
    search_fields = ['user__first_name', 'user__last_name', 'staff_id']

    def get_queryset(self):
        return LecturerProfile.objects.select_related('user', 'department').order_by('staff_id')


# ─── Clearance ─────────────────────────────────────────────────────────────

class SemesterClearanceView(APIView):
    """
    GET /api/v1/students/clearance/
    Multi-gate semester clearance check.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            student = request.user.student_profile
        except Exception:
            return Response({'error': 'Student profile not found.'}, status=400)

        from fugusau.apps.courses.models import AcademicSession
        from fugusau.apps.fees.models import Invoice
        from fugusau.apps.library.models import BorrowRecord
        from fugusau.apps.hostel.models import HostelAllocation

        session = AcademicSession.objects.filter(is_current=True).first()

        overdue_invoices = Invoice.objects.filter(
            student=student,
            status__in=['overdue', 'pending', 'partial'],
        ).count()
        fees_cleared = overdue_invoices == 0

        unreturned = BorrowRecord.objects.filter(
            borrower=request.user,
            status__in=['borrowed', 'overdue'],
        ).count()
        library_cleared = unreturned == 0

        hostel_alloc = HostelAllocation.objects.filter(
            student=student, session=session
        ).first() if session else None

        if hostel_alloc:
            hostel_cleared = hostel_alloc.status in ('approved', 'vacated')
        else:
            hostel_cleared = True

        all_cleared = fees_cleared and library_cleared and hostel_cleared

        return Response({
            'student': student.matric_number,
            'session': session.name if session else None,
            'overall_status': 'CLEARED' if all_cleared else 'NOT CLEARED',
            'gates': {
                'fees_paid': {
                    'cleared': fees_cleared,
                    'detail': 'All fees paid.' if fees_cleared
                              else f'{overdue_invoices} outstanding invoice(s).',
                },
                'library_clear': {
                    'cleared': library_cleared,
                    'detail': 'No overdue books.' if library_cleared
                              else f'{unreturned} unreturned book(s).',
                },
                'hostel_vacated': {
                    'cleared': hostel_cleared,
                    'detail': 'Hostel obligation met.' if hostel_cleared
                              else 'Hostel not cleared. Contact hostel office.',
                },
            },
            'exam_eligible': all_cleared,
        })


# ─── Admin Stats ──────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    """GET /api/v1/students/admin/stats/"""
    permission_classes = [IsAdmin]

    def get(self, request):
        from fugusau.apps.courses.models import Enrollment, AcademicSession
        from fugusau.apps.fees.models import Invoice
        from fugusau.apps.security.models import SecurityEvent, BlockedIP

        session = AcademicSession.objects.filter(is_current=True).first()

        user_counts = User.objects.values('role').annotate(count=Count('id'))
        users_by_role = {row['role']: row['count'] for row in user_counts}

        student_qs = StudentProfile.objects.filter(status='active')
        total_students = student_qs.count()
        avg_cgpa = student_qs.aggregate(avg=Avg('cgpa'))['avg'] or 0
        students_by_dept = list(
            student_qs
            .values('department__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        enrollment_count = 0
        if session:
            enrollment_count = Enrollment.objects.filter(
                session=session, status='registered'
            ).count()

        invoices = Invoice.objects.all()
        fee_stats = {
            'total_invoices': invoices.count(),
            'paid': invoices.filter(status='paid').count(),
            'pending': invoices.filter(status='pending').count(),
            'overdue': invoices.filter(status='overdue').count(),
        }

        security_stats = {
            'open_events': SecurityEvent.objects.filter(status='open').count(),
            'active_blocks': BlockedIP.objects.filter(is_active=True).count(),
            'critical_events_24h': SecurityEvent.objects.filter(
                threat_level='critical',
                timestamp__gte=timezone.now() - timedelta(hours=24),
            ).count(),
        }

        return Response({
            'session': session.name if session else None,
            'users': {
                'total': sum(users_by_role.values()),
                'by_role': users_by_role,
            },
            'students': {
                'active': total_students,
                'average_cgpa': round(float(avg_cgpa), 2),
                'by_department': students_by_dept,
            },
            'enrollments': {'current_session': enrollment_count},
            'fees': fee_stats,
            'security': security_stats,
        })


# ─── Faculty / Department Detail Views (PATCH + DELETE) ───────────────────
# These are MISSING from the original codebase.
# Required for Edit and Delete buttons in AdminDepartmentsPage.

class FacultyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/students/faculties/<uuid>/"""
    serializer_class = FacultySerializer
    queryset = Faculty.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/students/departments/<uuid>/"""
    serializer_class = DepartmentSerializer
    queryset = Department.objects.select_related('faculty').all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


# ─── Admin Create Student ─────────────────────────────────────────────────

class AdminCreateStudentView(APIView):
    """
    POST /api/v1/students/admin/create/
    Admin creates a new student: User account + StudentProfile in one shot.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        import random, string
        from datetime import date

        data = request.data
        email      = data.get('email', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name  = data.get('last_name', '').strip()
        matric     = data.get('matric_number', '').strip()

        # Validate required
        errors = {}
        if not email:      errors['email']         = ['Email is required.']
        if not first_name: errors['first_name']    = ['First name is required.']
        if not last_name:  errors['last_name']     = ['Last name is required.']
        if User.objects.filter(email=email).exists():
            errors['email'] = ['A user with this email already exists.']
        if matric and StudentProfile.objects.filter(matric_number=matric).exists():
            errors['matric_number'] = ['A student with this matric number already exists.']
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Generate password if not provided
        password = data.get('password', '') or ''.join(random.choices(string.ascii_letters + string.digits, k=10))

        # Create User
        user = User.objects.create_user(
            email      = email,
            first_name = first_name,
            last_name  = last_name,
            phone      = data.get('phone', ''),
            role       = User.STUDENT,
            password   = password,
            gender     = data.get('gender', 'male'),
            is_verified= True,
        )

        # Resolve department
        dept = None
        dept_id = data.get('department')
        if dept_id:
            try:
                dept = Department.objects.get(pk=dept_id)
            except (Department.DoesNotExist, Exception):
                pass

        admission_year = date.today().year
        admission_session = data.get('admission_session', f'{admission_year}/{admission_year+1}')

        # Create StudentProfile - matric_number generated automatically if not provided
        profile_data = {
            'user':              user,
            'department':        dept,
            'level':             int(data.get('level', 100)),
            'admission_year':    admission_year,
            'admission_session': admission_session,
            'status':            data.get('status', 'active'),
            'state_of_origin':   data.get('state_of_origin', ''),
        }
        if matric:
            profile_data['matric_number'] = matric

        profile = StudentProfile.objects.create(**profile_data)

        return Response({
            'id':             str(user.id),
            'email':          user.email,
            'full_name':      user.get_full_name(),
            'matric_number':  profile.matric_number,
            'level':          profile.level,
            'status':         profile.status,
            'temp_password':  password if not data.get('password') else None,
            'message':        'Student account created successfully.',
        }, status=status.HTTP_201_CREATED)


# ─── Admin Create Lecturer/Staff ──────────────────────────────────────────

class AdminCreateLecturerView(APIView):
    """
    POST /api/v1/students/admin/create-staff/
    Admin creates a new lecturer/staff account.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        import random, string

        data = request.data
        email      = data.get('email', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name  = data.get('last_name', '').strip()

        errors = {}
        if not email:      errors['email']      = ['Email is required.']
        if not first_name: errors['first_name'] = ['First name is required.']
        if not last_name:  errors['last_name']  = ['Last name is required.']
        if User.objects.filter(email=email).exists():
            errors['email'] = ['A user with this email already exists.']
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        password = data.get('password', '') or ''.join(random.choices(string.ascii_letters + string.digits, k=10))

        user = User.objects.create_user(
            email      = email,
            first_name = first_name,
            last_name  = last_name,
            phone      = data.get('phone', ''),
            role       = User.LECTURER,
            password   = password,
            gender     = data.get('gender', 'male'),
            is_verified= True,
        )

        dept = None
        dept_id = data.get('department')
        if dept_id:
            try:
                dept = Department.objects.get(pk=dept_id)
            except (Department.DoesNotExist, Exception):
                pass

        # Auto-generate staff ID
        staff_id = data.get('employee_id', '') or f'FUG/STAFF/{LecturerProfile.objects.count()+1:04d}'

        profile = LecturerProfile.objects.create(
            user                = user,
            department          = dept,
            title               = data.get('rank', 'Lecturer'),
            specialization_area = data.get('specialization', ''),
            staff_id            = staff_id,
        )

        return Response({
            'id':           str(user.id),
            'email':        user.email,
            'full_name':    user.get_full_name(),
            'staff_id':     profile.staff_id,
            'rank':         profile.title,
            'temp_password': password if not data.get('password') else None,
            'message':      'Staff account created successfully.',
        }, status=status.HTTP_201_CREATED)


# ─── Admin Delete User ────────────────────────────────────────────────────

class AdminDeleteUserView(APIView):
    """DELETE /api/v1/students/admin/delete/<uuid>/"""
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response({'error': 'Cannot delete your own account.'}, status=400)
        user.delete()
        return Response({'message': 'User deleted.'}, status=status.HTTP_204_NO_CONTENT)
