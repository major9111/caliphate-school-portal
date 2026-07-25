"""FUGUSAU Portal — Exams URLs"""
from django.urls import path
from .views import (
    ExamScheduleListView, ExamScheduleDetailView,
    MyResultsView, AdminResultsView, UploadResultView, UpdateResultView, ApproveResultView,
    ExamCardView, ExamClearanceListView, GrantClearanceView,
    BulkGradeUploadView,
    SenateBatchApprovalView,
)

urlpatterns = [
    path('schedule/',                           ExamScheduleListView.as_view(),     name='exam-schedule-list'),
    path('schedule/<uuid:pk>/',                 ExamScheduleDetailView.as_view(),   name='exam-schedule-detail'),
    path('results/',                            MyResultsView.as_view(),            name='my-results'),
    path('results/admin/',                      AdminResultsView.as_view(),         name='admin-results'),
    path('results/upload/',                     UploadResultView.as_view(),         name='upload-result'),
    path('results/bulk-upload/',                BulkGradeUploadView.as_view(),      name='bulk-grade-upload'),
    path('results/senate-approve/',             SenateBatchApprovalView.as_view(),  name='senate-approve'),
    path('results/<uuid:pk>/',                  UpdateResultView.as_view(),         name='update-result'),
    path('results/<uuid:pk>/approve/',          ApproveResultView.as_view(),        name='approve-result'),
    path('exam-card/',                          ExamCardView.as_view(),             name='exam-card'),
    path('clearances/',                         ExamClearanceListView.as_view(),    name='clearance-list'),
    path('clearances/<uuid:pk>/grant/',         GrantClearanceView.as_view(),       name='grant-clearance'),
]
