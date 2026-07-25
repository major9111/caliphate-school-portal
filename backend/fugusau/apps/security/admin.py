"""
FUGUSAU Portal — Security App Admin
Path: fugusau/apps/security/admin.py

Fix #10a: security/admin.py was missing, so none of the security models
appeared in the Django admin panel, making moderation/debugging much harder.
"""
from django.contrib import admin
from django.utils.html import format_html

from .models import (
    SecurityEvent,
    BlockedIP,
    UserSession,
    LoginAttempt,
    SecurityPolicy,
    SecurityAnalystProfile,
    SystemHealthSnapshot,
)


# ─── Security Event ───────────────────────────────────────────────────────────
@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display    = ('event_type', 'threat_level_badge', 'ip_address', 'status', 'timestamp')
    list_filter     = ('threat_level', 'status', 'event_type')
    search_fields   = ('ip_address', 'user__email', 'description')
    readonly_fields = ('timestamp',)
    ordering        = ('-timestamp',)
    date_hierarchy  = 'timestamp'

    def threat_level_badge(self, obj):
        colour = {
            'low':      '#28a745',
            'medium':   '#ffc107',
            'high':     '#fd7e14',
            'critical': '#dc3545',
        }.get(obj.threat_level, '#6c757d')
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>',
            colour, obj.threat_level.upper(),
        )
    threat_level_badge.short_description = 'Threat Level'


# ─── Blocked IP ───────────────────────────────────────────────────────────────
@admin.register(BlockedIP)
class BlockedIPAdmin(admin.ModelAdmin):
    list_display  = ('ip_address', 'reason', 'is_active', 'blocked_at', 'expires_at')
    list_filter   = ('is_active',)
    search_fields = ('ip_address', 'reason')
    ordering      = ('-blocked_at',)
    actions       = ['unblock_selected']

    def unblock_selected(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f'{queryset.count()} IP(s) unblocked.')
    unblock_selected.short_description = 'Unblock selected IPs'


# ─── User Session ─────────────────────────────────────────────────────────────
@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display    = ('user', 'ip_address', 'device_type', 'login_at', 'last_activity', 'is_active', 'is_suspicious')
    list_filter     = ('is_active', 'is_suspicious', 'device_type')
    search_fields   = ('user__email', 'ip_address')
    readonly_fields = ('login_at', 'last_activity')
    ordering        = ('-last_activity',)


# ─── Login Attempt ────────────────────────────────────────────────────────────
@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display    = ('email', 'ip_address', 'success', 'timestamp')
    list_filter     = ('success',)
    search_fields   = ('email', 'ip_address')
    readonly_fields = ('timestamp',)
    ordering        = ('-timestamp',)
    date_hierarchy  = 'timestamp'


# ─── Security Policy ──────────────────────────────────────────────────────────
@admin.register(SecurityPolicy)
class SecurityPolicyAdmin(admin.ModelAdmin):
    list_display    = ('name', 'updated_by', 'updated_at')
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request):
        # Enforce singleton-style: only one policy record
        return not SecurityPolicy.objects.exists()


# ─── Security Analyst Profile ─────────────────────────────────────────────────
@admin.register(SecurityAnalystProfile)
class SecurityAnalystProfileAdmin(admin.ModelAdmin):
    list_display  = ('analyst_id', 'user', 'clearance_level', 'on_duty', 'can_block_ips')
    list_filter   = ('clearance_level', 'on_duty')
    search_fields = ('analyst_id', 'user__email')


# ─── System Health Snapshot ───────────────────────────────────────────────────
@admin.register(SystemHealthSnapshot)
class SystemHealthSnapshotAdmin(admin.ModelAdmin):
    list_display    = ('timestamp', 'active_users', 'requests_per_minute', 'error_rate', 'open_threats_count')
    readonly_fields = (
        'timestamp', 'active_users', 'requests_per_minute', 'error_rate',
        'blocked_ips_count', 'open_threats_count', 'cpu_usage',
        'memory_usage', 'db_connections', 'avg_response_ms',
    )
    ordering        = ('-timestamp',)
    date_hierarchy  = 'timestamp'

    def has_add_permission(self, request):
        return False  # Snapshots are written by the Celery task, not manually
