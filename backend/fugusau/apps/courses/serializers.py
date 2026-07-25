"""FUGUSAU Portal — Courses Serializers"""
from rest_framework import serializers
from .models import AcademicSession, Course, CourseAssignment, Enrollment, Timetable, Attendance


class AcademicSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicSession
        fields = ['id', 'name', 'is_current', 'start_date', 'end_date']
        read_only_fields = ['id']


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'code', 'title', 'department', 'department_name',
            'credit_units', 'level', 'semester', 'description',
            'is_elective', 'is_active', 'enrolled_count',
        ]
        read_only_fields = ['id']

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(status='registered').count()


class CourseAssignmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    lecturer_name = serializers.SerializerMethodField()
    session_name = serializers.CharField(source='session.name', read_only=True)

    class Meta:
        model = CourseAssignment
        fields = [
            'id', 'course', 'course_code', 'course_title',
            'lecturer', 'lecturer_name', 'session', 'session_name',
            'semester', 'max_students',
        ]
        read_only_fields = ['id']

    def get_lecturer_name(self, obj):
        if obj.lecturer:
            return obj.lecturer.get_full_name()
        return None


class EnrollmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    credit_units = serializers.IntegerField(source='course.credit_units', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course', 'course_code', 'course_title',
            'credit_units', 'session', 'session_name', 'semester',
            'status', 'enrolled_at',
        ]
        read_only_fields = ['id', 'student', 'enrolled_at']


class TimetableSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='assignment.course.code', read_only=True)
    course_title = serializers.CharField(source='assignment.course.title', read_only=True)
    lecturer_name = serializers.SerializerMethodField()

    class Meta:
        model = Timetable
        fields = [
            'id', 'assignment', 'course_code', 'course_title',
            'lecturer_name', 'day', 'start_time', 'end_time', 'venue', 'week_type',
        ]
        read_only_fields = ['id']

    def get_lecturer_name(self, obj):
        if obj.assignment.lecturer:
            return obj.assignment.lecturer.get_full_name()
        return None


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'enrollment', 'date', 'status', 'marked_by', 'marked_at']
        read_only_fields = ['id', 'marked_by', 'marked_at']


class AttendanceBulkSerializer(serializers.Serializer):
    """For marking attendance for multiple students at once."""
    course_id = serializers.UUIDField()
    date = serializers.DateField()
    records = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text='[{"enrollment_id": "...", "status": "present|absent|excused"}]'
    )
