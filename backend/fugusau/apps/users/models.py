"""FUGUSAU Portal — Users App Models"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Central user model for all roles"""

    STUDENT  = 'student'
    LECTURER = 'lecturer'
    ADMIN    = 'admin'
    PARENT   = 'parent'

    ROLE_CHOICES = [
        (STUDENT,  'Student'),
        (LECTURER, 'Lecturer'),
        (ADMIN,    'Admin'),
        (PARENT,   'Parent'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email        = models.EmailField(unique=True)
    first_name   = models.CharField(max_length=100)
    middle_name  = models.CharField(max_length=100, blank=True)
    last_name    = models.CharField(max_length=100)
    role         = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STUDENT)
    phone        = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender       = models.CharField(max_length=10, choices=[('M','Male'),('F','Female')], blank=True)

    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    is_verified  = models.BooleanField(default=False)
    two_fa_enabled = models.BooleanField(default=False)

    date_joined  = models.DateTimeField(default=timezone.now)
    last_login   = models.DateTimeField(blank=True, null=True)
    last_seen    = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        ordering = ['last_name', 'first_name']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    def get_full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)

    @property
    def is_student(self): return self.role == self.STUDENT
    @property
    def is_lecturer(self): return self.role == self.LECTURER
    @property
    def is_admin(self): return self.role == self.ADMIN
    @property
    def is_parent(self): return self.role == self.PARENT


class AuditLog(models.Model):
    """Tracks sensitive actions across the system"""
    ACTION_CHOICES = [
        ('LOGIN', 'Login'), ('LOGOUT', 'Logout'),
        ('PASSWORD_CHANGE', 'Password Change'),
        ('GRADE_UPLOAD', 'Grade Upload'), ('GRADE_EDIT', 'Grade Edit'),
        ('PAYMENT', 'Payment'), ('DOCUMENT_UPLOAD', 'Document Upload'),
        ('ADMISSION', 'Admission Action'), ('ACCOUNT_SUSPEND', 'Account Suspended'),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action     = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)
    extra_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']


class ParentStudentLink(models.Model):
    """Links a parent user to one or more student users (admin-verified)."""
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent   = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='linked_students',
        limit_choices_to={'role': 'parent'},
    )
    student  = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='linked_parents',
        limit_choices_to={'role': 'student'},
    )
    verified   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'parent_student_links'
        unique_together = ['parent', 'student']

    def __str__(self):
        return f'{self.parent.get_full_name()} → {self.student.get_full_name()}'
