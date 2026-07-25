"""FUGUSAU Portal — Notifications Utility"""
import logging
import threading
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger('fugusau.notifications')
User = get_user_model()

# Map caller-facing type labels → model's notif_type choices.
# Callers pass 'ALERT', 'CREDENTIAL', 'INFO', etc.
_TYPE_MAP = {
    'INFO':       'info',
    'WARNING':    'warning',
    'SUCCESS':    'success',
    'DANGER':     'danger',
    'ALERT':      'danger',    # Security / forgery alerts → danger styling
    'CREDENTIAL': 'info',      # Credential status updates → info styling
    # pass-through for values already in model format
    'info':       'info',
    'warning':    'warning',
    'success':    'success',
    'danger':     'danger',
}


def _send_email_async(emails, title, message):
    try:
        send_mail(
            subject=title,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@fugusau.edu.ng',
            recipient_list=emails,
            fail_silently=True
        )
    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")


def send_email_notification(emails, title, message):
    if not emails:
        return
    thread = threading.Thread(target=_send_email_async, args=(emails, title, message))
    thread.start()


def send_notification(user_ids, title: str, message: str,
                      notification_type: str = 'INFO', data: dict = None):
    """
    Persist and real-time push a notification to one or more users.

    Args:
        user_ids:          list of user UUIDs, or the string 'admins' to
                           target every active staff member.
        title:             Short notification heading.
        message:           Full notification body.
        notification_type: INFO | WARNING | SUCCESS | DANGER | ALERT | CREDENTIAL.
                           Unknown values fall back to 'info'.
        data:              Optional extra dict attached to the WebSocket payload.
    """
    from .models import Notification

    # Resolve target users
    if user_ids == 'admins':
        users = User.objects.filter(is_staff=True, is_active=True)
    else:
        users = User.objects.filter(id__in=user_ids, is_active=True)

    # Map caller-provided type string → valid model field value
    notif_type = _TYPE_MAP.get(str(notification_type).upper(),
                               _TYPE_MAP.get(notification_type, 'info'))

    channel_layer = get_channel_layer()
    notifications = []

    for user in users:
        # Use correct field names: recipient (not user), notif_type (not notification_type)
        notif = Notification(
            recipient=user,
            title=title,
            message=message,
            notif_type=notif_type,
        )
        notifications.append(notif)

        # Push via WebSocket to connected users (non-fatal if WS is down)
        try:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{user.id}',
                {
                    'type': 'notification_message',
                    'notification': {
                        'title': title,
                        'message': message,
                        'type': notification_type,
                        'data': data or {},
                    },
                }
            )
        except Exception as exc:
            logger.warning('WebSocket notification failed for %s: %s', user.id, exc)

    Notification.objects.bulk_create(notifications)
    logger.info('Sent notification "%s" to %d users', title, len(notifications))

    # Dispatch email notifications asynchronously
    emails = [u.email for u in users if u.email]
    if emails:
        send_email_notification(emails, f"[FUGUSAU Portal] {title}", message)
