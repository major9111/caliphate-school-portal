"""FUGUSAU Portal — Hostel Admin (Fixed)

Fixes:
  1. HostelAdmin: added search_fields, actions (deactivate), and available_rooms
     as a computed column so admins can triage quickly.
  2. RoomAdmin: added search_fields and list_select_related to avoid N+1 queries
     in the changelist (was hitting the DB once per row for hostel.name).
  3. HostelAllocationAdmin: added raw_id_fields for student/room/session to avoid
     loading all students into a <select> dropdown (very expensive at scale).
     Added date_hierarchy, readonly_fields, and inline actions.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Hostel, Room, HostelAllocation


class RoomInline(admin.TabularInline):
    model  = Room
    extra  = 0
    fields = ['room_number', 'capacity', 'is_occupied', 'is_active']
    readonly_fields = ['is_occupied']


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display   = ['name', 'gender', 'capacity', 'available_rooms_display', 'warden', 'is_active']
    list_filter    = ['gender', 'is_active']
    search_fields  = ['name', 'warden__first_name', 'warden__last_name']
    inlines        = [RoomInline]
    actions        = ['deactivate_hostels', 'activate_hostels']

    # FIX 1: Computed column — shows live available rooms count
    @admin.display(description='Available Rooms')
    def available_rooms_display(self, obj):
        count = obj.available_rooms
        color = 'green' if count > 0 else 'red'
        return format_html('<span style="color:{}">{}</span>', color, count)

    @admin.action(description='Deactivate selected hostels')
    def deactivate_hostels(self, request, queryset):
        queryset.update(is_active=False)

    @admin.action(description='Activate selected hostels')
    def activate_hostels(self, request, queryset):
        queryset.update(is_active=True)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display         = ['hostel', 'room_number', 'capacity', 'is_occupied', 'is_active']
    list_filter          = ['hostel', 'is_occupied', 'is_active']
    # FIX 2: Avoid N+1 on changelist — hostel name was queried per row
    list_select_related  = ['hostel']
    search_fields        = ['room_number', 'hostel__name']


@admin.register(HostelAllocation)
class HostelAllocationAdmin(admin.ModelAdmin):
    list_display    = ['student', 'room', 'session', 'status', 'allocated_by', 'allocated_at']
    list_filter     = ['status', 'session']
    search_fields   = ['student__matric_number', 'student__user__first_name', 'student__user__last_name']
    # FIX 3: raw_id_fields prevents loading all students into a dropdown
    raw_id_fields   = ['student', 'room', 'session', 'allocated_by']
    readonly_fields = ['allocated_at', 'vacated_at']
    date_hierarchy  = 'allocated_at'
    list_select_related = ['student__user', 'room__hostel', 'session']
