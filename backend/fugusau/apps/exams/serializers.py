"""FUGUSAU Portal — Exams Serializers"""
from rest_framework import serializers
from .models import ExamSchedule, Result, ExamClearance


class ExamScheduleSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)

    class Meta:
        model = ExamSchedule
        fields = [
            'id', 'course', 'course_code', 'course_title',
            'session', 'session_name', 'semester',
            'exam_date', 'start_time', 'duration_minutes',
            'venue', 'instructions', 'invigilator',
        ]
        read_only_fields = ['id']


class ResultSerializer(serializers.ModelSerializer):
    course_code      = serializers.CharField(source='enrollment.course.code', read_only=True)
    course_title     = serializers.CharField(source='enrollment.course.title', read_only=True)
    credit_units     = serializers.IntegerField(source='enrollment.course.credit_units', read_only=True)
    session          = serializers.CharField(source='enrollment.session.name', read_only=True)
    semester         = serializers.CharField(source='enrollment.semester', read_only=True)
    student_name     = serializers.SerializerMethodField()
    matric_number    = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = [
            'id', 'enrollment', 'course_code', 'course_title', 'credit_units',
            'session', 'semester', 'ca_score', 'exam_score', 'total_score',
            'grade', 'grade_point', 'is_senate_approved',
            'student_name', 'matric_number',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'updated_at', 'remarks',
        ]
        read_only_fields = ['id', 'total_score', 'grade', 'grade_point', 'uploaded_at', 'updated_at']

    def get_student_name(self, obj):
        try: return obj.enrollment.student.user.get_full_name()
        except: return None

    def get_matric_number(self, obj):
        try: return obj.enrollment.student.matric_number
        except: return None

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None


class ResultUploadSerializer(serializers.ModelSerializer):
    """Used by lecturers to upload results."""
    class Meta:
        model = Result
        fields = ['enrollment', 'ca_score', 'exam_score', 'remarks']


class ExamClearanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    matric_number = serializers.CharField(source='student.matric_number', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)

    class Meta:
        model = ExamClearance
        fields = [
            'id', 'student', 'student_name', 'matric_number',
            'session', 'session_name', 'semester',
            'is_cleared', 'cleared_by', 'cleared_at', 'remarks',
        ]
        read_only_fields = ['id', 'cleared_at']
