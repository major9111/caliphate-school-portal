"""FUGUSAU Portal — Students Serializers (fixed)

Changes:
  - FacultySerializer: added dean_name read-only field
  - DepartmentSerializer: added student_count, lecturer_count, course_count
    (used by AdminDepartmentsPage to show stats per department)
"""
from rest_framework import serializers
from .models import Faculty, Department, Specialization, StudentProfile, LecturerProfile, ParentProfile


class FacultySerializer(serializers.ModelSerializer):
    dean_name        = serializers.SerializerMethodField()
    department_count = serializers.SerializerMethodField()

    class Meta:
        model  = Faculty
        fields = ['id', 'name', 'code', 'numeric_id', 'dean', 'dean_name', 'department_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_dean_name(self, obj):
        return obj.dean.get_full_name() if obj.dean else None

    def get_department_count(self, obj):
        return obj.departments.count()


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name    = serializers.CharField(source='faculty.name', read_only=True)
    student_count   = serializers.SerializerMethodField()
    lecturer_count  = serializers.SerializerMethodField()
    course_count    = serializers.SerializerMethodField()
    hod_name        = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = [
            'id', 'faculty', 'faculty_name', 'name', 'code', 'numeric_id', 'hod', 'hod_name',
            'student_count', 'lecturer_count', 'course_count',
        ]
        read_only_fields = ['id']

    def get_student_count(self, obj):
        return obj.students.count()

    def get_lecturer_count(self, obj):
        return obj.lecturer_profiles.count() if hasattr(obj, 'lecturer_profiles') else 0

    def get_course_count(self, obj):
        return obj.courses.count() if hasattr(obj, 'courses') else 0

    def get_hod_name(self, obj):
        return obj.hod.get_full_name() if obj.hod else None


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Specialization
        fields = ['id', 'department', 'name', 'description', 'min_entry_requirements']
        read_only_fields = ['id']


class StudentProfileSerializer(serializers.ModelSerializer):
    full_name       = serializers.CharField(source='user.get_full_name', read_only=True)
    email           = serializers.EmailField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    profile_photo   = serializers.ImageField(source='user.profile_photo', read_only=True)

    class Meta:
        model  = StudentProfile
        fields = [
            'id', 'matric_number', 'full_name', 'email', 'profile_photo',
            'department', 'department_name', 'specialization', 'level',
            'admission_year', 'admission_session', 'status',
            'cgpa', 'total_credit_units_earned',
            'jamb_score', 'jamb_reg_number',
            'state_of_origin', 'lga_of_origin', 'home_address',
            'next_of_kin', 'next_of_kin_phone', 'next_of_kin_relationship',
            'blood_group', 'genotype', 'medical_conditions', 'emergency_contact',
            'reg_year', 'reg_entry_level', 'reg_faculty_id', 'reg_dept_id', 'reg_sequence',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'matric_number', 'cgpa', 'total_credit_units_earned',
            'reg_year', 'reg_entry_level', 'reg_faculty_id', 'reg_dept_id', 'reg_sequence',
            'created_at', 'updated_at',
        ]


class StudentProfileUpdateSerializer(serializers.ModelSerializer):
    """Restricted update — students can only update personal/medical data."""
    class Meta:
        model  = StudentProfile
        fields = [
            'home_address', 'next_of_kin', 'next_of_kin_phone',
            'next_of_kin_relationship', 'blood_group', 'genotype',
            'medical_conditions', 'emergency_contact',
        ]


class LecturerProfileSerializer(serializers.ModelSerializer):
    full_name       = serializers.CharField(source='user.get_full_name', read_only=True)
    email           = serializers.EmailField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model  = LecturerProfile
        fields = [
            'id', 'staff_id', 'full_name', 'email',
            'department', 'department_name', 'title',
            'qualification', 'specialization_area',
        ]
        read_only_fields = ['id', 'staff_id']


class ParentProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model  = ParentProfile
        fields = ['id', 'full_name', 'wards', 'relationship', 'occupation', 'address']
        read_only_fields = ['id']
