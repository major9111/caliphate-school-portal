"""FUGUSAU Portal — Security URL Patterns"""
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard & Stats
    path('dashboard/',       views.SecurityDashboardView.as_view(),    name='security-dashboard'),
    path('stats/',           views.SecurityStatsView.as_view(),        name='security-stats'),
    path('health/',          views.SystemHealthView.as_view(),         name='system-health'),

    # Security Events
    path('events/',          views.SecurityEventListView.as_view(),    name='security-events'),
    path('events/<uuid:pk>/', views.SecurityEventDetailView.as_view(), name='security-event-detail'),

    # IP Blocking
    path('blocked-ips/',     views.BlockedIPListView.as_view(),        name='blocked-ips'),
    path('blocked-ips/<uuid:pk>/unblock/', views.UnblockIPView.as_view(), name='unblock-ip'),

    # Sessions
    path('sessions/',        views.ActiveSessionsView.as_view(),       name='active-sessions'),
    path('sessions/<uuid:pk>/terminate/', views.TerminateSessionView.as_view(), name='terminate-session'),

    # Login Attempts
    path('login-attempts/',  views.LoginAttemptListView.as_view(),     name='login-attempts'),

    # Policy
    path('policy/',          views.SecurityPolicyView.as_view(),       name='security-policy'),
]

# ── IP Management endpoints (Gap 2-7) ─────────────────────────────────────────
from fugusau.apps.security.ip_management import (
    IPReputationView, CIDRBlockListView, UnblockAppealView,
    UnblockAppealListView, UnblockAppealReviewView, CampusAllowlistView,
)

urlpatterns += [
    path('ip/<str:ip>/reputation/',          IPReputationView.as_view(),           name='ip-reputation'),
    path('cidr/',                            CIDRBlockListView.as_view(),           name='cidr-list'),
    path('appeal/',                          UnblockAppealView.as_view(),           name='unblock-appeal'),
    path('appeals/',                         UnblockAppealListView.as_view(),       name='unblock-appeal-list'),
    path('appeals/<uuid:appeal_id>/review/', UnblockAppealReviewView.as_view(),     name='unblock-appeal-review'),
    path('allowlist/',                       CampusAllowlistView.as_view(),         name='campus-allowlist'),
]
