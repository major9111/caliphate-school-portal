"""FUGUSAU Portal — Reports URLs"""
from django.urls import path
from .views import (
    MyTranscriptView, StudentTranscriptView,
    DepartmentReportView, FeeCollectionReportView, EnrollmentReportView,
)

urlpatterns = [
    path('transcript/',                         MyTranscriptView.as_view(),         name='my-transcript'),
    path('transcript/<str:matric_number>/',     StudentTranscriptView.as_view(),    name='student-transcript'),
    path('department/<uuid:dept_id>/',          DepartmentReportView.as_view(),     name='dept-report'),
    path('fees/',                               FeeCollectionReportView.as_view(),  name='fee-report'),
    path('enrollments/',                        EnrollmentReportView.as_view(),     name='enrollment-report'),
]
