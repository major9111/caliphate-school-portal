"""
FUGUSAU Portal — Password Policy, Session Limits & Parent Role

─── 1. Password Validators ──────────────────────────────────────────────────
Add to settings/base.py AUTH_PASSWORD_VALIDATORS:

    AUTH_PASSWORD_VALIDATORS = [
        {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
        {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
         'OPTIONS': {'min_length': 10}},
        {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
        {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
        {'NAME': 'fugusau.apps.users.password_policy.ComplexityValidator'},
        {'NAME': 'fugusau.apps.users.password_policy.BreachCheckValidator'},
    ]

─── 2. Session Concurrency ───────────────────────────────────────────────────
Add SessionConcurrencyMiddleware to MIDDLEWARE in base.py
(after AuthenticationMiddleware):
    'fugusau.apps.users.password_policy.SessionConcurrencyMiddleware',

─── 3. Parent Role ───────────────────────────────────────────────────────────
Save ParentPermission + ParentStudentLinkView to permissions.py / users/views.py
Add URL:
    path('parent/students/', ParentStudentLinkView.as_view(), name='parent-students'),
"""
import hashlib
import re
import requests as http_requests
import logging
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

logger = logging.getLogger('fugusau.security')


# ═══════════════════════════════════════════════════════════════════════════════
# 1. PASSWORD VALIDATORS
# ═══════════════════════════════════════════════════════════════════════════════

class ComplexityValidator:
    """
    Requires at least:
      - 1 uppercase letter
      - 1 lowercase letter
      - 1 digit
      - 1 special character
    """
    def validate(self, password, user=None):
        errors = []
        if not re.search(r'[A-Z]', password):
            errors.append('at least one uppercase letter (A–Z)')
        if not re.search(r'[a-z]', password):
            errors.append('at least one lowercase letter (a–z)')
        if not re.search(r'\d', password):
            errors.append('at least one digit (0–9)')
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?`~]', password):
            errors.append('at least one special character (!@#$%^&*…)')
        if errors:
            raise ValidationError(
                _('Password must contain %(reqs)s.'),
                params={'reqs': ', '.join(errors)},
                code='password_too_weak',
            )

    def get_help_text(self):
        return _(
            'Your password must contain at least one uppercase letter, '
            'one lowercase letter, one digit, and one special character.'
        )


class BreachCheckValidator:
    """
    Checks the password against the Have I Been Pwned (HIBP) API
    using k-anonymity — only the first 5 chars of the SHA-1 hash are sent.
    Fails open: if HIBP is unreachable, validation passes.
    """
    HIBP_URL = 'https://api.pwnedpasswords.com/range/{}'

    def validate(self, password, user=None):
        try:
            sha1 = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
            prefix, suffix = sha1[:5], sha1[5:]
            resp = http_requests.get(
                self.HIBP_URL.format(prefix),
                timeout=3,
                headers={'Add-Padding': 'true'},
            )
            if resp.status_code == 200:
                for line in resp.text.splitlines():
                    hash_suffix, count = line.split(':')
                    if hash_suffix == suffix:
                        raise ValidationError(
                            _(
                                'This password has appeared in %(count)s data breaches. '
                                'Please choose a different password.'
                            ),
                            params={'count': int(count)},
                            code='password_breached',
                        )
        except ValidationError:
            raise
        except Exception as exc:
            logger.debug(f'HIBP check skipped (network error): {exc}')

    def get_help_text(self):
        return _('Your password must not have appeared in known data breaches.')


# ═══════════════════════════════════════════════════════════════════════════════
# 2. SESSION CONCURRENCY MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════════

class SessionConcurrencyMiddleware:
    """
    Enforces SecurityPolicy.max_sessions_per_user.
    On login (token issuance), if the user already has >= max active sessions,
    the oldest one is terminated before the new session is recorded.

    Called from LoginView after successful auth — not in __call__ — because
    we need the user context. Wire by calling enforce_session_limit(user, request)
    inside LoginView.post() after a successful login.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)


def enforce_session_limit(user, request, session_key: str):
    """
    Call from LoginView immediately after creating a new UserSession.
    Terminates oldest sessions if over the policy limit.

    Args:
        user       — the authenticated User instance
        request    — the Django request
        session_key — the session_key of the newly created session
    """
    from fugusau.apps.security.models import UserSession, SecurityPolicy
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

    try:
        policy = SecurityPolicy.objects.filter(is_enabled=True).first()
        max_sessions = policy.max_sessions_per_user if policy else 3
    except Exception:
        max_sessions = 3

    active = UserSession.objects.filter(
        user=user,
        is_active=True,
    ).exclude(session_key=session_key).order_by('login_at')  # oldest first

    if active.count() >= max_sessions:
        # Kick oldest sessions
        to_kill = active[:active.count() - max_sessions + 1]
        for session in to_kill:
            session.is_active = False
            session.logout_at = __import__('django.utils.timezone', fromlist=['timezone']).timezone.now()
            session.save(update_fields=['is_active', 'logout_at'])
            logger.info(
                f'Session limit enforced for {user.email}: '
                f'terminated session {session.pk} ({session.ip_address})'
            )
            # Blacklist associated tokens
            try:
                tokens = OutstandingToken.objects.filter(user=user)
                for tok in tokens:
                    BlacklistedToken.objects.get_or_create(token=tok)
            except Exception:
                pass


# ═══════════════════════════════════════════════════════════════════════════════
# 3. PARENT ROLE — PERMISSION + VIEWS
# ═══════════════════════════════════════════════════════════════════════════════

from rest_framework.permissions import BasePermission


class IsParent(BasePermission):
    """Only users with role='parent'."""
    message = 'Parent account required.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'parent'


class IsParentOrStudent(BasePermission):
    """Parents and students — for shared resources."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('parent', 'student')


# ─── Parent–Student Link Model (add to users/models.py) ──────────────────────
PARENT_STUDENT_LINK_MODEL = '''
class ParentStudentLink(models.Model):
    """Links a parent user to one or more student users."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent      = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='linked_students',
        limit_choices_to={'role': 'parent'},
    )
    student     = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='linked_parents',
        limit_choices_to={'role': 'student'},
    )
    verified    = models.BooleanField(default=False)  # Admin must verify the link
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'parent_student_links'
        unique_together = ['parent', 'student']

    def __str__(self):
        return f\'{self.parent.get_full_name()} → {self.student.get_full_name()}\'
'''

# ─── Parent views (add to users/views.py) ────────────────────────────────────
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions as drf_permissions


class ParentStudentView(APIView):
    """
    GET  /api/v1/auth/parent/students/   — list linked students
    POST /api/v1/auth/parent/students/   — request link to a student (by matric number or email)
    """
    permission_classes = [IsParent]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Assumes ParentStudentLink model is in users app
        try:
            from fugusau.apps.users.models import ParentStudentLink
            links = ParentStudentLink.objects.filter(
                parent=request.user, verified=True
            ).select_related('student')
            return Response([
                {
                    'student_id': str(l.student.id),
                    'name': l.student.get_full_name(),
                    'email': l.student.email,
                }
                for l in links
            ])
        except ImportError:
            return Response({'error': 'ParentStudentLink model not yet added.'}, status=501)

    def post(self, request):
        """Request a parent–student link. Admin must approve."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        student_email = request.data.get('student_email', '').strip()
        if not student_email:
            return Response({'error': 'student_email is required.'}, status=400)
        try:
            student = User.objects.get(email=student_email, role='student')
        except User.DoesNotExist:
            return Response({'error': 'No active student found with that email.'}, status=404)
        try:
            from fugusau.apps.users.models import ParentStudentLink
            link, created = ParentStudentLink.objects.get_or_create(
                parent=request.user, student=student,
                defaults={'verified': False},
            )
            if created:
                return Response({'detail': 'Link request submitted. Awaiting admin verification.'}, status=201)
            return Response({'detail': 'Link request already exists.', 'verified': link.verified})
        except ImportError:
            return Response({'error': 'ParentStudentLink model not yet added.'}, status=501)


class ParentStudentResultsView(APIView):
    """
    GET /api/v1/auth/parent/students/{student_id}/results/
    Parent can view results of their verified linked students.
    """
    permission_classes = [IsParent]

    def get(self, request, student_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            from fugusau.apps.users.models import ParentStudentLink
            link = ParentStudentLink.objects.get(
                parent=request.user, student_id=student_id, verified=True
            )
        except Exception:
            return Response({'error': 'No verified link to this student.'}, status=403)

        # Fetch results via the exams app
        try:
            from fugusau.apps.exams.models import Result
            from fugusau.apps.exams.serializers import ResultSerializer
            results = Result.objects.filter(student__user_id=student_id)
            from rest_framework import serializers
            return Response({'results': [
                {
                    'exam': str(r.exam),
                    'score': r.score,
                    'grade': getattr(r, 'grade', ''),
                    'date': str(r.created_at) if hasattr(r, 'created_at') else '',
                }
                for r in results
            ]})
        except Exception as exc:
            return Response({'error': str(exc)}, status=500)
