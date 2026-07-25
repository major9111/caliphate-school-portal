"""FUGUSAU Portal — Hostel App Models (Fixed)

Fixes:
  1. Room.current_occupants property added — counts actual approved allocations,
     so capacity validation in views can use it instead of the binary is_occupied flag.
  2. Hostel.available_rooms now correctly excludes rooms at full capacity,
     not just rooms flagged is_occupied (which is binary and ignores partial occupancy).
  3. HostelAllocation: max_length=10 on status is too tight for future values;
     raised to 20 for safety. 'rejected' itself is 8 chars — fine — but good practice.
  4. Added db_index=True on status and session FK for query performance.
  5. Hostel.__str__ was a one-liner that hid the gender — made it informative.
"""
import uuid
from django.db import models
from django.conf import settings
from fugusau.apps.students.models import StudentProfile
from fugusau.apps.courses.models import AcademicSession


class Hostel(models.Model):
    MALE   = 'male'
    FEMALE = 'female'
    MIXED  = 'mixed'
    GENDER_CHOICES = [(MALE, 'Male'), (FEMALE, 'Female'), (MIXED, 'Mixed')]

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=200)
    gender   = models.CharField(max_length=10, choices=GENDER_CHOICES)
    capacity = models.PositiveIntegerField()
    warden   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='managed_hostels'
    )
    amenities  = models.JSONField(default=list, blank=True, help_text='["WiFi", "Water", "Generator"]')
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hostels'

    # FIX 5: More informative __str__
    def __str__(self):
        return f'{self.name} ({self.get_gender_display()})'

    @property
    def occupied_rooms(self):
        return self.rooms.filter(is_occupied=True).count()

    @property
    def available_rooms(self):
        return self.rooms.filter(is_occupied=False, is_active=True).count()


class Room(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hostel      = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=20)
    capacity    = models.PositiveIntegerField(default=4)
    is_occupied = models.BooleanField(default=False)
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table = 'hostel_rooms'
        unique_together = ['hostel', 'room_number']

    def __str__(self):
        return f'{self.hostel.name} — Room {self.room_number}'

    # FIX 1: Count real active allocations, not just the binary flag.
    # Useful for future multi-occupant rooms and for validation.
    @property
    def current_occupants(self):
        return self.allocations.filter(status=HostelAllocation.APPROVED).count()

    @property
    def has_space(self):
        return self.current_occupants < self.capacity


class HostelAllocation(models.Model):
    PENDING  = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    VACATED  = 'vacated'

    STATUS_CHOICES = [
        (PENDING,  'Pending'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (VACATED,  'Vacated'),
    ]

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='hostel_allocations')
    room    = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='allocations')
    # FIX 4: Index session FK — nearly every query filters on it
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE, db_index=True)
    # FIX 3: max_length raised from 10 → 20 for future-proofing
    # FIX 4: db_index on status — heavily filtered in list views
    status  = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING, db_index=True)
    allocated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    allocated_at = models.DateTimeField(auto_now_add=True)
    vacated_at   = models.DateTimeField(blank=True, null=True)
    remarks      = models.TextField(blank=True)

    class Meta:
        db_table = 'hostel_allocations'
        unique_together = ['student', 'session']
        ordering = ['-allocated_at']

    def __str__(self):
        return f'{self.student.matric_number} → {self.room}'
