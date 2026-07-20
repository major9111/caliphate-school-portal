"""Email service — SMTP with Jinja2 HTML templates.

Falls back gracefully (logs to console) if SMTP is not configured,
so the app works in dev without email credentials.
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional
from jinja2 import Environment, BaseLoader
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── HTML email templates ──────────────────────────────────────────────────────

_PASSWORD_RESET_TMPL = """
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#1e40af;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">{{ school_name }}</h1>
    <p style="color:#bfdbfe;margin:8px 0 0">Password Reset Request</p>
  </div>
  <div style="padding:32px">
    <p>Hello <strong>{{ full_name }}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{{ reset_link }}" style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Reset Password</a>
    </div>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#6b7280;font-size:12px">{{ school_name }} | {{ school_address }}<br>{{ school_phone }} | {{ school_email }}</p>
  </div>
</div></body></html>
"""

_ADMISSION_STATUS_TMPL = """
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#1e40af;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">{{ school_name }}</h1>
    <p style="color:#bfdbfe;margin:8px 0 0">Admission Update</p>
  </div>
  <div style="padding:32px">
    <p>Dear <strong>{{ parent_name }}</strong>,</p>
    <p>We are writing regarding the application of <strong>{{ applicant_name }}</strong> (Application No: <strong>{{ application_number }}</strong>).</p>
    {% if status == 'approved' %}
    <div style="background:#d1fae5;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:20px 0">
      <strong style="color:#065f46">🎉 Congratulations! The application has been APPROVED.</strong>
    </div>
    <p>Please visit the school office with the following documents to complete enrolment:</p>
    <ul><li>Birth certificate</li><li>Previous school results</li><li>Passport photographs (2)</li><li>Payment of acceptance fee</li></ul>
    {% elif status == 'rejected' %}
    <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin:20px 0">
      <strong style="color:#991b1b">The application was not successful at this time.</strong>
    </div>
    <p>We appreciate your interest in {{ school_name }} and encourage you to apply again in the future.</p>
    {% else %}
    <p>The status of the application has been updated to: <strong>{{ status | upper }}</strong></p>
    {% endif %}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#6b7280;font-size:12px">{{ school_name }} | {{ school_address }}<br>{{ school_phone }} | {{ school_email }}</p>
  </div>
</div></body></html>
"""

_FEE_REMINDER_TMPL = """
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#1e40af;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">{{ school_name }}</h1>
    <p style="color:#bfdbfe;margin:8px 0 0">Fee Payment Reminder</p>
  </div>
  <div style="padding:32px">
    <p>Dear <strong>{{ parent_name }}</strong>,</p>
    <p>This is a reminder that fees are due for <strong>{{ student_name }}</strong> ({{ class_name }}) for <strong>{{ term }}</strong>.</p>
    <div style="background:#fef3c7;border:1px solid #f59e0b;padding:16px;border-radius:8px;margin:20px 0">
      <p style="margin:0"><strong>Outstanding Amount:</strong> ₦{{ amount_due | int | format_number }}</p>
      <p style="margin:8px 0 0"><strong>Due Date:</strong> {{ due_date }}</p>
    </div>
    <p>Please visit the school bursary to make payment. Online bank transfer details:</p>
    <ul><li>Bank: First Bank Nigeria</li><li>Account Name: {{ school_name }}</li><li>Account Number: 0123456789</li></ul>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#6b7280;font-size:12px">{{ school_name }} | {{ school_phone }} | {{ school_email }}</p>
  </div>
</div></body></html>
"""

_ACCOUNT_CREATED_TMPL = """
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#1e40af;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">{{ school_name }}</h1>
    <p style="color:#bfdbfe;margin:8px 0 0">Welcome to the School Portal</p>
  </div>
  <div style="padding:32px">
    <p>Dear <strong>{{ full_name }}</strong>,</p>
    <p>Your student portal account has been created. Use the credentials below to log in:</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:16px;border-radius:8px;margin:20px 0;font-family:monospace">
      <p style="margin:0"><strong>Portal URL:</strong> {{ portal_url }}</p>
      <p style="margin:8px 0 0"><strong>Username:</strong> {{ username }}</p>
      <p style="margin:8px 0 0"><strong>Password:</strong> {{ password }}</p>
    </div>
    <p style="color:#ef4444;font-weight:bold">⚠ Please change your password immediately after first login.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#6b7280;font-size:12px">{{ school_name }} | {{ school_phone }} | {{ school_email }}</p>
  </div>
</div></body></html>
"""

_jinja = Environment(loader=BaseLoader())
_jinja.filters["format_number"] = lambda value: f"{int(value):,}"


def _render(template_str: str, **ctx) -> str:
    return _jinja.from_string(template_str).render(
        school_name=settings.SCHOOL_NAME,
        school_address=settings.SCHOOL_ADDRESS,
        school_phone=settings.SCHOOL_PHONE,
        school_email=settings.SCHOOL_EMAIL,
        **ctx
    )


def _send(to_email: str, subject: str, html_body: str, attachment_bytes: Optional[bytes] = None, attachment_name: Optional[str] = None) -> bool:
    """Send an email. Returns True on success, False on failure (non-fatal)."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(f"[EMAIL-DEV] To: {to_email} | Subject: {subject}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        if attachment_bytes and attachment_name:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename={attachment_name}")
            msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def send_password_reset(to_email: str, full_name: str, reset_token: str) -> bool:
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    html = _render(_PASSWORD_RESET_TMPL, full_name=full_name, reset_link=reset_link)
    return _send(to_email, f"Password Reset — {settings.SCHOOL_NAME}", html)


def send_admission_status(to_email: str, parent_name: str, applicant_name: str,
                          application_number: str, status: str) -> bool:
    html = _render(_ADMISSION_STATUS_TMPL, parent_name=parent_name,
                   applicant_name=applicant_name, application_number=application_number, status=status)
    subject = f"Admission Update — {applicant_name} | {settings.SCHOOL_NAME}"
    return _send(to_email, subject, html)


def send_fee_reminder(to_email: str, parent_name: str, student_name: str,
                      class_name: str, term: str, amount_due: float, due_date: str) -> bool:
    html = _render(_FEE_REMINDER_TMPL, parent_name=parent_name, student_name=student_name,
                   class_name=class_name, term=term, amount_due=amount_due, due_date=due_date)
    return _send(to_email, f"Fee Payment Reminder — {student_name} | {settings.SCHOOL_NAME}", html)


def send_account_created(to_email: str, full_name: str, username: str, password: str) -> bool:
    html = _render(_ACCOUNT_CREATED_TMPL, full_name=full_name, username=username,
                   password=password, portal_url=settings.FRONTEND_URL)
    return _send(to_email, f"Your School Portal Account — {settings.SCHOOL_NAME}", html)


def send_with_attachment(to_email: str, subject: str, body_html: str,
                         attachment_bytes: bytes, attachment_name: str) -> bool:
    return _send(to_email, subject, body_html, attachment_bytes, attachment_name)
