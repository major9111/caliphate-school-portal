"""FUGUSAU Portal — Exams App Models"""
import uuid
from django.db import models
from django.conf import settings
from fugusau.apps.students.models import StudentProfile
from fugusau.apps.courses.models import Course, Enrollment, AcademicSession


class ExamSchedule(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course      = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exam_schedules')
    session     = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    semester    = models.CharField(max_length=10)
    exam_date   = models.DateField()
    start_time  = models.TimeField()
    duration_minutes = models.IntegerField(default=120)
    venue       = models.CharField(max_length=200)
    instructions = models.TextField(blank=True)
    invigilator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invigilated_exams'
    )

    class Meta:
        db_table = 'exam_schedules'
        ordering = ['exam_date', 'start_time']
        unique_together = ['course', 'session', 'semester']

    def __str__(self):
        return f'{self.course.code} — {self.exam_date}'


class Result(models.Model):
    """Stores student results per course per session"""
    GRADE_CHOICES = [('A','A'),('B+','B+'),('B','B'),('C+','C+'),('C','C'),('D','D'),('F','F')]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='result')
    ca_score   = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    exam_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    grade      = models.CharField(max_length=3, choices=GRADE_CHOICES, blank=True)
    grade_point = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    is_senate_approved = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='uploaded_results'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    remarks     = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'results'
        ordering = ['-uploaded_at']

    def save(self, *args, **kwargs):
        self.total_score = self.ca_score + self.exam_score
        self.grade, self.grade_point = self._compute_grade(float(self.total_score))
        super().save(*args, **kwargs)
        self._update_student_cgpa()

    def _compute_grade(self, score):
        for grade, (low, high, gp) in settings.GRADE_BOUNDARIES.items():
            if low <= score <= high:
                return grade, gp
        return 'F', 0.0

    def _update_student_cgpa(self):
        """Recalculate student CGPA after result upload"""
        from django.db.models import Sum, F
        student = self.enrollment.student
        results = Result.objects.filter(
            enrollment__student=student,
            is_senate_approved=True
        ).select_related('enrollment__course')

        total_gp = sum(float(r.grade_point) * r.enrollment.course.credit_units for r in results)
        total_units = sum(r.enrollment.course.credit_units for r in results)
        student.cgpa = round(total_gp / total_units, 2) if total_units > 0 else 0
        student.total_credit_units_earned = total_units
        student.save(update_fields=['cgpa', 'total_credit_units_earned'])


class ExamClearance(models.Model):
    """Whether a student is cleared to sit an exam (fees paid, registered, etc.)"""
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student    = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='exam_clearances')
    session    = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    semester   = models.CharField(max_length=10)
    is_cleared = models.BooleanField(default=False)
    cleared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    cleared_at = models.DateTimeField(blank=True, null=True)
    remarks    = models.TextField(blank=True)

    class Meta:
        db_table = 'exam_clearances'
        unique_together = ['student', 'session', 'semester']
