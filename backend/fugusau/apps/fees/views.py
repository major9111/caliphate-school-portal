"""FUGUSAU Portal — Fees Views with Paystack Integration"""
import uuid
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import FeeType, Invoice, Payment
from .serializers import FeeTypeSerializer, InvoiceSerializer, PaymentSerializer


class FeeTypeListView(generics.ListAPIView):
    """GET /api/v1/fees/types/ — List all fee types for current session"""
    serializer_class = FeeTypeSerializer
    filterset_fields = ['category', 'is_mandatory', 'level']

    def get_queryset(self):
        return FeeType.objects.filter(session__is_current=True).order_by('category')


class InvoiceListView(generics.ListAPIView):
    """GET /api/v1/fees/invoices/ — Student's invoice list"""
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_student:
            return Invoice.objects.filter(student__user=user).prefetch_related('fee_types', 'payments')
        elif user.is_admin:
            return Invoice.objects.all().select_related('student__user')
        return Invoice.objects.none()


class GenerateInvoiceView(APIView):
    """POST /api/v1/fees/generate-invoice/ — Generate semester invoice for student"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        student = request.user.student_profile
        session = settings.CURRENT_SESSION
        semester = request.data.get('semester', 'second')

        # Check if invoice already exists
        existing = Invoice.objects.filter(
            student=student,
            fee_types__session__name=session,
            fee_types__semester=semester
        ).first()
        if existing:
            return Response(InvoiceSerializer(existing).data)

        fee_types = FeeType.objects.filter(
            session__is_current=True,
            is_mandatory=True
        ).filter(
            models.Q(semester=semester) | models.Q(semester='')
        ).filter(
            models.Q(level=student.level) | models.Q(level__isnull=True)
        )

        total = sum(ft.amount for ft in fee_types)
        invoice = Invoice.objects.create(
            invoice_no=f'INV-{student.matric_number}-{uuid.uuid4().hex[:8].upper()}',
            student=student,
            total_amount=total,
            due_date=timezone.now().date() + timezone.timedelta(days=30),
        )
        invoice.fee_types.set(fee_types)
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InitiatePaymentView(APIView):
    """POST /api/v1/fees/pay/ — Initiate Paystack payment"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        invoice_id = request.data.get('invoice_id')
        try:
            invoice = Invoice.objects.get(id=invoice_id, student__user=request.user)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found.'}, status=404)

        if invoice.status == Invoice.PAID:
            return Response({'error': 'Invoice already paid.'}, status=400)

        amount_kobo = int(invoice.balance * 100)
        ref = f'FUGU-{uuid.uuid4().hex[:12].upper()}'

        payload = {
            'email': request.user.email,
            'amount': amount_kobo,
            'reference': ref,
            'callback_url': f'{settings.FRONTEND_URL}/fees/verify?ref={ref}',
            'metadata': {
                'invoice_id': str(invoice_id),
                'student_name': request.user.get_full_name(),
                'matric_number': invoice.student.matric_number,
            }
        }

        headers = {
            'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json',
        }

        resp = requests.post(f'{settings.PAYSTACK_BASE_URL}/transaction/initialize',
                             json=payload, headers=headers, timeout=30)
        data = resp.json()

        if data.get('status'):
            Payment.objects.create(
                invoice=invoice,
                amount=invoice.balance,
                gateway=Payment.PAYSTACK,
                transaction_ref=ref,
                gateway_ref=data['data']['reference'],
            )
            return Response({
                'authorization_url': data['data']['authorization_url'],
                'reference': ref,
                'access_code': data['data']['access_code'],
            })

        return Response({'error': 'Payment initiation failed.'}, status=502)


class VerifyPaymentView(APIView):
    """POST /api/v1/fees/verify-payment/ — Verify Paystack payment"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ref = request.data.get('reference')
        try:
            payment = Payment.objects.get(transaction_ref=ref)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'}, status=404)

        headers = {'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'}
        resp = requests.get(
            f'{settings.PAYSTACK_BASE_URL}/transaction/verify/{ref}',
            headers=headers, timeout=30
        )
        data = resp.json()

        if data.get('status') and data['data']['status'] == 'success':
            payment.is_verified = True
            payment.verified_at = timezone.now()
            payment.metadata = data['data']
            payment.save()

            invoice = payment.invoice
            invoice.amount_paid += payment.amount
            invoice.status = Invoice.PAID if invoice.amount_paid >= invoice.total_amount else Invoice.PARTIAL
            invoice.save()

            return Response({'status': 'success', 'message': 'Payment verified successfully.'})

        return Response({'status': 'failed', 'message': 'Payment verification failed.'}, status=400)


class PaymentHistoryView(generics.ListAPIView):
    """GET /api/v1/fees/payment-history/ — Student payment history"""
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            invoice__student__user=self.request.user,
            is_verified=True
        ).order_by('-payment_date')
