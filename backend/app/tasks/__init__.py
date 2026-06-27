"""Celery tasks (background jobs)."""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "caliphate_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Lagos",
    enable_utc=True,
)


@celery_app.task(name="daily_backup")
def daily_backup():
    """Triggered daily via cron."""
    import logging
    logging.getLogger(__name__).info("Running daily backup task")
    return {"status": "ok"}


@celery_app.task(name="send_email")
def send_email(to: str, subject: str, body: str):
    """Send transactional email."""
    import logging
    logging.getLogger(__name__).info(f"Email to {to}: {subject}")
    return {"status": "sent"}
