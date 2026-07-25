"""FUGUSAU Portal — Users URL Patterns"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .two_fa import TwoFASetupView, TwoFAVerifyView, TwoFADisableView, TwoFAStatusView
from .password_policy import ParentStudentView, ParentStudentResultsView

urlpatterns = [
    # Auth
    path('login/',           views.LoginView.as_view(),          name='login'),
    path('logout/',          views.LogoutView.as_view(),         name='logout'),
    path('register/',        views.RegisterView.as_view(),       name='register'),
    path('token/refresh/',   TokenRefreshView.as_view(),         name='token-refresh'),

    # Profile
    path('me/',              views.MeView.as_view(),             name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # Admin
    path('users/',           views.UserListView.as_view(),       name='user-list'),
    path('audit-logs/',      views.AuditLogView.as_view(),       name='audit-logs'),

    # 2FA
    path('2fa/setup/',       TwoFASetupView.as_view(),           name='2fa-setup'),
    path('2fa/verify/',      TwoFAVerifyView.as_view(),          name='2fa-verify'),
    path('2fa/disable/',     TwoFADisableView.as_view(),         name='2fa-disable'),
    path('2fa/status/',      TwoFAStatusView.as_view(),          name='2fa-status'),

    # Parent portal
    path('parent/students/',                           ParentStudentView.as_view(),         name='parent-students'),
    path('parent/students/<uuid:student_id>/results/', ParentStudentResultsView.as_view(),  name='parent-student-results'),

    # Gap 13 — Password reset by email token
    path('password-reset/',          views.PasswordResetRequestView.as_view(),  name='password-reset'),
    path('password-reset/confirm/',  views.PasswordResetConfirmView.as_view(),  name='password-reset-confirm'),

    # Gap 13 — Email verification
    path('verify-email/<str:token>/', views.VerifyEmailView.as_view(),          name='verify-email'),
    path('resend-verification/',      views.ResendVerificationView.as_view(),   name='resend-verification'),
]
