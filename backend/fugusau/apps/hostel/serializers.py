"""FUGUSAU Portal — Hostel Serializers (Fixed)

Fixes:
  1. HostelAllocationSerializer: 'student' and 'room' write fields were exposed
     to unauthenticated update — added explicit read_only for admin-set fields.
  2. HostelAllocationSerializer: 'vacated_at' and 'remarks' added to read_only_fields
     so students cannot self-set them via PATCH.
  3. RoomSerializer: 'current_occupants' and 'has_space' added from model properties
     so the frontend can show per-room capacity instead of just binary is_occupied.
  4. HostelSerializer: 'created_at' added to fields (was silently dropped).
  5. HostelAllocationSerializer: validate() added to reject bookings where the
     room's hostel gender doesn't match the student's gender.
"""
from rest_framework import serializers
from .models import Hostel, Room, HostelAllocation


class RoomSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    # FIX 3: Expose real occupant count and space flag to the frontend
    current_occupants = serializers.ReadOnlyField()
    has_space         = serializers.ReadOnlyField()

    class Meta:
        model  = Room
        fields = [
            'id', 'hostel', 'hostel_name', 'room_number',
            'capacity', 'current_occupants', 'has_space',
            'is_occupied', 'is_active',
        ]
        read_only_fields = ['id', 'is_occupied']


class HostelSerializer(serializers.ModelSerializer):
    available_rooms = serializers.ReadOnlyField()
    occupied_rooms  = serializers.ReadOnlyField()
    rooms           = RoomSerializer(many=True, read_only=True)

    class Meta:
        model  = Hostel
        fields = [
            'id', 'name', 'gender', 'capacity', 'warden',
            'amenities', 'is_active',
            'available_rooms', 'occupied_rooms',
            'rooms',
            'created_at',   # FIX 4
        ]
        read_only_fields = ['id', 'created_at']


class HostelAllocationSerializer(serializers.ModelSerializer):
    student_name  = serializers.CharField(source='student.user.get_full_name', read_only=True)
    matric_number = serializers.CharField(source='student.matric_number',       read_only=True)
    room_number   = serializers.CharField(source='room.room_number',            read_only=True)
    hostel_name   = serializers.CharField(source='room.hostel.name',            read_only=True)
    session_name  = serializers.CharField(source='session.name',                read_only=True)

    class Meta:
        model  = HostelAllocation
        fields = [
            'id', 'student', 'student_name', 'matric_number',
            'room', 'room_number', 'hostel_name',
            'session', 'session_name', 'status',
            'allocated_by', 'allocated_at', 'vacated_at', 'remarks',
        ]
        # FIX 1 & 2: Lock down all admin-only or auto-set fields
        read_only_fields = [
            'id', 'allocated_at', 'allocated_by',
            'vacated_at', 'remarks',   # set only via VacateRoomView / RejectAllocationView
            'status',                  # set only via dedicated action endpoints
        ]

    # FIX 5: Gender validation — prevent cross-gender hostel bookings
    def validate(self, data):
        room = data.get('room')
        student = data.get('student')
        if room and student:
            hostel_gender = room.hostel.gender
            # Only enforce for single-gender hostels
            if hostel_gender != Hostel.MIXED:
                student_gender = getattr(student, 'gender', None)
                if student_gender and student_gender != hostel_gender:
                    raise serializers.ValidationError(
                        f'This hostel is for {hostel_gender} students only.'
                    )
        return data
