"""
FUGUSAU Portal — Two-Factor Authentication (2FA)
Implements TOTP via django-otp + pyotp (QR code + verify + enforce)

Install (already in requirements.txt):
    django-otp==1.3.0
    qrcode==7.4.2

Add to INSTALLED_APPS in base.py:
    'django_otp',
    'django_otp.plugins.otp_totp',

Add to MIDDLEWARE in base.py (after AuthenticationMiddleware):
    'django_otp.middleware.OTPMiddleware',

Wire URLs in users/urls.py:
    path('2fa/', include('fugusau.apps.users.two_fa_urls')),
"""
import io
import qrcode
import base64
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

User = get_user_model()


def _get_or_create_device(user) -> TOTPDevice:
    """Return (or create) the confirmed TOTP device for a user."""
    device = TOTPDevice.objects.filter(user=user, name='default').first()
    if not device:
        device = TOTPDevice.objects.create(
            user=user,
            name='default',
            confirmed=False,
        )
    return device


def _qr_png_b64(device: TOTPDevice, user) -> str:
    """Return a base64-encoded PNG QR code for the device's provisioning URI."""
    uri = device.config_url  # otpauth://totp/...
    # Replace the device label for a cleaner scan
    uri = uri.replace(
        'TOTPDevice',
        f'FUGUSAU:{user.email}'
    )
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode()


class TwoFASetupView(APIView):
    """
    GET  /api/v1/auth/2fa/setup/  — Generate QR code for authenticator app
    POST /api/v1/auth/2fa/setup/  — Confirm TOTP token to activate 2FA
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        device = _get_or_create_device(request.user)
        if request.user.two_fa_enabled:
            return Response({'detail': '2FA is already enabled.'}, status=400)
        return Response({
            'qr_code': f'data:image/png;base64,{_qr_png_b64(device, request.user)}',
            'secret': device.bin_key.hex(),  # show raw secret for manual entry
            'message': 'Scan the QR code with Google Authenticator / Authy, then POST the 6-digit token to confirm.',
        })

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'token is required.'}, status=400)
        device = _get_or_create_device(request.user)
        if device.verify_token(token):
            device.confirmed = True
            device.save()
            request.user.two_fa_enabled = True
            request.user.save(update_fields=['two_fa_enabled'])
            return Response({'detail': '2FA enabled successfully.'})
        return Response({'error': 'Invalid or expired token.'}, status=400)


class TwoFAVerifyView(APIView):
    """
    POST /api/v1/auth/2fa/verify/
    Called after a successful password login when two_fa_enabled=True.
    Exchanges a short-lived pre-auth token + TOTP code for real JWT tokens.

    Flow:
        1. POST /auth/login/  →  200 with { requires_2fa: true, pre_auth_token: "..." }
        2. POST /auth/2fa/verify/  { pre_auth_token, totp_token }  →  real JWT pair
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.core.cache import cache
        from rest_framework_simplejwt.tokens import RefreshToken

        pre_auth = request.data.get('pre_auth_token', '').strip()
        totp_token = request.data.get('totp_token', '').strip()

        if not pre_auth or not totp_token:
            return Response({'error': 'pre_auth_token and totp_token are required.'}, status=400)

        # Retrieve user id from cache (set by LoginView when 2FA required)
        user_id = cache.get(f'2fa_pre_auth_{pre_auth}')
        if not user_id:
            return Response({'error': 'Pre-auth token expired or invalid.'}, status=401)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=401)

        device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
        if not device or not device.verify_token(totp_token):
            return Response({'error': 'Invalid TOTP token.'}, status=401)

        # Consume the pre-auth token (one-time use)
        cache.delete(f'2fa_pre_auth_{pre_auth}')

        refresh = RefreshToken.for_user(user)
        refresh['email'] = user.email
        refresh['role'] = user.role
        refresh['name'] = user.get_full_name()

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'name': user.get_full_name(),
                'role': user.role,
                'is_verified': user.is_verified,
                'two_fa_enabled': True,
            }
        })


class TwoFADisableView(APIView):
    """
    POST /api/v1/auth/2fa/disable/
    Requires current password + valid TOTP token for confirmation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        token = request.data.get('token', '').strip()

        if not request.user.check_password(password):
            return Response({'error': 'Password incorrect.'}, status=400)

        device = TOTPDevice.objects.filter(user=request.user, confirmed=True).first()
        if not device or not device.verify_token(token):
            return Response({'error': 'Invalid TOTP token.'}, status=400)

        device.delete()
        request.user.two_fa_enabled = False
        request.user.save(update_fields=['two_fa_enabled'])
        return Response({'detail': '2FA disabled successfully.'})


class TwoFAStatusView(APIView):
    """GET /api/v1/auth/2fa/status/ — Check 2FA status for current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        device = TOTPDevice.objects.filter(user=request.user, confirmed=True).first()
        return Response({
            'enabled': request.user.two_fa_enabled,
            'device_confirmed': device is not None,
        })
