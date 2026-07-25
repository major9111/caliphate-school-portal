"""FUGUSAU Portal — Users Views (Auth Endpoints)"""
import secrets
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    UserCreateSerializer, ChangePasswordSerializer, AuditLogSerializer
)
from .models import AuditLog

User = get_user_model()

PRE_AUTH_TTL = 300  # 5 minutes to complete 2FA


class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    If two_fa_enabled=True → returns { requires_2fa: true, pre_auth_token }
    Otherwise              → returns normal JWT pair
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            try:
                email = request.data.get('email', '')
                user = User.objects.get(email=email)
                ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() \
                     or request.META.get('REMOTE_ADDR', '')

                if user.two_fa_enabled:
                    # Issue a short-lived pre-auth token instead of real JWTs
                    pre_auth_token = secrets.token_urlsafe(32)
                    cache.set(f'2fa_pre_auth_{pre_auth_token}', str(user.pk), timeout=PRE_AUTH_TTL)
                    AuditLog.objects.create(
                        user=user, action='LOGIN',
                        description=f'2FA challenge issued from {ip}',
                        ip_address=ip or None,
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                        extra_data={'stage': '2fa_pending'},
                    )
                    return Response({
                        'requires_2fa': True,
                        'pre_auth_token': pre_auth_token,
                        'message': 'Enter your 6-digit authenticator code to complete login.',
                    }, status=200)

                # Normal login (no 2FA)
                AuditLog.objects.create(
                    user=user, action='LOGIN',
                    description=f'User logged in from {ip}',
                    ip_address=ip or None,
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                )
            except User.DoesNotExist:
                pass

        return response


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklists refresh token"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            AuditLog.objects.create(
                user=request.user, action='LOGOUT',
                description='User logged out',
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


# RegisterView replaced by Gap 13 version below (includes email verification)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — Current user profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        user.last_seen = timezone.now()
        user.save(update_fields=['last_seen'])
        return user


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/ — Change user password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            AuditLog.objects.create(
                user=user, action='PASSWORD_CHANGE',
                description='Password changed',
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            return Response({'detail': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """GET /api/v1/auth/users/ — List users (Admin only)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')


class AuditLogView(generics.ListAPIView):
    """GET /api/v1/auth/audit-logs/ — System audit trail (Admin only)"""
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['action', 'user']

    def get_queryset(self):
        return AuditLog.objects.select_related('user').all()

"""
Add to fugusau/apps/users/views.py
Wire up to users/urls.py:
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view()),
    path('verify-email/<str:token>/', VerifyEmailView.as_view()),
    path('resend-verification/', ResendVerificationView.as_view()),
"""
from django.core.mail import send_mail
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model

User = get_user_model()

EMAIL_VERIFY_TTL    = 24 * 3600   # 24 hours
PASSWORD_RESET_TTL  = 3600        # 1 hour


# ── Email Verification ────────────────────────────────────────────────────────

def _send_verification_email(user):
    token = secrets.token_urlsafe(40)
    cache.set(f'email_verify_{token}', str(user.pk), timeout=EMAIL_VERIFY_TTL)
    url = f"{settings.FRONTEND_URL}/verify-email/{token}"
    send_mail(
        subject='Verify your FUGUSAU Portal email',
        message=(
            f"Welcome to FUGUSAU Portal, {user.first_name}!\\n\\n"
            f"Please verify your email by clicking the link below:\\n{url}\\n\\n"
            f"This link expires in 24 hours."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Register and send verification email"""
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        try:
            _send_verification_email(user)
        except Exception:
            pass  # Don't block registration if email fails


class VerifyEmailView(APIView):
    """GET /api/v1/auth/verify-email/<token>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        user_id = cache.get(f'email_verify_{token}')
        if not user_id:
            return Response({'error': 'Invalid or expired verification link.'}, status=400)

        try:
            user = User.objects.get(pk=user_id)
            user.is_verified = True
            user.save(update_fields=['is_verified'])
            cache.delete(f'email_verify_{token}')
            return Response({'detail': 'Email verified successfully.'})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class ResendVerificationView(APIView):
    """POST /api/v1/auth/resend-verification/ — Resend email verification"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_verified:
            return Response({'detail': 'Email is already verified.'})
        _send_verification_email(user)
        return Response({'detail': 'Verification email sent.'})


# ── Password Reset ────────────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password-reset/ — Send reset link to email"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        # Always return 200 to prevent email enumeration
        try:
            user = User.objects.get(email=email, is_active=True)
            token = secrets.token_urlsafe(40)
            cache.set(f'pwd_reset_{token}', str(user.pk), timeout=PASSWORD_RESET_TTL)
            url = f"{settings.FRONTEND_URL}/reset-password/{token}"
            send_mail(
                subject='Reset your FUGUSAU Portal password',
                message=(
                    f"Hi {user.first_name},\\n\\n"
                    f"Click the link below to reset your password:\\n{url}\\n\\n"
                    f"This link expires in 1 hour. If you did not request this, ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            pass  # Silently ignore unknown emails

        return Response({'detail': 'If that email is registered, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password-reset/confirm/"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token    = request.data.get('token', '')
        password = request.data.get('password', '')

        if not token or not password:
            return Response({'error': 'token and password are required.'}, status=400)

        user_id = cache.get(f'pwd_reset_{token}')
        if not user_id:
            return Response({'error': 'Invalid or expired reset link.'}, status=400)

        try:
            user = User.objects.get(pk=user_id)
            user.set_password(password)
            user.save()
            cache.delete(f'pwd_reset_{token}')

            from fugusau.apps.users.models import AuditLog
            AuditLog.objects.create(
                user=user, action='PASSWORD_CHANGE',
                description='Password reset via email token',
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            return Response({'detail': 'Password reset successfully. You can now log in.'})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
