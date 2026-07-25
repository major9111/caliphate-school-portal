"""FUGUSAU Portal — Admissions Celery Tasks"""
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('fugusau.admissions')


@shared_task(bind=True, max_retries=3)
def send_offer_email(self, application_id: str):
    """Send admission offer letter email + SMS to applicant"""
    try:
        from .models import Application
        app = Application.objects.select_related(
            'offered_department__faculty', 'session', 'offer'
        ).get(id=application_id)

        subject = f'FUGUSAU Admission Offer — {app.session.session_name} | {app.application_no}'
        expires = app.offer_expires_at.strftime('%d %B %Y') if app.offer_expires_at else 'N/A'
        dept    = app.offered_department.name if app.offered_department else 'Your Department'
        fee     = app.offer.acceptance_fee if hasattr(app, 'offer') else 25000

        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
          <div style="background:#006B3F;padding:24px;text-align:center">
            <h1 style="color:#F5C842;margin:0;font-size:22px">FEDERAL UNIVERSITY GUSAU</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Office of the Registrar — Admissions</p>
          </div>
          <div style="padding:30px;background:white">
            <h2 style="color:#006B3F">Dear {app.get_full_name()},</h2>
            <p style="font-size:15px;color:#333;line-height:1.6">
              We are pleased to inform you that following a careful review of your application
              (<strong>{app.application_no}</strong>), you have been offered provisional admission
              into the <strong>{app.programme}</strong> programme in the
              <strong>Department of {dept}</strong>
              for the <strong>{app.session.session_name} Academic Session</strong>.
            </p>
            <div style="background:#E8F5ED;border-left:4px solid #006B3F;padding:16px;border-radius:8px;margin:20px 0">
              <p style="margin:0;font-size:13px;color:#006B3F;font-weight:bold">OFFER DETAILS</p>
              <p style="margin:6px 0 0;font-size:13px;color:#333">
                Programme: {app.programme} — {dept}<br>
                Session: {app.session.session_name}<br>
                Offer Expires: <strong style="color:#E53E3E">{expires}</strong><br>
                Acceptance Fee: <strong>₦{fee:,.0f}</strong>
              </p>
            </div>
            <p style="font-size:14px;color:#555">
              To <strong>ACCEPT</strong> this offer, log in to the FUGUSAU Student Portal at
              <a href="{settings.FRONTEND_URL}/admissions" style="color:#006B3F">portal.fugusau.edu.ng/admissions</a>
              before <strong>{expires}</strong>.
            </p>
            <div style="background:#FFF8E1;border:1px solid #F5C842;padding:14px;border-radius:8px;margin:16px 0">
              <p style="margin:0;font-size:12px;color:#333">
                <strong>Important:</strong> This offer expires on {expires}.
                Failure to respond by this date will result in automatic cancellation.
                Offers are non-transferable.
              </p>
            </div>
            <p style="font-size:12px;color:#999;margin-top:24px">
              Federal University Gusau, P.M.B. 1001, Gusau, Zamfara State.<br>
              Tel: +234 000 000 0000 | Email: admissions@fugusau.edu.ng
            </p>
          </div>
        </div>
        """

        _send_email(app.email, subject, html_body)
        _send_sms(
            app.phone,
            f'FUGUSAU: Congratulations {app.first_name}! You have been offered admission to '
            f'{dept}. Log in to portal.fugusau.edu.ng to accept. Offer expires {expires}.'
        )

        # Mark email as sent
        if hasattr(app, 'offer'):
            app.offer.email_sent = True
            app.offer.sms_sent   = True
            app.offer.save(update_fields=['email_sent', 'sms_sent'])

        logger.info(f'Offer email sent to {app.email} for {app.application_no}')

    except Exception as exc:
        logger.error(f'Failed to send offer email for {application_id}: {exc}')
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def send_rejection_email(self, application_id: str):
    """Send rejection notification"""
    try:
        from .models import Application
        app = Application.objects.get(id=application_id)

        subject = f'FUGUSAU Admission Update — {app.application_no}'
        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#006B3F;padding:20px;text-align:center">
            <h1 style="color:#F5C842;margin:0;font-size:20px">FEDERAL UNIVERSITY GUSAU</h1>
          </div>
          <div style="padding:24px;background:white">
            <p>Dear {app.get_full_name()},</p>
            <p>Thank you for your interest in Federal University Gusau and for taking the time to apply
            for the {app.session.session_name} academic session (Application No: {app.application_no}).</p>
            <p>After a thorough review of all applications, we regret to inform you that we are unable
            to offer you admission at this time.</p>
            <p>We encourage you to apply again in future admission cycles. You may also consider
            other programmes or institutions.</p>
            <p>We wish you the very best in your academic journey.</p>
            <p>Sincerely,<br><strong>Registrar's Office</strong><br>Federal University Gusau</p>
          </div>
        </div>
        """
        _send_email(app.email, subject, html_body)
        _send_sms(app.phone, f'FUGUSAU: Dear {app.first_name}, your application {app.application_no} was unsuccessful. We wish you the best. Apply again next session.')
        logger.info(f'Rejection email sent to {app.email}')
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def send_acceptance_confirmation(self, application_id: str):
    """Confirm acceptance to applicant"""
    try:
        from .models import Application
        app = Application.objects.get(id=application_id)

        subject = f'Admission Confirmed — Welcome to FUGUSAU! | {app.application_no}'
        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#006B3F;padding:20px;text-align:center">
            <h1 style="color:#F5C842;margin:0;font-size:20px">WELCOME TO FUGUSAU!</h1>
          </div>
          <div style="padding:24px;background:white">
            <h2 style="color:#006B3F">Congratulations, {app.first_name}!</h2>
            <p>Your admission to <strong>{app.offered_department.name if app.offered_department else "FUGUSAU"}</strong>
            has been confirmed. You are now an official student of Federal University Gusau.</p>
            <div style="background:#E8F5ED;padding:16px;border-radius:8px;margin:16px 0">
              <p style="margin:0;font-weight:bold;color:#006B3F">NEXT STEPS:</p>
              <ol style="margin:8px 0 0;font-size:13px;color:#333">
                <li>You will receive your student portal login and matriculation number within 24–48 hours</li>
                <li>Pay the acceptance fee via the student portal</li>
                <li>Upload all required documents</li>
                <li>Report for registration on the scheduled date</li>
              </ol>
            </div>
            <p>Portal: <a href="{settings.FRONTEND_URL}" style="color:#006B3F">portal.fugusau.edu.ng</a></p>
          </div>
        </div>
        """
        _send_email(app.email, subject, html_body)
        _send_sms(app.phone, f'FUGUSAU: Welcome! Your admission to {app.offered_department.name if app.offered_department else "FUGUSAU"} is confirmed. Check your email for next steps.')
        logger.info(f'Acceptance confirmation sent to {app.email}')
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def send_decline_confirmation(self, application_id: str):
    """Acknowledge applicant's decision to decline"""
    try:
        from .models import Application
        app = Application.objects.get(id=application_id)
        _send_email(
            app.email,
            f'FUGUSAU: Offer Declined — {app.application_no}',
            f'Dear {app.get_full_name()}, we acknowledge your decision to decline the offer. '
            f'Thank you for your interest in FUGUSAU. You are welcome to apply again in future sessions.'
        )
        logger.info(f'Decline confirmation sent to {app.email}')
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@shared_task
def trigger_enrollment(application_id: str):
    """
    Create student account and profile after offer acceptance.
    Generates matric number, temporary password, sends login credentials.
    """
    try:
        from .models import Application
        from fugusau.apps.users.models import User
        from fugusau.apps.students.models import StudentProfile
        import secrets, string

        app = Application.objects.select_related('offered_department', 'session').get(id=application_id)

        if app.linked_user:
            logger.warning(f'Enrollment already triggered for {app.application_no}')
            return

        # Resolve entry level from offer or entry type
        offer = getattr(app, 'offer', None)
        entry_level = offer.entry_level if offer else (200 if app.entry_type == 'DE' else 100)
        year = app.session.session_name[:4]

        # Generate temporary password
        alphabet = string.ascii_letters + string.digits
        temp_pw  = ''.join(secrets.choice(alphabet) for _ in range(10))

        # Create user account
        user = User.objects.create_user(
            email       = app.email,
            first_name  = app.first_name,
            middle_name = app.middle_name,
            last_name   = app.last_name,
            role        = User.STUDENT,
            phone       = app.phone,
            password    = temp_pw,
            is_active   = True,
        )

        # Create student profile - matric_number will be automatically generated by the model
        profile = StudentProfile.objects.create(
            user             = user,
            department       = app.offered_department,
            level            = entry_level,
            admission_year   = int(year),
            admission_session = app.session.session_name,
            jamb_score       = app.jamb_score,
            jamb_reg_number  = app.jamb_reg_no,
            state_of_origin  = app.state_of_origin,
            lga_of_origin    = app.lga,
        )
        matric = profile.matric_number

        # Link user to application
        app.linked_user = user
        app.status      = Application.ENROLLED
        app.save(update_fields=['linked_user', 'status'])

        # Send login credentials
        _send_email(
            app.email,
            'FUGUSAU — Your Student Portal Login Credentials',
            f"""
            <div style="font-family:Arial;max-width:600px;margin:0 auto">
              <div style="background:#006B3F;padding:20px;text-align:center">
                <h1 style="color:#F5C842;margin:0">FEDERAL UNIVERSITY GUSAU</h1>
              </div>
              <div style="padding:24px;background:white">
                <h2 style="color:#006B3F">Welcome, {app.first_name}!</h2>
                <p>Your student account has been created. Here are your login credentials:</p>
                <div style="background:#f5f5f5;padding:16px;border-radius:8px;font-family:monospace">
                  <p><b>Portal URL:</b> {settings.FRONTEND_URL}</p>
                  <p><b>Matriculation Number:</b> {matric}</p>
                  <p><b>Email:</b> {app.email}</p>
                  <p><b>Temporary Password:</b> {temp_pw}</p>
                </div>
                <p style="color:#e53e3e;font-size:13px">Please change your password immediately after first login.</p>
              </div>
            </div>
            """
        )
        _send_sms(app.phone, f'FUGUSAU: Your student account is ready! Matric: {matric}. Login at portal.fugusau.edu.ng with your email and temp password sent to your email.')

        logger.info(f'Enrollment complete: {app.application_no} → Matric: {matric}')

    except Exception as exc:
        logger.error(f'Enrollment trigger failed for {application_id}: {exc}')
        raise


@shared_task
def expire_pending_offers():
    """Runs daily — expires offers past their deadline"""
    from .models import Application
    expired = Application.objects.filter(
        status=Application.OFFERED,
        offer_expires_at__lt=timezone.now()
    )
    count = expired.count()
    expired.update(status=Application.EXPIRED)
    logger.info(f'Expired {count} admission offers')


@shared_task
def check_admission_deadlines():
    """Sends reminder to applicants 3 days and 1 day before offer expires"""
    from .models import Application
    from datetime import timedelta

    tomorrow    = timezone.now() + timedelta(days=1)
    in_3_days   = timezone.now() + timedelta(days=3)

    # 1-day reminder
    expiring_tomorrow = Application.objects.filter(
        status=Application.OFFERED,
        offer_expires_at__date=tomorrow.date()
    )
    for app in expiring_tomorrow:
        _send_sms(
            app.phone,
            f'FUGUSAU URGENT: Your admission offer expires TOMORROW! '
            f'Log in to portal.fugusau.edu.ng to accept NOW before it is too late. '
            f'App No: {app.application_no}'
        )

    # 3-day reminder
    expiring_3days = Application.objects.filter(
        status=Application.OFFERED,
        offer_expires_at__date=in_3_days.date()
    )
    for app in expiring_3days:
        _send_sms(
            app.phone,
            f'FUGUSAU: Your admission offer expires in 3 days. '
            f'Accept at portal.fugusau.edu.ng. App No: {app.application_no}'
        )

    logger.info(f'Deadline reminders: {expiring_tomorrow.count()} (1-day), {expiring_3days.count()} (3-day)')


# ─── Helpers ──────────────────────────────────────────────────────────────
def _send_email(to_email: str, subject: str, html_body: str):
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg   = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        mail = Mail(
            from_email    = settings.DEFAULT_FROM_EMAIL,
            to_emails     = to_email,
            subject       = subject,
            html_content  = html_body,
        )
        sg.send(mail)
    except Exception as e:
        logger.error(f'Email failed to {to_email}: {e}')
        # Fallback: Django email backend
        try:
            from django.core.mail import send_mail
            from bs4 import BeautifulSoup
            text = BeautifulSoup(html_body, 'html.parser').get_text()
            send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [to_email])
        except Exception as e2:
            logger.error(f'Fallback email also failed: {e2}')


def _send_sms(phone: str, message: str):
    try:
        import africastalking
        africastalking.initialize(settings.AT_USERNAME, settings.AT_API_KEY)
        sms = africastalking.SMS
        sms.send(message, [phone], sender_id=settings.AT_SENDER_ID)
    except Exception as e:
        logger.error(f'SMS failed to {phone}: {e}')
