"""
FUGUSAU Portal — Honeypot Middleware & CAPTCHA Integration

─── Honeypot ────────────────────────────────────────────────────────────────
Add HoneypotMiddleware to MIDDLEWARE in base.py
(before SecurityMiddleware so it catches bots first):
    'fugusau.apps.security.honeypot.HoneypotMiddleware',

─── CAPTCHA ─────────────────────────────────────────────────────────────────
pip install django-recaptcha==4.0.0   (add to requirements.txt)

Add to settings/base.py:
    INSTALLED_APPS += ['django_recaptcha']
    RECAPTCHA_PUBLIC_KEY  = config('RECAPTCHA_PUBLIC_KEY')
    RECAPTCHA_PRIVATE_KEY = config('RECAPTCHA_PRIVATE_KEY')
    RECAPTCHA_REQUIRED_SCORE = 0.7   # 0.0 bot → 1.0 human (v3)
    # For testing only:
    # SILENCED_SYSTEM_CHECKS = ['django_recaptcha.recaptcha_test_key_error']

Add to .env:
    RECAPTCHA_PUBLIC_KEY=your_site_key_here
    RECAPTCHA_PRIVATE_KEY=your_secret_key_here

Frontend: include the reCAPTCHA v3 token in login/register POST body as:
    { ..., "recaptcha_token": "TOKEN_FROM_JS" }
"""
import logging
from django.utils import timezone
from django.http import JsonResponse
from django.core.cache import cache

logger = logging.getLogger('fugusau.security')


# ═══════════════════════════════════════════════════════════════════════════════
# 1. HONEYPOT MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

# Paths that should never exist on this server.
# Any access → immediate IP block (bots/scanners only hit these).
HONEYPOT_PATHS = [
    # WordPress
    '/wp-login.php', '/wp-admin/', '/wp-config.php', '/wordpress/',
    '/wp-includes/', '/wp-content/', '/xmlrpc.php',
    # PHP admin tools
    '/phpmyadmin/', '/phpMyAdmin/', '/pma/', '/mysql/', '/mysqladmin/',
    # Common exploit targets
    '/admin.php', '/administrator/', '/manager/', '/console/',
    '/shell.php', '/c99.php', '/r57.php', '/eval-stdin.php',
    '/setup.php', '/install.php', '/config.php',
    # Environment / config leaks
    '/.env', '/.git/', '/.svn/', '/.htaccess',
    '/web.config', '/server-status', '/server-info',
    # API scanners
    '/api/swagger-ui.html', '/v1/', '/v2/',
    '/actuator/', '/actuator/health', '/actuator/env',
    # Laravel / CodeIgniter
    '/vendor/', '/storage/', '/artisan',
    # Common backdoors
    '/backdoor.php', '/hack.php', '/test.php', '/x.php',
]

# Fake 'admin' trap page — bots that POST to /admin-login are blocked
HONEYPOT_POST_PATHS = [
    '/admin-login', '/login.php', '/signin.php',
    '/account/login', '/user/login', '/auth/login.php',
]


def _get_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def _auto_block(ip: str, reason: str, request):
    """Honeypot-triggered IP block."""
    try:
        from fugusau.apps.security.models import BlockedIP, SecurityEvent
        BlockedIP.objects.get_or_create(
            ip_address=ip,
            defaults={
                'reason': f'Honeypot triggered: {reason}',
                'block_type': BlockedIP.AUTO,
                'duration': BlockedIP.TEMPORARY,
                'expires_at': timezone.now() + timezone.timedelta(hours=48),
                'is_active': True,
            }
        )
        cache.set(f'blocked_ip_{ip}', True, timeout=86400 * 2)

        SecurityEvent.objects.create(
            event_type='UNAUTHORIZED_ACCESS',
            threat_level='high',
            description=f'Honeypot triggered by {ip}: {reason}',
            ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            request_path=request.path[:500],
            request_method=request.method,
            action_taken='IP auto-blocked for 48 hours',
            ip_blocked=True,
        )
        logger.warning(f' HONEYPOT: {ip} blocked — {reason}')
    except Exception as exc:
        logger.error(f'Honeypot block failed: {exc}')


class HoneypotMiddleware:
    """
    Intercepts requests to known scanner/exploit paths.
    Accessing a honeypot path = instant 48-hour IP block.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self._honeypot_set = set(HONEYPOT_PATHS)
        self._honey_post   = set(HONEYPOT_POST_PATHS)

    def __call__(self, request):
        path = request.path.rstrip('/')
        ip   = _get_ip(request)

        # Check GET honeypot paths
        if path in self._honeypot_set or any(path.startswith(h.rstrip('/')) for h in self._honeypot_set):
            _auto_block(ip, f'access to honeypot path {path}', request)
            # Return a realistic-looking 404 — don't reveal it's a honeypot
            return JsonResponse({'detail': 'Not found.'}, status=404)

        # Check POST honeypot forms
        if request.method == 'POST' and path in self._honey_post:
            _auto_block(ip, f'POST to fake login honeypot {path}', request)
            return JsonResponse({'error': 'Invalid credentials.'}, status=401)

        return self.get_response(request)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. CAPTCHA VALIDATION (server-side, for LoginView / RegisterView)
# ═══════════════════════════════════════════════════════════════════════════════

import requests as http_requests
from django.conf import settings


RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


def verify_recaptcha(token: str, action: str = 'login') -> tuple[bool, float]:
    """
    Verify a reCAPTCHA v3 token server-side.
    Returns (passed: bool, score: float).
    Score: 0.0 = likely bot, 1.0 = likely human.
    Fails open (returns True, 1.0) if RECAPTCHA_PRIVATE_KEY is not configured.
    """
    secret = getattr(settings, 'RECAPTCHA_PRIVATE_KEY', None)
    if not secret or secret == 'test':
        return True, 1.0

    try:
        resp = http_requests.post(
            RECAPTCHA_VERIFY_URL,
            data={'secret': secret, 'response': token},
            timeout=5,
        )
        data = resp.json()
        success  = data.get('success', False)
        score    = data.get('score', 0.0)
        act      = data.get('action', '')
        required = getattr(settings, 'RECAPTCHA_REQUIRED_SCORE', 0.5)

        if not success:
            logger.warning(f'reCAPTCHA failed: {data.get("error-codes", [])}')
            return False, 0.0

        if act and act != action:
            logger.warning(f'reCAPTCHA action mismatch: expected {action}, got {act}')
            return False, score

        return score >= required, score

    except Exception as exc:
        logger.error(f'reCAPTCHA verification error: {exc}')
        return True, 1.0  # Fail open — don't lock out users if Google is unreachable


class CaptchaRequiredMixin:
    """
    Mixin for DRF views. Add to LoginView / RegisterView.
    Validates reCAPTCHA v3 token before processing the request.

    Usage:
        class LoginView(CaptchaRequiredMixin, TokenObtainPairView):
            captcha_action = 'login'
    """
    captcha_action: str = 'submit'

    def dispatch(self, request, *args, **kwargs):
        if request.method in ('POST', 'PUT', 'PATCH'):
            token = request.data.get('recaptcha_token', '')
            passed, score = verify_recaptcha(token, self.captcha_action)
            if not passed:
                ip = _get_ip(request)
                logger.warning(f'reCAPTCHA failed from {ip}: score={score}')
                return JsonResponse(
                    {'error': 'Bot check failed. Please try again.'},
                    status=400,
                )
        return super().dispatch(request, *args, **kwargs)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ROLE CHANGE AUDIT (Signal — add to audit_signals.py or signals.py)
# ═══════════════════════════════════════════════════════════════════════════════
"""
This is already handled in audit_signals.py (on_user_change).
The snippet below shows how to also emit a SecurityEvent for privilege escalation.

Add this to audit_signals.py post_save handler or a dedicated signal:
"""

def on_role_escalation(sender, instance, **kwargs):
    """
    Call this from within on_user_change when role changes to admin/lecturer.
    Creates a SecurityEvent in addition to the AuditLog entry.
    """
    from fugusau.apps.security.models import SecurityEvent
    try:
        SecurityEvent.objects.create(
            event_type='PRIVILEGE_ESCALATION',
            threat_level='high',
            description=(
                f'User role elevated to {instance.role} for account: {instance.email}'
            ),
            user=instance,
            action_taken='Role change recorded in audit log',
            status='open',
        )
    except Exception as exc:
        logger.error(f'Failed to log privilege escalation event: {exc}')
