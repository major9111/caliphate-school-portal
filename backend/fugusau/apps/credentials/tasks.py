"""FUGUSAU Portal — Credential Analysis Celery Tasks

If Celery/Redis is not yet configured in your environment, these tasks
still work: Django-Celery will execute them synchronously when no broker
is reachable, or you can call the underlying service directly.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('fugusau.credentials')


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def analyze_credential_async(self, credential_id: str):
    """
    Async Celery task: run AI forgery analysis on a uploaded credential.

    Triggered automatically after every document upload via
    CredentialListCreateView.perform_create().

    Args:
        credential_id: UUID string of the Credential record to analyse.
    """
    from .models import Credential
    from .services import forgery_detector
    from fugusau.apps.notifications.utils import send_notification

    try:
        credential = Credential.objects.get(id=credential_id)
    except Credential.DoesNotExist:
        logger.error('analyze_credential_async: credential %s not found', credential_id)
        return

    logger.info('Starting AI analysis for credential %s (%s)', credential_id, credential.doc_type)

    try:
        findings = forgery_detector.analyze_document(
            image_path=credential.file.path,
            doc_type=credential.doc_type,
        )

        credential.forgery_risk_score = findings.get('risk_score', 0)
        credential.ai_verdict = findings.get('verdict', 'PENDING')
        credential.ai_findings = findings
        credential.extracted_text = findings.get('extracted_text', '')

        # Map AI verdict → credential status
        verdict_map = {
            'AUTHENTIC':     Credential.AUTHENTIC,
            'SUSPICIOUS':    Credential.SUSPICIOUS,
            'LIKELY_FORGED': Credential.FORGED,
        }
        new_status = verdict_map.get(findings.get('verdict'), Credential.PENDING)
        credential.status = new_status
        credential.save()

        logger.info(
            'Credential %s analysed — verdict: %s, risk score: %s',
            credential_id, credential.ai_verdict, credential.forgery_risk_score,
        )

        # Alert admins when a document is flagged as likely forged
        if findings.get('verdict') == 'LIKELY_FORGED':
            send_notification(
                user_ids='admins',
                title='Forged Document Detected',
                message=(
                    f'Document from {credential.student.matric_number} flagged as likely '
                    f'forged. Risk score: {findings["risk_score"]}/100'
                ),
                notification_type='ALERT',
            )

    except Exception as exc:
        logger.exception('AI analysis failed for credential %s: %s', credential_id, exc)
        # Retry up to max_retries times with exponential back-off
        raise self.retry(exc=exc)
