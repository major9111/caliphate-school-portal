"""
FUGUSAU Portal — Courses App Tasks
Path: fugusau/apps/courses/tasks.py

Fix #6: update_attendance_stats was scheduled in Celery beat nightly at 23:59
but this file didn't exist. The worker logged import errors every night.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def update_attendance_stats(self) -> dict:
    """
    Scheduled nightly at 23:59 (see celery.py beat_schedule).
    Computes per-enrollment attendance percentage for the current session
    and caches it on StudentProfile (or logs it) so dashboards don't need
    to re-aggregate on every page load.

    Currently writes results to the logger; extend to a dedicated
    AttendanceSummary model or StudentProfile field as needed.

    Returns:
        dict with processed and skipped enrollment counts
    """
    try:
        from fugusau.apps.courses.models import Enrollment, Attendance, AcademicSession

        session = AcademicSession.objects.filter(is_current=True).first()
        if not session:
            logger.info('update_attendance_stats: no active session, skipping')
            return {'processed': 0, 'skipped': 0, 'reason': 'no_active_session'}

        enrollments = Enrollment.objects.filter(
            session=session,
            status='registered',
        ).prefetch_related('attendance')

        processed = 0
        skipped   = 0

        for enrollment in enrollments:
            all_records     = enrollment.attendance.all()
            total_classes   = all_records.count()

            if total_classes == 0:
                skipped += 1
                continue

            present_count = all_records.filter(
                status__in=[Attendance.PRESENT, Attendance.EXCUSED]
            ).count()

            attendance_pct = round((present_count / total_classes) * 100, 1)

            # Log for now; replace with model field write once schema is ready:
            # enrollment.attendance_percentage = attendance_pct
            # enrollment.save(update_fields=['attendance_percentage'])
            logger.debug(
                'Attendance: student=%s course=%s session=%s pct=%.1f%%',
                enrollment.student.matric_number,
                enrollment.course.code,
                session.name,
                attendance_pct,
            )
            processed += 1

        logger.info(
            'update_attendance_stats: session=%s processed=%d skipped=%d',
            session.name, processed, skipped,
        )
        return {'session': session.name, 'processed': processed, 'skipped': skipped}
    except Exception as exc:
        logger.error('update_attendance_stats error: %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=1, default_retry_delay=300)
def rollover_academic_session(self, next_session_name: str, start_date_str: str, end_date_str: str) -> dict:
    """
    Automates the transition from the current academic session to a new academic session.
    
    1. Sets all active academic sessions to is_current=False.
    2. Creates the new AcademicSession and sets is_current=True.
    3. Promotes active students:
       - Checks current level and increments by 100 (e.g. 100L -> 200L).
       - If level is 400L (or 500L), updates status to 'graduated'.
       - Students with CGPA < 1.0 (probation) do not advance level but remain active.
    4. Automatically generates a fee Invoice for each active/promoted student for the new session 
       containing mandatory FeeTypes.
    5. Sends in-app and email notifications to all affected students.
    """
    import uuid
    from datetime import datetime
    from django.db import transaction
    from django.db.models import Q
    from fugusau.apps.courses.models import AcademicSession
    from fugusau.apps.students.models import StudentProfile
    from fugusau.apps.fees.models import FeeType, Invoice
    from fugusau.apps.notifications.utils import send_notification

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date   = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        with transaction.atomic():
            # 1. Close current sessions
            AcademicSession.objects.filter(is_current=True).update(is_current=False)

            # 2. Create the new session
            new_session = AcademicSession.objects.create(
                name=next_session_name,
                is_current=True,
                start_date=start_date,
                end_date=end_date
            )

            # 3. Promote active students
            students = StudentProfile.objects.filter(status=StudentProfile.ACTIVE)
            promoted_count  = 0
            graduated_count = 0
            invoices_created = 0

            for student in students:
                old_level = student.level
                
                # Check for probation / failure to promote
                if student.cgpa < 1.00:
                    # Stays at same level, remains on probation
                    msg = f"Session Rollover: You remain at {student.level}L on academic probation (CGPA: {student.cgpa})."
                    send_notification(
                        user_ids=[student.user_id],
                        title="Academic Session Rollover",
                        message=msg,
                        notification_type="WARNING"
                    )
                else:
                    # Promote
                    if old_level >= 400: # 4-year and 5-year courses graduation check
                        # If department has 500L courses, and student is currently 400L, promote to 500L
                        has_500l_courses = student.department.courses.filter(level=500).exists() if student.department else False
                        if old_level == 400 and has_500l_courses:
                            student.level = 500
                            student.save(update_fields=['level'])
                            promoted_count += 1
                        else:
                            # Graduate
                            student.status = StudentProfile.GRADUATED
                            student.save(update_fields=['status'])
                            graduated_count += 1
                            
                            send_notification(
                                user_ids=[student.user_id],
                                title="Congratulations on Graduation!",
                                message=f"Congratulations! You have completed your studies and been marked as GRADUATED. Final CGPA: {student.cgpa}.",
                                notification_type="SUCCESS"
                            )
                            continue
                    else:
                        student.level += 100
                        student.save(update_fields=['level'])
                        promoted_count += 1

                # 4. Generate Invoice for the new session for active students
                mandatory_fees = FeeType.objects.filter(
                    session=new_session,
                    is_mandatory=True
                ).filter(
                    Q(level=student.level) | Q(level__isnull=True)
                )

                if mandatory_fees.exists():
                    total_amount = sum(ft.amount for ft in mandatory_fees)
                    invoice_no = f"INV-{student.matric_number}-{uuid.uuid4().hex[:8].upper()}"
                    
                    invoice = Invoice.objects.create(
                        invoice_no=invoice_no,
                        student=student,
                        total_amount=total_amount,
                        due_date=new_session.start_date + timezone.timedelta(days=30),
                        status=Invoice.PENDING
                    )
                    invoice.fee_types.set(mandatory_fees)
                    invoices_created += 1

                    # 5. Notify student
                    send_notification(
                        user_ids=[student.user_id],
                        title=f"New Level: {student.level}L & Invoice Generated",
                        message=(
                            f"Welcome to the new academic session {new_session.name}. "
                            f"Your level is now {student.level}L. A new invoice {invoice_no} "
                            f"for mandatory fees (₦{total_amount:,.2f}) has been generated. "
                            f"Please pay before registration deadline."
                        ),
                        notification_type="INFO"
                    )

            return {
                'status': 'success',
                'new_session': new_session.name,
                'students_promoted': promoted_count,
                'students_graduated': graduated_count,
                'invoices_generated': invoices_created
            }

    except Exception as exc:
        logger.error('rollover_academic_session error: %s', exc)
        raise self.retry(exc=exc)

