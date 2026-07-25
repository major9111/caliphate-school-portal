"""FUGUSAU Portal — Fees App Models"""
import uuid
from django.db import models
from fugusau.apps.students.models import StudentProfile
from fugusau.apps.courses.models import AcademicSession


class FeeType(models.Model):
    TUITION      = 'tuition'
    ACCEPTANCE   = 'acceptance'
    LIBRARY      = 'library'
    EXAM         = 'exam'
    DEPARTMENTAL = 'departmental'
    HOSTEL       = 'hostel'
    MEDICAL      = 'medical'
    SPORT        = 'sport'
    OTHER        = 'other'

    CATEGORY_CHOICES = [
        (TUITION,'Tuition'),(ACCEPTANCE,'Acceptance'),(LIBRARY,'Library'),
        (EXAM,'Exam'),(DEPARTMENTAL,'Departmental'),(HOSTEL,'Hostel'),
        (MEDICAL,'Medical'),(SPORT,'Sport'),(OTHER,'Other'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200)
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    session     = models.ForeignKey(AcademicSession, on_delete=models.CASCADE, related_name='fee_types')
    semester    = models.CharField(max_length=10, blank=True, help_text='Leave blank for annual fees')
    level       = models.IntegerField(blank=True, null=True, help_text='Null = all levels')
    is_mandatory = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'fee_types'

    def __str__(self): return f'{self.name} — ₦{self.amount}'


class Invoice(models.Model):
    PENDING = 'pending'
    PAID    = 'paid'
    PARTIAL = 'partial'
    OVERDUE = 'overdue'

    STATUS_CHOICES = [(PENDING,'Pending'),(PAID,'Paid'),(PARTIAL,'Partial'),(OVERDUE,'Overdue')]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_no  = models.CharField(max_length=30, unique=True)
    student     = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='invoices')
    fee_types   = models.ManyToManyField(FeeType, related_name='invoices')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    due_date    = models.DateField()
    generated_at = models.DateTimeField(auto_now_add=True)
    rrr         = models.CharField(max_length=50, blank=True, help_text='Remita Retrieval Reference')

    class Meta:
        db_table = 'invoices'
        ordering = ['-generated_at']

    def __str__(self): return f'INV-{self.invoice_no} — {self.student.matric_number}'

    @property
    def balance(self):
        return self.total_amount - self.amount_paid


class Payment(models.Model):
    PAYSTACK = 'paystack'
    REMITA   = 'remita'
    BANK     = 'bank'

    GATEWAY_CHOICES = [(PAYSTACK,'Paystack'),(REMITA,'Remita'),(BANK,'Bank Transfer')]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice         = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount          = models.DecimalField(max_digits=10, decimal_places=2)
    gateway         = models.CharField(max_length=20, choices=GATEWAY_CHOICES)
    transaction_ref = models.CharField(max_length=100, unique=True)
    gateway_ref     = models.CharField(max_length=100, blank=True)
    is_verified     = models.BooleanField(default=False)
    verified_at     = models.DateTimeField(blank=True, null=True)
    payment_date    = models.DateTimeField(auto_now_add=True)
    metadata        = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

    def __str__(self): return f'₦{self.amount} via {self.gateway} — {self.transaction_ref}'
