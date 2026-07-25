"""FUGUSAU Portal — Exams Admin"""
from django.contrib import admin
from .models import ExamSchedule, Result, ExamClearance

@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    list_display = ['course', 'session', 'semester', 'exam_date', 'start_time', 'venue']
    list_filter = ['session', 'semester', 'exam_date']

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'total_score', 'grade', 'is_senate_approved', 'uploaded_at']
    list_filter = ['grade', 'is_senate_approved']
    readonly_fields = ['total_score', 'grade', 'grade_point', 'uploaded_at', 'updated_at']

@admin.register(ExamClearance)
class ExamClearanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'session', 'semester', 'is_cleared', 'cleared_at']
    list_filter = ['session', 'semester', 'is_cleared']
