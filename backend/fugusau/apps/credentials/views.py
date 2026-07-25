"""FUGUSAU Portal — Credentials Views (fixed)

Fixes:
  1. URL uses <uuid:pk> but views expected 'credential_id' kwarg → use self.kwargs['pk']
  2. AdminCredentialReviewView used PATCH but frontend sends POST → support both
  3. Added CredentialDownloadView for GET /credentials/<pk>/download/
"""
import hashlib
import os
import mimetypes
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Credential
from .serializers import CredentialSerializer
from .services import forgery_detector, external_verifier
from fugusau.apps.notifications.utils import send_notification


class CredentialListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/credentials/  — List student's uploaded credentials
    POST /api/v1/credentials/  — Upload new credential (multipart: doc_type + file)
    """
    serializer_class = CredentialSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'is_student') and user.is_student:
            return Credential.objects.filter(student__user=user).order_by('-uploaded_at')
        elif user.is_staff or (hasattr(user, 'is_admin') and user.is_admin):
            return Credential.objects.all().select_related('student__user')
        return Credential.objects.none()

    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        if not file:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'file': 'A file upload is required.'})

        file_hash = hashlib.sha256(file.read()).hexdigest()
        file.seek(0)

        credential = serializer.save(
            student=self.request.user.student_profile,
            original_filename=file.name,
            file_hash=file_hash,
        )

        # Trigger async AI analysis (Celery)
        try:
            from .tasks import analyze_credential_async
            analyze_credential_async.delay(str(credential.id))
        except Exception:
            pass  # Don't fail the upload if Celery isn't running


class AnalyzeCredentialView(APIView):
    """POST /api/v1/credentials/<pk>/analyze/ — Run AI analysis on a credential"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            credential = Credential.objects.get(id=pk, student__user=request.user)
        except Credential.DoesNotExist:
            return Response({'error': 'Credential not found.'}, status=404)

        findings = forgery_detector.analyze_document(
            image_path=credential.file.path,
            doc_type=credential.doc_type,
        )

        credential.forgery_risk_score = findings['risk_score']
        credential.ai_verdict = findings['verdict']
        credential.ai_findings = findings
        credential.extracted_text = findings.get('extracted_text', '')

        if findings['verdict'] == 'AUTHENTIC':
            credential.status = Credential.AUTHENTIC
        elif findings['verdict'] == 'SUSPICIOUS':
            credential.status = Credential.SUSPICIOUS
        elif findings['verdict'] == 'LIKELY_FORGED':
            credential.status = Credential.FORGED
            send_notification(
                user_ids='admins',
                title='Forged Document Detected',
                message=(
                    f'Document from {credential.student.matric_number} flagged as likely '
                    f'forged. Risk score: {findings["risk_score"]}/100'
                ),
                notification_type='ALERT',
            )

        credential.save()

        return Response({
            'credential_id': str(credential.id),
            'risk_score': credential.forgery_risk_score,
            'verdict': credential.ai_verdict,
            'status': credential.status,
            'findings': findings,
        })


class ExternalVerifyView(APIView):
    """POST /api/v1/credentials/<pk>/verify/ — Verify against WAEC/NECO/JAMB APIs"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            credential = Credential.objects.get(id=pk, student__user=request.user)
        except Credential.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        extra_data = request.data

        if credential.doc_type == Credential.WAEC:
            result = external_verifier.verify_waec(
                exam_number=extra_data.get('exam_number'),
                year=extra_data.get('year'),
                card_pin=extra_data.get('card_pin'),
            )
        elif credential.doc_type == Credential.NECO:
            result = external_verifier.verify_neco(
                exam_number=extra_data.get('exam_number'),
                year=extra_data.get('year'),
                token=extra_data.get('token'),
            )
        elif credential.doc_type == Credential.JAMB:
            result = external_verifier.verify_jamb(
                reg_number=extra_data.get('reg_number'),
                year=extra_data.get('year'),
            )
        else:
            return Response(
                {'error': 'External verification not available for this document type.'},
                status=400,
            )

        credential.external_verified = result.get('verified', False)
        credential.external_data = result
        credential.save(update_fields=['external_verified', 'external_data'])

        return Response({'external_verified': result.get('verified'), 'data': result})


class AdminCredentialReviewView(APIView):
    """
    POST /api/v1/credentials/<pk>/review/ — Admin manual review
    Also accepts PATCH for backwards compatibility.
    """
    permission_classes = [permissions.IsAdminUser]

    def _do_review(self, request, pk):
        try:
            credential = Credential.objects.get(id=pk)
        except Credential.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        new_status = request.data.get('status')
        notes = request.data.get('notes', '')

        if new_status not in [s[0] for s in Credential.STATUS_CHOICES]:
            return Response({'error': 'Invalid status.'}, status=400)

        credential.status = new_status
        credential.reviewed_by = request.user
        credential.reviewed_at = timezone.now()
        credential.review_notes = notes
        credential.save()

        send_notification(
            user_ids=[credential.student.user.id],
            title='Document Verification Update',
            message=(
                f'Your {credential.doc_type} has been reviewed. '
                f'Status: {credential.get_status_display()}'
            ),
            notification_type='CREDENTIAL',
        )

        return Response(CredentialSerializer(credential).data)

    def post(self, request, pk):
        return self._do_review(request, pk)

    def patch(self, request, pk):
        return self._do_review(request, pk)


class CredentialDownloadView(APIView):
    """GET /api/v1/credentials/<pk>/download/ — Download the raw file"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            # Students can only download their own; admins can download any
            if request.user.is_staff or (hasattr(request.user, 'is_admin') and request.user.is_admin):
                credential = Credential.objects.get(id=pk)
            else:
                credential = Credential.objects.get(id=pk, student__user=request.user)
        except Credential.DoesNotExist:
            raise Http404

        file_path = credential.file.path
        if not os.path.exists(file_path):
            return Response({'error': 'File not found on server.'}, status=404)

        mime, _ = mimetypes.guess_type(file_path)
        response = FileResponse(
            open(file_path, 'rb'),
            content_type=mime or 'application/octet-stream',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="{credential.original_filename or os.path.basename(file_path)}"'
        )
        return response
