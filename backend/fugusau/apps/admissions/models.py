"""
FUGUSAU Portal — Admissions App Models
Full application lifecycle: apply → review → offer → accept/decline → enroll
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class AdmissionSession(models.Model):
    """Academic year admission window"""
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_name = models.CharField(max_length=20, unique=True, help_text='e.g. 2025/2026')
    open_date    = models.DateField()
    close_date   = models.DateField()
    offer_deadline = models.DateField(help_text='Deadline for applicants to accept/decline offer')
    is_active    = models.BooleanField(default=False)
    total_slots  = models.IntegerField(default=0)
    filled_slots = models.IntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admission_sessions'
        ordering = ['-session_name']

    def save(self, *args, **kwargs):
        if self.is_active:
            AdmissionSession.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    @property
    def is_open(self):
        today = timezone.now().date()
        return self.open_date <= today <= self.close_date

    @property
    def slots_remaining(self):
        return self.total_slots - self.filled_slots

    def __str__(self):
        return f'{self.session_name} ({"ACTIVE" if self.is_active else "CLOSED"})'


class Application(models.Model):
    """A prospective student's admission application"""

    # ── Status Flow ──────────────────────────────────────
    SUBMITTED   = 'submitted'    # Applicant submitted form
    SCREENING   = 'screening'    # Admin reviewing documents
    SHORTLISTED = 'shortlisted'  # Passed screening, awaiting final decision
    OFFERED     = 'offered'      # Offer letter sent
    ACCEPTED    = 'accepted'     # Applicant accepted the offer
    DECLINED    = 'declined'     # Applicant declined the offer
    REJECTED    = 'rejected'     # Admin rejected the application
    WAITLISTED  = 'waitlisted'   # On waiting list
    EXPIRED     = 'expired'      # Offer expired without response
    ENROLLED    = 'enrolled'     # Fully registered student

    STATUS_CHOICES = [
        (SUBMITTED,   'Submitted'),
        (SCREENING,   'Under Screening'),
        (SHORTLISTED, 'Shortlisted'),
        (OFFERED,     'Offer Sent'),
        (ACCEPTED,    'Offer Accepted'),
        (DECLINED,    'Offer Declined'),
        (REJECTED,    'Rejected'),
        (WAITLISTED,  'Waitlisted'),
        (EXPIRED,     'Offer Expired'),
        (ENROLLED,    'Enrolled'),
    ]

    PROGRAMME_CHOICES = [
        ('BSC', 'Bachelor of Science (B.Sc.)'),
        ('BEng', 'Bachelor of Engineering (B.Eng.)'),
        ('BA', 'Bachelor of Arts (B.A.)'),
        ('BEd', 'Bachelor of Education (B.Ed.)'),
        ('LLB', 'Bachelor of Laws (LLB)'),
        ('MBBS', 'Medicine (MBBS)'),
    ]

    ENTRY_CHOICES = [
        ('UTME', 'UTME/Post-UTME'),
        ('DE',   'Direct Entry'),
        ('TRANSFER', 'Inter-University Transfer'),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_no   = models.CharField(max_length=20, unique=True)
    session          = models.ForeignKey(AdmissionSession, on_delete=models.CASCADE, related_name='applications')
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default=SUBMITTED)

    # ── Personal Info ─────────────────────────────────────
    first_name       = models.CharField(max_length=100)
    middle_name      = models.CharField(max_length=100, blank=True)
    last_name        = models.CharField(max_length=100)
    email            = models.EmailField(unique=False)
    phone            = models.CharField(max_length=20)
    date_of_birth    = models.DateField()
    gender           = models.CharField(max_length=10, choices=[('M','Male'),('F','Female')])
    state_of_origin  = models.CharField(max_length=100)
    lga              = models.CharField(max_length=100)
    nationality      = models.CharField(max_length=100, default='Nigerian')
    home_address     = models.TextField()
    passport_photo   = models.ImageField(upload_to='admissions/photos/', blank=True, null=True)

    # ── Academic Choice ────────────────────────────────────
    programme        = models.CharField(max_length=10, choices=PROGRAMME_CHOICES, default='BSC')
    entry_type       = models.CharField(max_length=10, choices=ENTRY_CHOICES, default='UTME')
    first_choice_dept  = models.ForeignKey(
        'students.Department', on_delete=models.SET_NULL, null=True,
        related_name='first_choice_applications'
    )
    second_choice_dept = models.ForeignKey(
        'students.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='second_choice_applications'
    )

    # ── Examination Results ────────────────────────────────
    jamb_reg_no      = models.CharField(max_length=20)
    jamb_score       = models.IntegerField()
    jamb_year        = models.IntegerField()
    post_utme_score  = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    aggregate_score  = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                           help_text='Combined JAMB + Post-UTME score')

    # O'Level Results (JSON: {'WAEC': {'subjects': [{'name':'Math','grade':'A1'},...], 'year':2024}})
    o_level_results  = models.JSONField(default=dict, blank=True)
    waec_exam_no     = models.CharField(max_length=20, blank=True)
    neco_exam_no     = models.CharField(max_length=20, blank=True)

    # ── Qualification Checks ───────────────────────────────
    meets_jamb_cutoff    = models.BooleanField(null=True, blank=True)
    meets_subject_reqs   = models.BooleanField(null=True, blank=True)
    meets_age_requirement = models.BooleanField(null=True, blank=True)
    credentials_verified  = models.BooleanField(default=False)

    # ── Offer Details ──────────────────────────────────────
    offered_department   = models.ForeignKey(
        'students.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='offered_applications'
    )
    offered_at           = models.DateTimeField(null=True, blank=True)
    offer_expires_at     = models.DateTimeField(null=True, blank=True)
    offer_letter_sent    = models.BooleanField(default=False)

    # ── Applicant Response ─────────────────────────────────
    applicant_response   = models.CharField(
        max_length=20, blank=True,
        choices=[('accepted','Accepted'),('declined','Declined')]
    )
    response_at          = models.DateTimeField(null=True, blank=True)
    decline_reason       = models.TextField(blank=True)

    # ── Admin Review ───────────────────────────────────────
    reviewed_by          = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_applications'
    )
    reviewed_at          = models.DateTimeField(null=True, blank=True)
    rejection_reason     = models.TextField(blank=True)
    admin_notes          = models.TextField(blank=True)
    screening_score      = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # ── Timestamps ────────────────────────────────────────
    submitted_at         = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    # ── Linked User (after enrollment) ────────────────────
    linked_user          = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='admission_application'
    )

    class Meta:
        db_table = 'applications'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['jamb_reg_no']),
            models.Index(fields=['email']),
            models.Index(fields=['application_no']),
        ]

    def __str__(self):
        return f'{self.application_no} — {self.get_full_name()} [{self.status.upper()}]'

    def get_full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)

    @property
    def is_offer_expired(self):
        return (
            self.status == self.OFFERED and
            self.offer_expires_at and
            timezone.now() > self.offer_expires_at
        )

    @property
    def days_to_respond(self):
        if self.status == self.OFFERED and self.offer_expires_at:
            delta = self.offer_expires_at - timezone.now()
            return max(0, delta.days)
        return None


class ApplicationDocument(models.Model):
    """Documents uploaded by applicant during application"""
    JAMB_RESULT  = 'JAMB_RESULT'
    WAEC_RESULT  = 'WAEC_RESULT'
    NECO_RESULT  = 'NECO_RESULT'
    BIRTH_CERT   = 'BIRTH_CERT'
    LGA_CERT     = 'LGA_CERT'
    PASSPORT     = 'PASSPORT'
    MEDICAL_CERT = 'MEDICAL_CERT'
    OTHER        = 'OTHER'

    DOC_TYPES = [
        (JAMB_RESULT,'JAMB Result'),(WAEC_RESULT,'WAEC Result'),
        (NECO_RESULT,'NECO Result'),(BIRTH_CERT,'Birth Certificate'),
        (LGA_CERT,'LGA Certificate'),(PASSPORT,'Passport Photograph'),
        (MEDICAL_CERT,'Medical Certificate'),(OTHER,'Other'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    doc_type    = models.CharField(max_length=20, choices=DOC_TYPES)
    file        = models.FileField(upload_to='admissions/documents/%Y/%m/')
    filename    = models.CharField(max_length=255)
    verified    = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes       = models.TextField(blank=True)

    class Meta:
        db_table = 'application_documents'


class AdmissionOffer(models.Model):
    """Detailed offer letter record"""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application     = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='offer')
    offer_number    = models.CharField(max_length=30, unique=True)
    department      = models.ForeignKey('students.Department', on_delete=models.CASCADE)
    programme       = models.CharField(max_length=10)
    entry_level     = models.IntegerField(default=100)
    session         = models.CharField(max_length=20)
    scholarship     = models.BooleanField(default=False)
    scholarship_details = models.TextField(blank=True)
    special_conditions  = models.TextField(blank=True,
        help_text='e.g. Must submit NYSC certificate before resumption')
    acceptance_fee  = models.DecimalField(max_digits=10, decimal_places=2, default=25000)
    issued_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    issued_at       = models.DateTimeField(auto_now_add=True)
    expires_at      = models.DateTimeField()
    email_sent      = models.BooleanField(default=False)
    sms_sent        = models.BooleanField(default=False)

    class Meta:
        db_table = 'admission_offers'
        ordering = ['-issued_at']

    def __str__(self):
        return f'Offer {self.offer_number} → {self.application.get_full_name()}'


class ApplicationStatusHistory(models.Model):
    """Full audit trail of every status change"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='history')
    from_status = models.CharField(max_length=20, blank=True)
    to_status   = models.CharField(max_length=20)
    changed_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    reason      = models.TextField(blank=True)
    timestamp   = models.DateTimeField(auto_now_add=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'application_status_history'
        ordering = ['-timestamp']
