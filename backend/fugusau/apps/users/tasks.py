"""
FUGUSAU Portal — Users App Tasks
Path: fugusau/apps/users/tasks.py

Fix #7: clean_expired_tokens was scheduled weekly in Celery beat but this
file didn't exist. The worker logged import errors every Sunday at 2AM.

Note: The current users/models.py has no dedicated token model (email
verification / password-reset tokens are not in the schema yet).
This task cleans two things that ARE in the schema:
  1. Outstanding blacklisted JWT tokens via djangorestframework-simplejwt's
     OutstandingToken / BlacklistedToken tables (if simplejwt is installed).
  2. Expired audit-log entries older than the configured retention window
     (default 365 days) — a lightweight housekeeping step that fits here.

If you add a PasswordResetToken or EmailVerificationToken model later,
add a .filter(expires_at__lt=now).delete() call in the task below.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# How many days to keep audit log entries (override in settings if needed)
AUDIT_LOG_RETENTION_DAYS = 365


@shared_task(bind=True, max_retries=3, default_retry_delay=600)
def clean_expired_tokens(self) -> dict:
    """
    Scheduled weekly on Sunday at 2AM (see celery.py beat_schedule).
    Deletes expired/blacklisted JWT tokens and old audit log rows.

    Returns:
        dict with counts of deleted items
    """
    result = {
        'jwt_outstanding_deleted': 0,
        'audit_logs_deleted': 0,
    }

    try:
        now = timezone.now()

        # ── 1. Clean expired simplejwt outstanding tokens ────────────────────
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            expired_qs = OutstandingToken.objects.filter(expires_at__lt=now)
            count, _   = expired_qs.delete()
            result['jwt_outstanding_deleted'] = count
            logger.info('clean_expired_tokens: deleted %d expired JWT tokens', count)
        except ImportError:
            logger.debug('clean_expired_tokens: simplejwt blacklist app not installed, skipping')
        except Exception as exc:
            logger.warning('clean_expired_tokens: JWT cleanup error — %s', exc)

        # ── 2. Prune old audit log entries ───────────────────────────────────
        try:
            from fugusau.apps.users.models import AuditLog
            cutoff     = now - timezone.timedelta(days=AUDIT_LOG_RETENTION_DAYS)
            count, _   = AuditLog.objects.filter(timestamp__lt=cutoff).delete()
            result['audit_logs_deleted'] = count
            logger.info(
                'clean_expired_tokens: pruned %d audit log entries older than %d days',
                count, AUDIT_LOG_RETENTION_DAYS,
            )
        except Exception as exc:
            logger.warning('clean_expired_tokens: audit log cleanup error — %s', exc)

        logger.info('clean_expired_tokens complete: %s', result)
        return result

    except Exception as exc:
        logger.error('clean_expired_tokens unexpected error: %s', exc)
        raise self.retry(exc=exc)
