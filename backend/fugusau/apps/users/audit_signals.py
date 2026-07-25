"""
FUGUSAU Portal — Audit Log Signals & Decorator
Auto-logs sensitive actions across all apps without touching individual views.

─── Setup ───────────────────────────────────────────────────────────────────
1. Create: fugusau/apps/users/audit_signals.py  (this file)
2. Add to users/apps.py:
       def ready(self):
           import fugusau.apps.users.audit_signals  # noqa

─── How it works ────────────────────────────────────────────────────────────
• Django signals catch model saves/deletes automatically
• @audit_action decorator wraps any view for manual logging with before/after diff
• audit_log() helper is available anywhere for one-off entries
"""
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
import json
import logging

logger = logging.getLogger('fugusau.audit')


# ─── Helper ──────────────────────────────────────────────────────────────────

def audit_log(user, action, description, request=None, extra_data=None):
    """
    Write one AuditLog entry. Safe to call from anywhere — catches all errors.
    """
    try:
        from fugusau.apps.users.models import AuditLog
        ip = ua = ''
        if request:
            x_fwd = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_fwd.split(',')[0].strip() if x_fwd else request.META.get('REMOTE_ADDR', '')
            ua = request.META.get('HTTP_USER_AGENT', '')[:500]
        AuditLog.objects.create(
            user=user,
            action=action,
            description=description,
            ip_address=ip or None,
            user_agent=ua,
            extra_data=extra_data or {},
        )
    except Exception as exc:
        logger.error(f'audit_log failed: {exc}')


def _diff(old_obj, new_obj, fields):
    """Return dict of changed field: (old_val, new_val) pairs."""
    changes = {}
    for f in fields:
        old_v = getattr(old_obj, f, None)
        new_v = getattr(new_obj, f, None)
        if old_v != new_v:
            changes[f] = {'from': str(old_v), 'to': str(new_v)}
    return changes


# ─── Decorator ───────────────────────────────────────────────────────────────

def audit_action(action: str, description_fn=None):
    """
    Decorator for DRF view methods. Logs after a successful (2xx) response.

    Usage:
        @audit_action('GRADE_UPLOAD', description_fn=lambda req: f'Grades uploaded for {req.data.get("course")}')
        def post(self, request, *args, **kwargs):
            ...
    """
    import functools

    def decorator(method):
        @functools.wraps(method)
        def wrapper(self, request, *args, **kwargs):
            response = method(self, request, *args, **kwargs)
            if response.status_code < 300 and request.user.is_authenticated:
                desc = description_fn(request) if description_fn else f'{action} performed'
                audit_log(request.user, action, desc, request)
            return response
        return wrapper
    return decorator


# ─── Pre-save snapshots (for diff) ───────────────────────────────────────────

_USER_SNAPSHOT: dict = {}  # pk → snapshot dict (transient, per-process)


@receiver(pre_save)
def capture_user_snapshot(sender, instance, **kwargs):
    """Capture user fields before save so we can diff in post_save."""
    User = get_user_model()
    if sender is not User:
        return
    if not instance.pk:
        return  # new user — nothing to diff
    try:
        old = User.objects.get(pk=instance.pk)
        _USER_SNAPSHOT[instance.pk] = {
            'role': old.role,
            'is_active': old.is_active,
            'is_staff': old.is_staff,
            'email': old.email,
        }
    except User.DoesNotExist:
        pass


# ─── User model signals ───────────────────────────────────────────────────────

@receiver(post_save)
def on_user_change(sender, instance, created, **kwargs):
    User = get_user_model()
    if sender is not User:
        return

    if created:
        audit_log(
            user=instance,
            action='LOGIN',  # closest available — you may add 'REGISTER' to AuditLog choices
            description=f'New user account created: {instance.email} (role={instance.role})',
            extra_data={'role': instance.role},
        )
        return

    old = _USER_SNAPSHOT.pop(instance.pk, None)
    if not old:
        return

    watch = ['role', 'is_active', 'is_staff', 'email']
    changes = _diff(type('O', (), old)(), instance, watch)  # compare old dict vs new instance

    # Build correct old-object
    class OldObj:
        pass
    old_obj = OldObj()
    for k, v in old.items():
        setattr(old_obj, k, v)
    changes = _diff(old_obj, instance, watch)

    if not changes:
        return

    # Role change — escalation risk
    if 'role' in changes:
        audit_log(
            user=instance,
            action='ACCOUNT_SUSPEND',  # closest — add 'ROLE_CHANGE' to choices ideally
            description=(
                f'Role changed for {instance.email}: '
                f'{changes["role"]["from"]} → {changes["role"]["to"]}'
            ),
            extra_data={'changes': changes},
        )

    # Account suspended / reactivated
    if 'is_active' in changes:
        audit_log(
            user=instance,
            action='ACCOUNT_SUSPEND',
            description=(
                f'Account {"activated" if instance.is_active else "suspended"}: {instance.email}'
            ),
            extra_data={'changes': changes},
        )


# ─── Grade / exam signals ─────────────────────────────────────────────────────

@receiver(post_save, sender='exams.Result')
def on_result_save(sender, instance, created, **kwargs):
    """Log every grade write."""
    action = 'GRADE_UPLOAD' if created else 'GRADE_EDIT'
    try:
        desc = (
            f'{"Created" if created else "Updated"} result for student '
            f'{instance.student_id} in {instance.exam_id}: score={instance.score}'
        )
    except Exception:
        desc = f'Result {"created" if created else "updated"}'
    audit_log(
        user=None,  # no request context from signal — will be None
        action=action,
        description=desc,
        extra_data={'result_id': str(instance.pk)},
    )


# ─── Payment signals ──────────────────────────────────────────────────────────

@receiver(post_save, sender='fees.Payment')
def on_payment_save(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        desc = (
            f'Payment of ₦{instance.amount:,.2f} recorded for '
            f'student {instance.student_id} — ref: {instance.reference}'
        )
    except Exception:
        desc = 'Payment recorded'
    audit_log(
        user=None,
        action='PAYMENT',
        description=desc,
        extra_data={'payment_id': str(instance.pk)},
    )


# ─── Admission signals ────────────────────────────────────────────────────────

@receiver(post_save, sender='admissions.Application')
def on_admission_save(sender, instance, created, **kwargs):
    try:
        status_val = getattr(instance, 'status', 'unknown')
        desc = (
            f'Admission application {"submitted" if created else f"updated to {status_val}"} '
            f'for {getattr(instance, "email", "")} '
            f'(programme: {getattr(instance, "programme_applied", "")})'
        )
    except Exception:
        desc = f'Admission application {"created" if created else "updated"}'
    audit_log(
        user=None,
        action='ADMISSION',
        description=desc,
        extra_data={'application_id': str(instance.pk)},
    )


# ─── Document upload signals ──────────────────────────────────────────────────

@receiver(post_save, sender='credentials.Credential')
def on_credential_save(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        desc = (
            f'Credential document uploaded: {instance.document_type} '
            f'for {getattr(instance, "student_id", "")}'
        )
    except Exception:
        desc = 'Credential document uploaded'
    audit_log(
        user=None,
        action='DOCUMENT_UPLOAD',
        description=desc,
        extra_data={'credential_id': str(instance.pk)},
    )
