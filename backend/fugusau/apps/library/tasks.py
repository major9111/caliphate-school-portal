"""
FUGUSAU Portal — Library App Tasks
Path: fugusau/apps/library/tasks.py

Fix #5: check_overdue_books was scheduled in Celery beat but this file
didn't exist. The worker logged import errors every day at 9AM.
"""
import logging
from decimal import Decimal
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Fine per overdue day (₦ — adjust in settings if desired)
FINE_PER_DAY = Decimal('50.00')


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def check_overdue_books(self) -> dict:
    """
    Scheduled daily at 9AM (see celery.py beat_schedule).
    1. Finds all BorrowRecords that are past their due_date and still BORROWED.
    2. Flips their status to OVERDUE.
    3. Accrues fine at FINE_PER_DAY per day overdue.
    4. Sends an in-app notification to each affected borrower.

    Returns:
        dict with marked_overdue and notifications_sent counts
    """
    try:
        from fugusau.apps.library.models import BorrowRecord
        from fugusau.apps.notifications.models import Notification

        today = timezone.now().date()

        overdue_records = BorrowRecord.objects.filter(
            status=BorrowRecord.BORROWED,
            due_date__lt=today,
        ).select_related('book', 'borrower')

        marked     = 0
        notified   = 0
        skipped    = 0

        for record in overdue_records:
            days_overdue = (today - record.due_date).days
            new_fine     = FINE_PER_DAY * days_overdue

            record.status      = BorrowRecord.OVERDUE
            record.fine_amount = new_fine
            record.save(update_fields=['status', 'fine_amount'])
            marked += 1

            user = record.borrower
            if not user.is_active:
                skipped += 1
                continue

            title = f'Overdue Book: {record.book.title[:60]}'

            # One notification per book per day (dedup on title + recipient + date)
            already_sent = Notification.objects.filter(
                recipient=user,
                title=title,
                created_at__date=today,
            ).exists()

            if already_sent:
                skipped += 1
                continue

            Notification.objects.create(
                recipient=user,
                title=title,
                message=(
                    f'"{record.book.title}" was due on {record.due_date.strftime("%d %b %Y")} '
                    f'({days_overdue} day(s) ago). '
                    f'Accrued fine: ₦{new_fine:,.2f}. '
                    f'Please return the book to the library immediately to avoid further charges.'
                ),
                notif_type='danger',
            )
            notified += 1

        logger.info(
            'check_overdue_books: marked_overdue=%d notifications_sent=%d skipped=%d',
            marked, notified, skipped,
        )
        return {'marked_overdue': marked, 'notifications_sent': notified, 'skipped': skipped}

    except Exception as exc:
        logger.error('check_overdue_books error: %s', exc)
        raise self.retry(exc=exc)
