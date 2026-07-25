"""
FUGUSAU Portal — Exams App Tasks
Path: fugusau/apps/exams/tasks.py

Fixes:
  - #1a  SenateBatchApprovalView calls recompute_cgpa_for_session.delay(...)
         → this file was missing, causing ImportError on every senate approval
  - #1b  Celery beat has 'exams.tasks.send_exam_reminders' scheduled
         → worker crashed at startup because the task didn't exist
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def recompute_cgpa_for_session(self, session_id: str, semester: str) -> dict:
    """
    Recompute CGPA for every student who has at least one senate-approved result
    in the given session/semester.  Called by SenateBatchApprovalView after
    bulk senate approval.

    Args:
        session_id: UUID string of the AcademicSession
        semester:   'first' | 'second'

    Returns:
        dict with updated/skipped counts
    """
    try:
        from fugusau.apps.exams.models import Result
        from fugusau.apps.students.models import StudentProfile

        # Distinct students who have approved results in this session/semester
        student_ids = (
            Result.objects
            .filter(
                enrollment__session_id=session_id,
                enrollment__semester=semester,
                is_senate_approved=True,
            )
            .values_list('enrollment__student_id', flat=True)
            .distinct()
        )

        updated = 0
        skipped = 0

        for student_id in student_ids:
            try:
                student = StudentProfile.objects.get(pk=student_id)

                # Recompute across ALL senate-approved results (all sessions)
                approved_results = Result.objects.filter(
                    enrollment__student=student,
                    is_senate_approved=True,
                ).select_related('enrollment__course')

                total_gp    = sum(float(r.grade_point) * r.enrollment.course.credit_units for r in approved_results)
                total_units = sum(r.enrollment.course.credit_units for r in approved_results)

                if total_units > 0:
                    student.cgpa = round(total_gp / total_units, 2)
                    student.total_credit_units_earned = total_units
                    student.save(update_fields=['cgpa', 'total_credit_units_earned'])
                    updated += 1
                else:
                    skipped += 1

            except StudentProfile.DoesNotExist:
                logger.warning('recompute_cgpa_for_session: StudentProfile %s not found', student_id)
                skipped += 1
            except Exception as exc:
                logger.error('recompute_cgpa_for_session: error for student %s — %s', student_id, exc)
                skipped += 1

        logger.info(
            'recompute_cgpa_for_session complete: session=%s semester=%s updated=%d skipped=%d',
            session_id, semester, updated, skipped,
        )
        return {'session_id': session_id, 'semester': semester, 'updated': updated, 'skipped': skipped}

    except Exception as exc:
        logger.error('recompute_cgpa_for_session unexpected error: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_exam_reminders(self) -> dict:
    """
    Scheduled daily at 7AM (see celery.py beat_schedule).
    Sends in-app notifications to students with exams coming up within the
    next 48 hours.

    Notification.notif_type uses the model's actual choices:
        'info' | 'warning' | 'success' | 'danger'
    Deduplication is done by checking for an existing notification with the
    same recipient + title on today's date (the model has no reference_id field).

    Returns:
        dict with sent/skipped counts
    """
    try:
        from datetime import timedelta
        from fugusau.apps.exams.models import ExamSchedule
        from fugusau.apps.courses.models import Enrollment, AcademicSession
        from fugusau.apps.notifications.models import Notification

        now    = timezone.now()
        today  = now.date()
        window = today + timedelta(days=2)  # 48-hour lookahead

        session = AcademicSession.objects.filter(is_current=True).first()
        if not session:
            logger.info('send_exam_reminders: no active session found, skipping')
            return {'sent': 0, 'skipped': 0, 'reason': 'no_active_session'}

        upcoming_exams = ExamSchedule.objects.filter(
            session=session,
            exam_date__gte=today,
            exam_date__lte=window,
        ).select_related('course')

        sent    = 0
        skipped = 0

        for exam in upcoming_exams:
            enrollments = Enrollment.objects.filter(
                course=exam.course,
                session=session,
                semester=exam.semester,
                status='registered',
            ).select_related('student__user')

            days_away  = (exam.exam_date - today).days
            time_label = 'tomorrow' if days_away == 1 else f'in {days_away} days'
            title      = f'Exam Reminder: {exam.course.code}'

            for enrollment in enrollments:
                user = enrollment.student.user
                if not user.is_active:
                    skipped += 1
                    continue

                # Deduplicate: one reminder per exam title per student per day
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
                        f'Your {exam.course.code} — {exam.course.title} exam is {time_label} '
                        f'({exam.exam_date.strftime("%A, %d %b %Y")}) at {exam.start_time.strftime("%I:%M %p")}, '
                        f'Venue: {exam.venue}.'
                    ),
                    notif_type=Notification.WARNING,
                )
                sent += 1

        logger.info('send_exam_reminders: sent=%d skipped=%d', sent, skipped)
        return {'sent': sent, 'skipped': skipped}

    except Exception as exc:
        logger.error('send_exam_reminders error: %s', exc)
        raise self.retry(exc=exc)
