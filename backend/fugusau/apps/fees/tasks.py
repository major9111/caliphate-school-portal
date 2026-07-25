"""
FUGUSAU Portal — Fees App Tasks
Path: fugusau/apps/fees/tasks.py

Fix #4: send_fee_reminders was in the Celery beat schedule but this file
didn't exist. Every day at 8AM the worker logged errors because the task
module could not be imported.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_fee_reminders(self) -> dict:
    """
    Scheduled daily at 8AM (see celery.py beat_schedule).
    Sends in-app notifications to students with unpaid/overdue invoices,
    and flips invoices past their due_date to OVERDUE status.

    Returns:
        dict with overdue_marked, notifications_sent counts
    """
    try:
        from fugusau.apps.fees.models import Invoice
        from fugusau.apps.notifications.models import Notification

        today = timezone.now().date()

        # ── 1. Mark past-due pending/partial invoices as OVERDUE ────────────
        newly_overdue = Invoice.objects.filter(
            status__in=[Invoice.PENDING, Invoice.PARTIAL],
            due_date__lt=today,
        )
        overdue_count = newly_overdue.count()
        newly_overdue.update(status=Invoice.OVERDUE)

        # ── 2. Notify students with any unpaid balance ───────────────────────
        unpaid_invoices = Invoice.objects.filter(
            status__in=[Invoice.PENDING, Invoice.PARTIAL, Invoice.OVERDUE],
        ).select_related('student__user')

        sent    = 0
        skipped = 0

        for invoice in unpaid_invoices:
            user = invoice.student.user
            if not user.is_active:
                skipped += 1
                continue

            days_overdue = (today - invoice.due_date).days
            if days_overdue > 0:
                urgency    = f'Your invoice INV-{invoice.invoice_no} is {days_overdue} day(s) OVERDUE.'
                notif_type = 'danger'
            else:
                days_left  = (invoice.due_date - today).days
                urgency    = (
                    f'Your invoice INV-{invoice.invoice_no} is due in {days_left} day(s).'
                    if days_left > 0
                    else f'Your invoice INV-{invoice.invoice_no} is due TODAY.'
                )
                notif_type = 'warning'

            title = f'Fee Payment Reminder — INV-{invoice.invoice_no}'

            # One reminder per invoice per day (dedup on title + recipient + date)
            already_sent = Notification.objects.filter(
                recipient=user,
                title=title,
                created_at__date=today,
            ).exists()

            if already_sent:
                skipped += 1
                continue

            balance = invoice.total_amount - invoice.amount_paid
            Notification.objects.create(
                recipient=user,
                title=title,
                message=(
                    f'{urgency} Outstanding balance: ₦{balance:,.2f}. '
                    f'Please log in to the portal to complete your payment.'
                ),
                notif_type=notif_type,
            )
            sent += 1

        logger.info(
            'send_fee_reminders: overdue_marked=%d notifications_sent=%d skipped=%d',
            overdue_count, sent, skipped,
        )
        return {'overdue_marked': overdue_count, 'notifications_sent': sent, 'skipped': skipped}

    except Exception as exc:
        logger.error('send_fee_reminders error: %s', exc)
        raise self.retry(exc=exc)
