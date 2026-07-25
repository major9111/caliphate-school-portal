"""FUGUSAU Portal — Credentials URLs (fixed)

Added: GET <pk>/download/ for raw file download.
"""
from django.urls import path
from .views import (
    CredentialListCreateView,
    AnalyzeCredentialView,
    ExternalVerifyView,
    AdminCredentialReviewView,
    CredentialDownloadView,
)

urlpatterns = [
    path('',                            CredentialListCreateView.as_view(),  name='credential-list'),
    path('<uuid:pk>/analyze/',          AnalyzeCredentialView.as_view(),     name='analyze-credential'),
    path('<uuid:pk>/verify/',           ExternalVerifyView.as_view(),        name='verify-credential'),
    path('<uuid:pk>/review/',           AdminCredentialReviewView.as_view(), name='review-credential'),
    path('<uuid:pk>/download/',         CredentialDownloadView.as_view(),    name='credential-download'),
]
