"""FUGUSAU Portal — Courses Admin"""
from django.contrib import admin
from .models import AcademicSession, Course, CourseAssignment, Enrollment, Timetable, Attendance

@admin.register(AcademicSession)
class AcademicSessionAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_current', 'start_date', 'end_date']

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'department', 'level', 'semester', 'credit_units', 'is_active']
    list_filter = ['department', 'level', 'semester', 'is_active', 'is_elective']
    search_fields = ['code', 'title']

@admin.register(CourseAssignment)
class CourseAssignmentAdmin(admin.ModelAdmin):
    list_display = ['course', 'lecturer', 'session', 'semester']
    list_filter = ['session', 'semester']

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'session', 'semester', 'status']
    list_filter = ['session', 'semester', 'status']
    search_fields = ['student__matric_number']
