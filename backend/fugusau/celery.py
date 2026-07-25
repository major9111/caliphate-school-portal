"""
FUGUSAU Portal — Updated Celery Configuration
Drop-in replacement for: fugusau/celery.py

Adds all security-related scheduled tasks to the existing beat_schedule.
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fugusau.settings.development')

app = Celery('fugusau')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ─── Existing Domain Tasks ─────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Send fee payment reminders daily at 8AM
    'fee-payment-reminders': {
        'task': 'fugusau.apps.fees.tasks.send_fee_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    # Check overdue library books daily at 9AM
    'library-overdue-check': {
        'task': 'fugusau.apps.library.tasks.check_overdue_books',
        'schedule': crontab(hour=9, minute=0),
    },
    # Send exam reminders daily at 7AM
    'exam-reminders': {
        'task': 'fugusau.apps.exams.tasks.send_exam_reminders',
        'schedule': crontab(hour=7, minute=0),
    },
    # Update attendance statistics every night
    'attendance-stats-update': {
        'task': 'fugusau.apps.courses.tasks.update_attendance_stats',
        'schedule': crontab(hour=23, minute=59),
    },
    # Clean expired JWT tokens weekly (Sunday 2AM)
    'clean-expired-tokens': {
        'task': 'fugusau.apps.users.tasks.clean_expired_tokens',
        'schedule': crontab(day_of_week=0, hour=2, minute=0),
    },
    # Expire pending admission offers (midnight daily)
    'expire-pending-offers': {
        'task': 'fugusau.apps.admissions.tasks.expire_pending_offers',
        'schedule': crontab(hour=0, minute=0),
    },
    # Admission deadline reminders (8:30AM daily)
    'admission-deadline-reminders': {
        'task': 'fugusau.apps.admissions.tasks.check_admission_deadlines',
        'schedule': crontab(hour=8, minute=30),
    },
}

# ─── Security Tasks ────────────────────────────────────────────────────────────
app.conf.beat_schedule.update({

    # System health snapshot every 5 minutes
    'security-health-snapshot': {
        'task': 'fugusau.apps.security.tasks.take_health_snapshot',
        'schedule': crontab(minute='*/5'),
    },

    # Alert dispatcher — scan for unnotified high/critical events every minute
    'security-alert-dispatcher': {
        'task': 'fugusau.apps.security.tasks.dispatch_security_alerts',
        'schedule': crontab(minute='*/1'),
    },

    # Clean expired IP blocks (3AM daily)
    'security-cleanup-expired-blocks': {
        'task': 'fugusau.apps.security.tasks.cleanup_expired_blocks',
        'schedule': crontab(hour=3, minute=0),
    },

    # Purge old resolved security events + stale health snapshots (4AM daily)
    'security-cleanup-old-events': {
        'task': 'fugusau.apps.security.tasks.cleanup_old_events',
        'schedule': crontab(hour=4, minute=0),
    },

    # Audit log housekeeping — keep only 1 year (5AM Sunday)
    'audit-log-housekeeping': {
        'task': 'fugusau.apps.security.tasks.cleanup_old_audit_logs',
        'schedule': crontab(day_of_week=0, hour=5, minute=0),
    },
})

# ─── Celery settings ───────────────────────────────────────────────────────────
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Africa/Lagos',          # WAT — adjust if needed
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,              # Only ack after task completes (safer)
    worker_prefetch_multiplier=1,     # Prevent worker starvation
    task_soft_time_limit=300,         # 5-min soft limit
    task_time_limit=600,              # 10-min hard kill
    broker_connection_retry_on_startup=True,
)
