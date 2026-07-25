"""FUGUSAU Portal — Credentials App Models"""
import uuid
from django.db import models
from fugusau.apps.students.models import StudentProfile


class Credential(models.Model):
    WAEC    = 'WAEC'
    NECO    = 'NECO'
    JAMB    = 'JAMB'
    BIRTH   = 'BIRTH_CERT'
    LGC     = 'LGC'
    NYSC    = 'NYSC'
    DEGREE  = 'DEGREE'
    OTHER   = 'OTHER'

    DOC_TYPE_CHOICES = [
        (WAEC,'WAEC SSCE Result'),(NECO,'NECO SSCE Result'),
        (JAMB,'JAMB Result'),(BIRTH,'Birth Certificate'),
        (LGC,'Local Government Certificate'),(NYSC,'NYSC Certificate'),
        (DEGREE,'University Degree'),(OTHER,'Other'),
    ]

    PENDING    = 'pending'
    REVIEWING  = 'reviewing'
    AUTHENTIC  = 'authentic'
    SUSPICIOUS = 'suspicious'
    FORGED     = 'forged'
    REJECTED   = 'rejected'

    STATUS_CHOICES = [
        (PENDING,'Pending'),(REVIEWING,'Under Review'),
        (AUTHENTIC,'Verified Authentic'),(SUSPICIOUS,'Suspicious'),
        (FORGED,'Forged — Rejected'),(REJECTED,'Rejected'),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student        = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='credentials')
    doc_type       = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    file           = models.FileField(upload_to='credentials/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    file_hash      = models.CharField(max_length=64, blank=True, help_text='SHA-256 hash for tamper detection')

    # AI Analysis Results
    forgery_risk_score = models.IntegerField(default=0, help_text='0=clean, 100=definitely forged')
    ai_verdict     = models.CharField(max_length=20, blank=True)
    ai_findings    = models.JSONField(default=dict, blank=True, help_text='Detailed AI analysis findings')
    extracted_text = models.TextField(blank=True, help_text='OCR extracted text')

    # External verification
    external_verified = models.BooleanField(default=False)
    external_data  = models.JSONField(default=dict, blank=True)

    # Manual review
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    reviewed_by    = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_credentials'
    )
    reviewed_at    = models.DateTimeField(blank=True, null=True)
    review_notes   = models.TextField(blank=True)

    uploaded_at    = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'credentials'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.student.matric_number} — {self.doc_type} ({self.status})'
