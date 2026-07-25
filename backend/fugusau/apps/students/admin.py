"""FUGUSAU Portal — Students Admin"""
from django.contrib import admin
from .models import Faculty, Department, Specialization, StudentProfile, LecturerProfile, ParentProfile

@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'dean']
    search_fields = ['name', 'code']

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'faculty', 'hod']
    list_filter = ['faculty']
    search_fields = ['name', 'code']

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ['matric_number', 'user', 'department', 'level', 'status', 'cgpa']
    list_filter = ['department', 'level', 'status', 'admission_year']
    search_fields = ['matric_number', 'user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['cgpa', 'total_credit_units_earned']

@admin.register(LecturerProfile)
class LecturerProfileAdmin(admin.ModelAdmin):
    list_display = ['staff_id', 'user', 'department', 'title']
    list_filter = ['department']
    search_fields = ['staff_id', 'user__first_name', 'user__last_name']
