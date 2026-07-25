"""FUGUSAU Portal — Students URLs (fixed + detail routes added)

Added:
  - GET /students/specializations/              (was missing)
  - GET/PATCH/DELETE /students/faculties/<pk>/  (was missing — needed for Admin CRUD)
  - GET/PATCH/DELETE /students/departments/<pk>/ (was missing — needed for Admin CRUD)
  - POST /students/admin/create/               (Admin create student)
  - POST /students/admin/create-staff/         (Admin create lecturer/staff)
  - DELETE /students/admin/delete/<uuid>/      (Admin delete user)
"""
from django.urls import path
from .views import (
    FacultyListView, FacultyDetailView,
    DepartmentListView, DepartmentDetailView,
    SpecializationListView,
    StudentProfileView, StudentDetailView, StudentListView,
    LecturerProfileView, LecturerListView,
    SemesterClearanceView,
    AdminStatsView,
    AdminCreateStudentView, AdminCreateLecturerView, AdminDeleteUserView,
)

urlpatterns = [
    # Students
    path('',                        StudentListView.as_view(),         name='student-list'),
    path('profile/',                StudentProfileView.as_view(),      name='student-profile'),

    # Faculties — list/create + detail (edit/delete)
    path('faculties/',              FacultyListView.as_view(),         name='faculty-list'),
    path('faculties/<uuid:pk>/',    FacultyDetailView.as_view(),       name='faculty-detail'),

    # Departments — list/create + detail (edit/delete)
    path('departments/',            DepartmentListView.as_view(),      name='department-list'),
    path('departments/<uuid:pk>/',  DepartmentDetailView.as_view(),    name='department-detail'),

    # Specializations (read-only)
    path('specializations/',        SpecializationListView.as_view(),  name='specialization-list'),

    # Lecturers
    path('lecturer-profile/',       LecturerProfileView.as_view(),     name='lecturer-profile'),
    path('lecturers/',              LecturerListView.as_view(),        name='lecturer-list'),

    # Clearance + stats
    path('clearance/',              SemesterClearanceView.as_view(),   name='semester-clearance'),
    path('admin/stats/',            AdminStatsView.as_view(),          name='admin-stats'),

    # Admin CRUD
    path('admin/create/',           AdminCreateStudentView.as_view(),  name='admin-create-student'),
    path('admin/create-staff/',     AdminCreateLecturerView.as_view(), name='admin-create-staff'),
    path('admin/delete/<uuid:pk>/', AdminDeleteUserView.as_view(),     name='admin-delete-user'),

    # NOTE: keep <str:matric_number>/ last — it catches everything else
    path('<str:matric_number>/',    StudentDetailView.as_view(),       name='student-detail'),
]
