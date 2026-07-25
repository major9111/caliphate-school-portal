"""FUGUSAU Portal — Students App Models"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Faculty(models.Model):
    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    numeric_id = models.CharField(max_length=2, unique=True, null=True, blank=True)
    dean = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_faculties')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'faculties'
        verbose_name_plural = 'Faculties'

    def __str__(self): return f'{self.code} — {self.name}'


class Department(models.Model):
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    name    = models.CharField(max_length=200)
    code    = models.CharField(max_length=20, unique=True)
    numeric_id = models.CharField(max_length=2, null=True, blank=True)
    hod     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments')

    class Meta:
        db_table = 'departments'

    def __str__(self): return f'{self.code} — {self.name}'


class Specialization(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='specializations')
    name       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    min_entry_requirements = models.JSONField(default=dict, help_text="e.g. {'subjects':['Math','English'],'min_grade':'C'}")

    class Meta:
        db_table = 'specializations'

    def __str__(self): return self.name


class StudentProfile(models.Model):
    ACTIVE     = 'active'
    SUSPENDED  = 'suspended'
    GRADUATED  = 'graduated'
    DEFERRED   = 'deferred'
    WITHDRAWN  = 'withdrawn'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'), (SUSPENDED, 'Suspended'),
        (GRADUATED, 'Graduated'), (DEFERRED, 'Deferred'),
        (WITHDRAWN, 'Withdrawn'),
    ]

    LEVEL_CHOICES = [(100,'100L'),(200,'200L'),(300,'300L'),(400,'400L'),(500,'500L')]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    matric_number   = models.CharField(max_length=20, unique=True, blank=True)
    
    # Registration number components stored separately for search/reporting
    reg_year        = models.CharField(max_length=2, blank=True, db_index=True)
    reg_entry_level = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)
    reg_faculty_id  = models.CharField(max_length=2, blank=True, db_index=True)
    reg_dept_id     = models.CharField(max_length=2, blank=True, db_index=True)
    reg_sequence    = models.PositiveIntegerField(null=True, blank=True, db_index=True)

    department      = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='students')
    specialization  = models.ForeignKey(Specialization, on_delete=models.SET_NULL, null=True, blank=True)
    level           = models.IntegerField(choices=LEVEL_CHOICES, default=100)
    admission_year  = models.IntegerField()
    admission_session = models.CharField(max_length=20)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ACTIVE)
    cgpa            = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    total_credit_units_earned = models.IntegerField(default=0)

    # Entry requirements
    jamb_score      = models.IntegerField(blank=True, null=True)
    jamb_reg_number = models.CharField(max_length=20, blank=True)
    o_level_result  = models.JSONField(default=dict, blank=True)

    # Personal
    state_of_origin = models.CharField(max_length=100, blank=True)
    lga_of_origin   = models.CharField(max_length=100, blank=True)
    home_address    = models.TextField(blank=True)
    next_of_kin     = models.CharField(max_length=200, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    next_of_kin_relationship = models.CharField(max_length=50, blank=True)

    # Medical
    blood_group     = models.CharField(max_length=5, blank=True)
    genotype        = models.CharField(max_length=5, blank=True)
    medical_conditions = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        ordering = ['matric_number']

    def __str__(self): return f'{self.matric_number} — {self.user.get_full_name()}'

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        # Enforce read-only constraint on matric_number once set
        if self.pk:
            try:
                original = StudentProfile.objects.get(pk=self.pk)
                if original.matric_number and original.matric_number != self.matric_number:
                    raise ValidationError({'matric_number': 'Registration number cannot be edited after creation.'})
            except StudentProfile.DoesNotExist:
                pass

    def save(self, *args, **kwargs):
        from django.db import transaction
        from django.core.exceptions import ValidationError
        import re

        # Enforce read-only constraint on matric_number once set
        if self.pk:
            try:
                original = StudentProfile.objects.get(pk=self.pk)
                if original.matric_number and original.matric_number != self.matric_number:
                    raise ValidationError('Registration number cannot be edited after creation.')
            except StudentProfile.DoesNotExist:
                pass

        # Parse components if matric_number is manually provided in the correct format
        if self.matric_number:
            match = re.match(r"^(\d{2})/(\d)/(\d{2})/(\d{2})/(\d{3})$", self.matric_number)
            if match:
                self.reg_year = match.group(1)
                self.reg_entry_level = int(match.group(2))
                self.reg_faculty_id = match.group(3)
                self.reg_dept_id = match.group(4)
                self.reg_sequence = int(match.group(5))

        elif self.department and self.admission_year:
            # Prevent duplicate registration numbers even under heavy concurrent requests
            with transaction.atomic():
                # Lock the department record to serialize registration number allocation
                dept = Department.objects.select_related('faculty').select_for_update().get(id=self.department_id)

                if not dept.faculty.numeric_id:
                    raise ValidationError(f"Faculty '{dept.faculty.name}' does not have a numeric ID configured.")
                if not dept.numeric_id:
                    raise ValidationError(f"Department '{dept.name}' does not have a numeric ID configured.")

                yy = f"{self.admission_year:04d}"[-2:]
                l = str(self.level // 100) if self.level else "1"
                ff = dept.faculty.numeric_id
                dd = dept.numeric_id

                # Query maximum sequence number for this department and admission year
                last_student = StudentProfile.objects.filter(
                    department=dept,
                    admission_year=self.admission_year
                ).order_by('-reg_sequence').first()

                next_seq = (last_student.reg_sequence + 1) if last_student and last_student.reg_sequence else 1
                sss = f"{next_seq:03d}"

                self.reg_year = yy
                self.reg_entry_level = int(l)
                self.reg_faculty_id = ff
                self.reg_dept_id = dd
                self.reg_sequence = next_seq
                self.matric_number = f"{yy}/{l}/{ff}/{dd}/{sss}"

        super().save(*args, **kwargs)


class ParentProfile(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile')
    wards        = models.ManyToManyField(StudentProfile, related_name='parents', blank=True)
    relationship = models.CharField(max_length=50, default='Parent')
    occupation   = models.CharField(max_length=100, blank=True)
    address      = models.TextField(blank=True)

    class Meta:
        db_table = 'parent_profiles'


class LecturerProfile(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name='lecturer_profile')
    staff_id     = models.CharField(max_length=20, unique=True)
    department   = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    title        = models.CharField(max_length=50, blank=True, help_text='e.g. Dr., Prof.')
    qualification = models.CharField(max_length=200, blank=True)
    specialization_area = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'lecturer_profiles'

    def __str__(self): return f'{self.title} {self.user.get_full_name()} ({self.staff_id})'
