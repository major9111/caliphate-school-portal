"""
FUGUSAU Portal — Security Celery Tasks
Add these to: fugusau/apps/security/tasks.py

Also add to celery.py beat_schedule:
    'security-health-snapshot': {
        'task': 'fugusau.apps.security.tasks.take_health_snapshot',
        'schedule': crontab(minute='*/5'),   # every 5 minutes
    },
    'security-alert-dispatcher': {
        'task': 'fugusau.apps.security.tasks.dispatch_security_alerts',
        'schedule': crontab(minute='*/1'),   # every minute
    },
    'security-cleanup-expired-blocks': {
        'task': 'fugusau.apps.security.tasks.cleanup_expired_blocks',
        'schedule': crontab(hour=3, minute=0),  # 3AM daily
    },
    'security-cleanup-old-events': {
        'task': 'fugusau.apps.security.tasks.cleanup_old_events',
        'schedule': crontab(hour=4, minute=0),  # 4AM daily
    },

Install for geo-IP (add to requirements.txt):
    geoip2==4.7.0
    # Download free DB: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
    # Set GEOIP_PATH in settings: GEOIP_PATH = '/opt/geoip/'
"""
import logging
import psutil
from datetime import timedelta
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger('fugusau.security')


# ─── 1. System Health Snapshot (every 5 min) ──────────────────────────────────

@shared_task(name='fugusau.apps.security.tasks.take_health_snapshot')
def take_health_snapshot():
    """Write a SystemHealthSnapshot row every 5 minutes."""
    from fugusau.apps.security.models import (
        SystemHealthSnapshot, BlockedIP, SecurityEvent, UserSession
    )
    try:
        cpu    = psutil.cpu_percent(interval=1)
        mem    = psutil.virtual_memory().percent
        rpm    = _get_rpm()
        err_rt = _get_error_rate()
    except Exception:
        cpu = mem = rpm = err_rt = 0

    try:
        from django.db import connection
        db_conn = len(connection.queries)
    except Exception:
        db_conn = 0

    SystemHealthSnapshot.objects.create(
        active_users=UserSession.objects.filter(is_active=True).count(),
        requests_per_minute=rpm,
        error_rate=err_rt,
        blocked_ips_count=BlockedIP.objects.filter(is_active=True).count(),
        open_threats_count=SecurityEvent.objects.filter(status='open').count(),
        cpu_usage=cpu,
        memory_usage=mem,
        db_connections=db_conn,
    )
    logger.debug(f'Health snapshot: CPU={cpu}% MEM={mem}%')


def _get_rpm():
    """Approximate requests/min from cache counter."""
    try:
        count = cache.get('global_req_count_last_min', 0)
        return float(count)
    except Exception:
        return 0.0


def _get_error_rate():
    """Approximate 4xx/5xx rate from cache counter."""
    try:
        total = cache.get('global_req_count_last_min', 1) or 1
        errors = cache.get('global_error_count_last_min', 0)
        return round((errors / total) * 100, 2)
    except Exception:
        return 0.0


# ─── 2. Security Alert Dispatcher (every 1 min) ───────────────────────────────

@shared_task(name='fugusau.apps.security.tasks.dispatch_security_alerts')
def dispatch_security_alerts():
    """
    Scan cache for pending security alerts written by SecurityMiddleware.
    Notify on-duty analysts via email.
    """
    from fugusau.apps.security.models import SecurityAnalystProfile

    # Collect all pending alert keys
    try:
        keys = cache.keys('security_alert_*')  # works with Redis cache backend
    except Exception:
        # Fallback: scan SecurityEvent for recent unnotified critical events
        keys = []

    if not keys:
        _dispatch_from_db()
        return

    on_duty = SecurityAnalystProfile.objects.filter(
        on_duty=True, alert_email__isnull=False
    ).exclude(alert_email='')

    if not on_duty.exists():
        logger.warning('Security alert pending but no analyst is on duty.')
        return

    for key in keys:
        alert = cache.get(key)
        if not alert:
            continue
        for analyst in on_duty:
            _send_alert_email(analyst, alert)
        cache.delete(key)


def _dispatch_from_db():
    """
    Fallback: email on-duty analysts about open critical/high events
    created in the last 2 minutes that haven't been notified yet.
    """
    from fugusau.apps.security.models import SecurityEvent, SecurityAnalystProfile

    cutoff = timezone.now() - timedelta(minutes=2)
    new_critical = SecurityEvent.objects.filter(
        timestamp__gte=cutoff,
        threat_level__in=['critical', 'high'],
        status='open',
        extra_data__notified__isnull=True,  # not yet notified
    )
    if not new_critical.exists():
        return

    on_duty = SecurityAnalystProfile.objects.filter(
        on_duty=True
    ).exclude(alert_email='')

    for event in new_critical:
        for analyst in on_duty:
            _send_alert_email(analyst, {
                'type': event.event_type,
                'level': event.threat_level,
                'description': event.description,
                'ip': str(event.ip_address),
                'path': event.request_path,
                'timestamp': event.timestamp.isoformat(),
            })
        # Mark as notified
        extra = event.extra_data or {}
        extra['notified'] = timezone.now().isoformat()
        event.extra_data = extra
        event.save(update_fields=['extra_data'])


def _send_alert_email(analyst, alert: dict):
    """Send a security alert email to one analyst."""
    from django.core.mail import send_mail
    try:
        level = alert.get('level', 'high').upper()
        event_type = alert.get('type', 'SECURITY_EVENT')
        subject = f'[FUGUSAU SECURITY] {level} — {event_type}'
        body = (
            f"Security alert detected on FUGUSAU Portal\n\n"
            f"Event type : {event_type}\n"
            f"Threat level: {level}\n"
            f"Description : {alert.get('description', '')}\n"
            f"Source IP   : {alert.get('ip', 'unknown')}\n"
            f"Endpoint    : {alert.get('path', '')}\n"
            f"Timestamp   : {alert.get('timestamp', '')}\n\n"
            f"Action: Log in to the Security Dashboard to review and resolve this event.\n"
            f"Dashboard: {getattr(settings, 'FRONTEND_URL', 'https://portal.fugusau.edu.ng')}/security\n"
        )
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'security@fugusau.edu.ng'),
            recipient_list=[analyst.alert_email],
            fail_silently=False,
        )
        logger.info(f'Alert email sent to analyst {analyst.analyst_id}: {event_type}')
    except Exception as exc:
        logger.error(f'Failed to send alert email to {analyst.alert_email}: {exc}')


# ─── 3. Cleanup Expired IP Blocks (daily 3AM) ────────────────────────────────

@shared_task(name='fugusau.apps.security.tasks.cleanup_expired_blocks')
def cleanup_expired_blocks():
    """Deactivate BlockedIP entries whose expiry has passed."""
    from fugusau.apps.security.models import BlockedIP

    expired = BlockedIP.objects.filter(
        is_active=True,
        expires_at__lt=timezone.now()
    )
    count = expired.count()
    expired.update(is_active=False)

    # Evict from cache
    for ip_obj in BlockedIP.objects.filter(is_active=False, expires_at__gte=timezone.now() - timedelta(hours=1)):
        cache.delete(f'blocked_ip_{ip_obj.ip_address}')

    logger.info(f'Cleaned up {count} expired IP blocks.')
    return count


# ─── 4. Cleanup Old Security Events (daily 4AM) ──────────────────────────────

@shared_task(name='fugusau.apps.security.tasks.cleanup_old_events')
def cleanup_old_events():
    """
    Delete resolved/false_positive events older than 90 days.
    Keep open and critical events indefinitely.
    """
    from fugusau.apps.security.models import SecurityEvent, SystemHealthSnapshot

    cutoff = timezone.now() - timedelta(days=90)

    deleted_events, _ = SecurityEvent.objects.filter(
        timestamp__lt=cutoff,
        status__in=['resolved', 'false_positive'],
        threat_level__in=['low', 'medium'],
    ).delete()

    # Keep only last 30 days of health snapshots
    health_cutoff = timezone.now() - timedelta(days=30)
    deleted_health, _ = SystemHealthSnapshot.objects.filter(
        timestamp__lt=health_cutoff
    ).delete()

    logger.info(f'Cleanup: {deleted_events} old events, {deleted_health} health snapshots removed.')
    return {'events': deleted_events, 'health_snapshots': deleted_health}


# ─── 5. Geo-IP Lookup (called inline by middleware, async to avoid lag) ───────

@shared_task(name='fugusau.apps.security.tasks.enrich_event_geo')
def enrich_event_geo(event_id: str):
    """
    Async geo-IP enrichment. Called after SecurityEvent is created.
    Fills country + city fields using MaxMind GeoLite2.

    Requires:
        pip install geoip2
        GEOIP_PATH = '/opt/geoip/'   # in settings (put GeoLite2-City.mmdb there)
    """
    from fugusau.apps.security.models import SecurityEvent
    try:
        event = SecurityEvent.objects.get(pk=event_id)
        if not event.ip_address or event.country:
            return  # already enriched or no IP

        geoip_path = getattr(settings, 'GEOIP_PATH', None)
        if not geoip_path:
            return

        import geoip2.database
        import os
        db_file = os.path.join(geoip_path, 'GeoLite2-City.mmdb')
        if not os.path.exists(db_file):
            return

        with geoip2.database.Reader(db_file) as reader:
            resp = reader.city(str(event.ip_address))
            event.country = resp.country.name or ''
            event.city    = resp.city.name or ''
            event.save(update_fields=['country', 'city'])

            # Also enrich UserSession if this was a login event
            if event.user and event.event_type in ('SUSPICIOUS_LOGIN', 'MULTIPLE_FAILED_LOGIN'):
                from fugusau.apps.security.models import UserSession
                UserSession.objects.filter(
                    user=event.user,
                    ip_address=str(event.ip_address),
                    country='',
                ).update(country=event.country, city=event.city)

    except Exception as exc:
        logger.debug(f'Geo enrichment skipped for event {event_id}: {exc}')


# ─── 6. Unusual Location Detector ────────────────────────────────────────────

@shared_task(name='fugusau.apps.security.tasks.detect_unusual_location')
def detect_unusual_location(user_id: str, ip_address: str, session_id: str):
    """
    Called after login. Flags login from an unusual country.
    Compare against the user's last 5 known login countries.
    """
    from fugusau.apps.security.models import UserSession, SecurityEvent

    geoip_path = getattr(settings, 'GEOIP_PATH', None)
    if not geoip_path:
        return

    try:
        import geoip2.database
        import os

        db_file = os.path.join(geoip_path, 'GeoLite2-City.mmdb')
        if not os.path.exists(db_file):
            return

        with geoip2.database.Reader(db_file) as reader:
            resp = reader.city(ip_address)
            current_country = resp.country.name or ''
            current_city    = resp.city.name or ''

        # Update the new session
        UserSession.objects.filter(pk=session_id).update(
            country=current_country, city=current_city
        )

        if not current_country:
            return

        # Get historical countries for this user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(pk=user_id)

        known_countries = set(
            UserSession.objects.filter(
                user=user,
                country__isnull=False,
            ).exclude(
                pk=session_id
            ).exclude(country='').order_by('-login_at')[:20]
            .values_list('country', flat=True)
        )

        if known_countries and current_country not in known_countries:
            # Mark session suspicious
            UserSession.objects.filter(pk=session_id).update(is_suspicious=True)

            SecurityEvent.objects.create(
                event_type='UNUSUAL_LOCATION',
                threat_level='medium',
                description=(
                    f'Login from unusual location: {current_city}, {current_country} '
                    f'for {user.email}. Known countries: {", ".join(list(known_countries)[:5])}'
                ),
                user=user,
                ip_address=ip_address,
                country=current_country,
                city=current_city,
                action_taken='Session flagged as suspicious',
            )
            logger.warning(
                f'Unusual location login: {user.email} from {current_country} '
                f'(known: {known_countries})'
            )
    except Exception as exc:
        logger.debug(f'Unusual location check failed: {exc}')

"""
Add to fugusau/apps/security/tasks.py
This task is already scheduled in celery.py under 'audit-log-housekeeping'
but was never implemented.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('fugusau.security')


@shared_task(name='fugusau.apps.security.tasks.cleanup_old_audit_logs')
def cleanup_old_audit_logs():
    """
    Scheduled: every Sunday 5AM (see celery.py beat_schedule).
    Deletes AuditLog records older than 1 year (365 days).
    Keeps security-sensitive actions (ACCOUNT_SUSPEND, GRADE_UPLOAD, GRADE_EDIT) for 3 years.
    """
    from fugusau.apps.users.models import AuditLog

    standard_cutoff    = timezone.now() - timedelta(days=365)
    sensitive_cutoff   = timezone.now() - timedelta(days=365 * 3)

    SENSITIVE_ACTIONS = {'ACCOUNT_SUSPEND', 'GRADE_UPLOAD', 'GRADE_EDIT', 'PAYMENT'}

    # Delete old non-sensitive logs
    deleted_standard, _ = AuditLog.objects.filter(
        timestamp__lt=standard_cutoff
    ).exclude(
        action__in=SENSITIVE_ACTIONS
    ).delete()

    # Delete sensitive logs older than 3 years
    deleted_sensitive, _ = AuditLog.objects.filter(
        timestamp__lt=sensitive_cutoff,
        action__in=SENSITIVE_ACTIONS
    ).delete()

    total = deleted_standard + deleted_sensitive
    logger.info(
        'Audit log cleanup: %d standard + %d sensitive = %d total deleted',
        deleted_standard, deleted_sensitive, total
    )
    return {
        'deleted_standard': deleted_standard,
        'deleted_sensitive': deleted_sensitive,
        'total_deleted': total,
    }
