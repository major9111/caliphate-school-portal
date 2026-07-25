"""
FUGUSAU Portal — Admissions Views
Handles: application submission, admin review, offer management,
applicant accept/decline, bulk actions, enrollment trigger.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (
    Application, ApplicationDocument, AdmissionOffer,
    AdmissionSession, ApplicationStatusHistory
)
from .serializers import (
    ApplicationListSerializer, ApplicationDetailSerializer,
    ApplicationCreateSerializer, AdmissionOfferSerializer,
    AdmissionSessionSerializer, OfferResponseSerializer,
    BulkActionSerializer, ApplicationDocumentSerializer
)
from .tasks import (
    send_offer_email, send_rejection_email, send_acceptance_confirmation,
    send_decline_confirmation, trigger_enrollment
)

logger = logging.getLogger('fugusau.admissions')


def log_status_change(application, from_status, to_status, changed_by, reason='', request=None):
    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        reason=reason,
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
    )


# ─── Session ─────────────────────────────────────────────────────────────
class AdmissionSessionView(APIView):
    """GET /api/v1/admissions/session/ — Current admission session info"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session = AdmissionSession.objects.filter(is_active=True).first()
        if not session:
            return Response({'message': 'Admission is currently closed.'}, status=404)
        return Response(AdmissionSessionSerializer(session).data)


class AdmissionSessionListView(generics.ListCreateAPIView):
    """
    GET  /api/v1/admissions/sessions/ — Public: session info (dates, slots) shown on the apply page
    POST /api/v1/admissions/sessions/ — Admin: create a new session
    """
    serializer_class = AdmissionSessionSerializer
    queryset = AdmissionSession.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


# ─── Application Status Check (Public) ────────────────────────────────────
class ApplicationStatusCheckView(APIView):
    """
    GET /api/v1/admissions/check-status/?app_no=FUGU2025&email=applicant@gmail.com
    Public — applicant checks their own status
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        app_no = request.query_params.get('app_no', '').strip()
        email  = request.query_params.get('email', '').strip().lower()

        if not app_no or not email:
            return Response({'error': 'Provide both application_no and email.'}, status=400)

        try:
            app = Application.objects.get(
                application_no__iexact=app_no,
                email__iexact=email
            )
        except Application.DoesNotExist:
            return Response({'error': 'Application not found. Check your details and try again.'}, status=404)

        data = {
            'application_no':    app.application_no,
            'full_name':         app.get_full_name(),
            'status':            app.status,
            'status_display':    app.get_status_display(),
            'submitted_at':      app.submitted_at,
            'first_choice_dept': app.first_choice_dept.name if app.first_choice_dept else '',
            'jamb_score':        app.jamb_score,
            'aggregate_score':   app.aggregate_score,
        }

        # Include offer details if applicable
        if app.status == Application.OFFERED:
            data.update({
                'offered_department': app.offered_department.name if app.offered_department else '',
                'offer_expires_at':   app.offer_expires_at,
                'days_to_respond':    app.days_to_respond,
                'message': (
                    f'Congratulations! You have been offered admission to '
                    f'{app.offered_department.name if app.offered_department else "your chosen department"}. '
                    f'Log in to accept or decline before {app.offer_expires_at.strftime("%d %B %Y")}.'
                )
            })
        elif app.status == Application.ACCEPTED:
            data['message'] = 'You have accepted your admission offer. Welcome to FUGUSAU!'
        elif app.status == Application.REJECTED:
            data['message'] = 'We regret to inform you that your application was unsuccessful this session.'
        elif app.status == Application.WAITLISTED:
            data['message'] = 'You are on our waiting list. You will be notified if a slot becomes available.'
        elif app.status == Application.SUBMITTED:
            data['message'] = 'Your application is being processed. We will contact you soon.'
        elif app.status == Application.SCREENING:
            data['message'] = 'Your application is currently under review by our admissions team.'

        return Response(data)


# ─── Admin: List All Applications ────────────────────────────────────────
class ApplicationListView(generics.ListCreateAPIView):
    """
    GET  /api/v1/admissions/ — Admin list with filters
    POST /api/v1/admissions/ — Public application submission (any prospective student)
    """
    filterset_fields = ['status', 'gender', 'entry_type', 'programme',
                        'first_choice_dept', 'meets_jamb_cutoff', 'credentials_verified']
    search_fields = ['first_name', 'last_name', 'email', 'application_no', 'jamb_reg_no']
    ordering_fields = ['submitted_at', 'jamb_score', 'aggregate_score', 'last_name']
    ordering = ['-submitted_at']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApplicationCreateSerializer
        return ApplicationListSerializer

    def get_queryset(self):
        qs = Application.objects.select_related(
            'first_choice_dept', 'second_choice_dept', 'offered_department', 'reviewed_by'
        )
        # Filter by session
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
        else:
            # Default: current active session
            qs = qs.filter(session__is_active=True)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        logger.info(f'New application submitted: {application.application_no} — {application.email}')
        return Response({
            'application_no': application.application_no,
            'message': (
                f'Application {application.application_no} submitted successfully. '
                f'Check your email ({application.email}) for confirmation. '
                f'Track your status at portal.fugusau.edu.ng/admission-check'
            ),
            'status': application.status,
        }, status=status.HTTP_201_CREATED)


class ApplicationDetailView(generics.RetrieveAPIView):
    """GET /api/v1/admissions/applications/{id}/ — Full application detail"""
    serializer_class = ApplicationDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Application.objects.select_related(
        'first_choice_dept', 'second_choice_dept', 'offered_department',
        'reviewed_by', 'session'
    ).prefetch_related('documents', 'history__changed_by')


# ─── Admin: Send Offer ────────────────────────────────────────────────────
class SendOfferView(APIView):
    """
    POST /api/v1/admissions/applications/{id}/offer/
    Admin sends an admission offer to a specific applicant
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, app_id):
        app = get_object_or_404(Application, id=app_id)

        if app.status not in (Application.SUBMITTED, Application.SCREENING, Application.SHORTLISTED):
            return Response({'error': f'Cannot send offer to application with status: {app.status}'}, status=400)

        department_id       = request.data.get('department_id', app.first_choice_dept_id)
        validity_days       = int(request.data.get('validity_days', 14))
        scholarship         = request.data.get('scholarship', False)
        scholarship_details = request.data.get('scholarship_details', '')
        special_conditions  = request.data.get('special_conditions', '')
        acceptance_fee      = request.data.get('acceptance_fee', 25000)

        from fugusau.apps.students.models import Department
        dept = get_object_or_404(Department, id=department_id)

        import uuid as _uuid
        offer_no   = f'OFFER/{app.session.session_name.replace("/","")}/{_uuid.uuid4().hex[:8].upper()}'
        expires_at = timezone.now() + timedelta(days=validity_days)

        old_status = app.status

        # Create/update offer record
        offer, _ = AdmissionOffer.objects.update_or_create(
            application=app,
            defaults={
                'offer_number':       offer_no,
                'department':         dept,
                'programme':          app.programme,
                'session':            app.session.session_name,
                'scholarship':        scholarship,
                'scholarship_details': scholarship_details,
                'special_conditions': special_conditions,
                'acceptance_fee':     acceptance_fee,
                'issued_by':          request.user,
                'expires_at':         expires_at,
            }
        )

        # Update application
        app.status              = Application.OFFERED
        app.offered_department  = dept
        app.offered_at          = timezone.now()
        app.offer_expires_at    = expires_at
        app.reviewed_by         = request.user
        app.reviewed_at         = timezone.now()
        app.offer_letter_sent   = True
        app.save()

        log_status_change(app, old_status, Application.OFFERED, request.user,
                          f'Offer sent by {request.user.get_full_name()} for {dept.name}', request)

        # Send offer email (async)
        send_offer_email.delay(str(app.id))

        logger.info(f'Offer sent: {app.application_no} → {dept.name} by {request.user.email}')
        return Response({
            'message': f'Offer sent to {app.get_full_name()} for {dept.name}. Expires in {validity_days} days.',
            'offer_number': offer_no,
            'expires_at': expires_at,
            'application': ApplicationListSerializer(app).data,
        })


# ─── Admin: Reject Application ───────────────────────────────────────────
class RejectApplicationView(APIView):
    """POST /api/v1/admissions/applications/{id}/reject/"""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, app_id):
        app = get_object_or_404(Application, id=app_id)

        if app.status in (Application.ENROLLED, Application.REJECTED):
            return Response({'error': f'Application already {app.status}.'}, status=400)

        reason   = request.data.get('reason', '').strip()
        send_sms = request.data.get('send_notification', True)

        if not reason:
            return Response({'error': 'A rejection reason is required.'}, status=400)

        old_status = app.status
        app.status           = Application.REJECTED
        app.rejection_reason = reason
        app.reviewed_by      = request.user
        app.reviewed_at      = timezone.now()
        app.save()

        log_status_change(app, old_status, Application.REJECTED, request.user, reason, request)

        if send_sms:
            send_rejection_email.delay(str(app.id))

        return Response({
            'message': f'Application {app.application_no} rejected.',
            'application': ApplicationListSerializer(app).data,
        })


# ─── Admin: Shortlist / Waitlist ─────────────────────────────────────────
class UpdateApplicationStatusView(APIView):
    """
    POST /api/v1/admissions/applications/{id}/update-status/
    Admin moves application to screening, shortlist, or waitlist
    """
    permission_classes = [permissions.IsAdminUser]

    ALLOWED_TRANSITIONS = {
        Application.SUBMITTED:   [Application.SCREENING, Application.SHORTLISTED, Application.REJECTED, Application.WAITLISTED],
        Application.SCREENING:   [Application.SHORTLISTED, Application.REJECTED, Application.WAITLISTED],
        Application.SHORTLISTED: [Application.OFFERED, Application.REJECTED, Application.WAITLISTED],
        Application.WAITLISTED:  [Application.OFFERED, Application.REJECTED],
        Application.OFFERED:     [Application.REJECTED],
    }

    def post(self, request, app_id):
        app        = get_object_or_404(Application, id=app_id)
        new_status = request.data.get('status', '').strip()
        reason     = request.data.get('reason', '')

        allowed = self.ALLOWED_TRANSITIONS.get(app.status, [])
        if new_status not in allowed:
            return Response({
                'error': f'Cannot move from {app.status} to {new_status}.',
                'allowed_transitions': allowed,
            }, status=400)

        old_status  = app.status
        app.status  = new_status
        app.reviewed_by  = request.user
        app.reviewed_at  = timezone.now()
        app.admin_notes  = request.data.get('notes', app.admin_notes)
        if new_status == Application.SHORTLISTED:
            app.screening_score = request.data.get('screening_score', app.screening_score)
        app.save()

        log_status_change(app, old_status, new_status, request.user, reason, request)

        return Response({
            'message': f'Application {app.application_no} moved to {new_status}.',
            'application': ApplicationListSerializer(app).data,
        })


# ─── Admin: Bulk Actions ─────────────────────────────────────────────────
class BulkApplicationActionView(APIView):
    """
    POST /api/v1/admissions/bulk-action/
    Batch shortlist / offer / reject / waitlist multiple applications at once
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = BulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids     = serializer.validated_data['application_ids']
        action  = serializer.validated_data['action']
        reason  = serializer.validated_data.get('reason', f'Bulk {action} by admin')
        days    = serializer.validated_data.get('offer_validity_days', 14)

        apps     = Application.objects.filter(id__in=ids)
        success  = []
        failed   = []

        STATUS_MAP = {
            'shortlist': Application.SHORTLISTED,
            'offer':     Application.OFFERED,
            'reject':    Application.REJECTED,
            'waitlist':  Application.WAITLISTED,
        }
        new_status = STATUS_MAP[action]

        for app in apps:
            try:
                old_status = app.status
                app.status      = new_status
                app.reviewed_by = request.user
                app.reviewed_at = timezone.now()

                if action == 'offer':
                    app.offered_at       = timezone.now()
                    app.offered_department = app.first_choice_dept
                    app.offer_expires_at = timezone.now() + timedelta(days=days)
                    app.offer_letter_sent = True

                app.save()
                log_status_change(app, old_status, new_status, request.user, reason, request)

                if action == 'offer':
                    send_offer_email.delay(str(app.id))
                elif action == 'reject':
                    send_rejection_email.delay(str(app.id))

                success.append(app.application_no)
            except Exception as e:
                failed.append({'id': str(app.id), 'error': str(e)})

        logger.info(f'Bulk {action}: {len(success)} success, {len(failed)} failed by {request.user.email}')
        return Response({
            'action':   action,
            'success':  len(success),
            'failed':   len(failed),
            'failed_details': failed,
            'message':  f'{len(success)} applications {action}ed successfully.',
        })


# ─── APPLICANT: Accept / Decline Offer ───────────────────────────────────
class OfferResponseView(APIView):
    """
    POST /api/v1/admissions/applications/{id}/respond/
    The applicant accepts or declines their offer.
    Accessible by the applicant (via token) or anonymously with app_no+email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, app_id):
        # Verify identity: either JWT (future student) or app_no+email
        app = None
        try:
            app = Application.objects.get(id=app_id)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=404)

        # Identity check for unauthenticated users
        if not request.user.is_authenticated:
            email  = request.data.get('email', '').strip().lower()
            app_no = request.data.get('application_no', '').strip()
            if app.email.lower() != email or app.application_no != app_no:
                return Response({'error': 'Identity verification failed. Check your email and application number.'}, status=403)

        if app.status != Application.OFFERED:
            return Response({
                'error': f'No active offer to respond to. Current status: {app.get_status_display()}'
            }, status=400)

        if app.is_offer_expired:
            app.status = Application.EXPIRED
            app.save(update_fields=['status'])
            return Response({'error': 'Your offer has expired. Please contact the admissions office.'}, status=400)

        serializer = OfferResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response       = serializer.validated_data['response']
        decline_reason = serializer.validated_data.get('decline_reason', '')
        old_status     = app.status

        app.applicant_response = response
        app.response_at        = timezone.now()

        if response == 'accepted':
            app.status = Application.ACCEPTED
            log_status_change(app, old_status, Application.ACCEPTED,
                              request.user if request.user.is_authenticated else None,
                              'Offer accepted by applicant', request)
            app.save()
            # Trigger enrollment creation (Celery)
            trigger_enrollment.delay(str(app.id))
            send_acceptance_confirmation.delay(str(app.id))

            logger.info(f'Offer ACCEPTED: {app.application_no} — {app.get_full_name()}')
            return Response({
                'status':  'accepted',
                'message': (
                    f'Congratulations, {app.first_name}! 🎉 Your admission to '
                    f'{app.offered_department.name if app.offered_department else "FUGUSAU"} has been confirmed. '
                    f'You will receive your matriculation number and login credentials by email within 24–48 hours. '
                    f'Welcome to Federal University Gusau!'
                ),
                'next_steps': [
                    'Check your email for your student portal login credentials',
                    f'Pay acceptance fee of ₦{app.offer.acceptance_fee:,.0f} via the student portal',
                    'Upload any outstanding documents',
                    'Report for registration on the scheduled date',
                ],
                'application_no': app.application_no,
                'offered_department': app.offered_department.name if app.offered_department else '',
            })

        else:  # declined
            app.status         = Application.DECLINED
            app.decline_reason = decline_reason
            log_status_change(app, old_status, Application.DECLINED,
                              request.user if request.user.is_authenticated else None,
                              f'Offer declined by applicant. Reason: {decline_reason}', request)
            app.save()
            send_decline_confirmation.delay(str(app.id))

            logger.info(f'Offer DECLINED: {app.application_no} — {app.get_full_name()} — Reason: {decline_reason}')
            return Response({
                'status':  'declined',
                'message': (
                    f'Thank you for informing us, {app.first_name}. '
                    f'Your admission offer has been declined. '
                    f'We wish you the very best in your future endeavors. '
                    f'You may re-apply in a future admission cycle.'
                ),
                'application_no': app.application_no,
            })


# ─── Admissions Statistics (Admin) ───────────────────────────────────────
class AdmissionStatsView(APIView):
    """GET /api/v1/admissions/stats/ — Overview stats for admin dashboard"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = Application.objects.filter(session__is_active=True)
        by_status = {
            item['status']: item['count']
            for item in qs.values('status').annotate(count=Count('id'))
        }
        by_dept = list(
            qs.filter(status__in=[Application.OFFERED, Application.ACCEPTED])
            .values('offered_department__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        gender_split = dict(qs.values_list('gender').annotate(count=Count('id')))
        state_split  = list(qs.values('state_of_origin').annotate(count=Count('id')).order_by('-count')[:10])
        score_ranges = {
            '200-249': qs.filter(jamb_score__gte=200, jamb_score__lt=250).count(),
            '250-299': qs.filter(jamb_score__gte=250, jamb_score__lt=300).count(),
            '300-349': qs.filter(jamb_score__gte=300, jamb_score__lt=350).count(),
            '350+':    qs.filter(jamb_score__gte=350).count(),
        }

        session = AdmissionSession.objects.filter(is_active=True).first()

        return Response({
            'total':          qs.count(),
            'by_status':      by_status,
            'by_department':  by_dept,
            'gender_split':   gender_split,
            'state_split':    state_split,
            'score_ranges':   score_ranges,
            'acceptance_rate': round(
                by_status.get(Application.ACCEPTED, 0) /
                max(by_status.get(Application.OFFERED, 1), 1) * 100, 1
            ),
            'session': AdmissionSessionSerializer(session).data if session else None,
        })
