"""FUGUSAU Portal — Courses URLs"""
from django.urls import path
from .views import (
    AcademicSessionListView, CurrentSessionView, CourseListView, CourseDetailView,
    CourseAssignmentListView, MyEnrollmentsView, EnrollCourseView, DropCourseView,
    TimetableView, MarkAttendanceView, AttendanceReportView, RolloverSessionView,
)

urlpatterns = [
    path('',                                    CourseListView.as_view(),           name='course-list'),
    path('<uuid:pk>/',                          CourseDetailView.as_view(),         name='course-detail'),
    path('sessions/',                           AcademicSessionListView.as_view(),  name='session-list'),
    path('sessions/current/',                   CurrentSessionView.as_view(),       name='current-session'),
    path('sessions/rollover/',                  RolloverSessionView.as_view(),      name='sessions-rollover'),
    path('assignments/',                        CourseAssignmentListView.as_view(), name='assignment-list'),
    path('my-enrollments/',                     MyEnrollmentsView.as_view(),        name='my-enrollments'),
    path('enroll/',                             EnrollCourseView.as_view(),         name='enroll'),
    path('drop/<uuid:pk>/',                     DropCourseView.as_view(),           name='drop-course'),
    path('timetable/',                          TimetableView.as_view(),            name='timetable'),
    path('attendance/',                         MarkAttendanceView.as_view(),       name='mark-attendance'),
    path('attendance/<uuid:enrollment_id>/',    AttendanceReportView.as_view(),     name='attendance-report'),
]
