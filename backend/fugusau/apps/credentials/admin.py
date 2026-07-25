"""
FUGUSAU Portal — Credentials App Admin
Path: fugusau/apps/credentials/admin.py

Fix #10c: credentials/admin.py was missing, so the Credential model
(and any future credential-related models) didn't appear in the admin.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Credential


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display   = ('student_matric', 'doc_type', 'status_badge', 'forgery_risk_score', 'uploaded_at', 'verified_by')
    list_filter    = ('status', 'doc_type', 'external_verified')
    search_fields  = ('student__matric_number', 'student__user__email')
    readonly_fields = ('uploaded_at', 'updated_at', 'file_hash', 'ai_verdict', 'ai_findings',
                       'extracted_text', 'forgery_risk_score', 'external_data')
    ordering       = ('-uploaded_at',)
    date_hierarchy = 'uploaded_at'
    actions        = ['mark_authentic', 'mark_suspicious', 'mark_forged']

    def student_matric(self, obj):
        return obj.student.matric_number
    student_matric.short_description = 'Matric Number'

    def status_badge(self, obj):
        colour = {
            Credential.PENDING:    '#6c757d',
            Credential.REVIEWING:  '#007bff',
            Credential.AUTHENTIC:  '#28a745',
            Credential.SUSPICIOUS: '#ffc107',
            Credential.FORGED:     '#dc3545',
            Credential.REJECTED:   '#dc3545',
        }.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>',
            colour, obj.get_status_display(),
        )
    status_badge.short_description = 'Status'

    def verified_by(self, obj):
        return obj.reviewed_by.get_full_name() if getattr(obj, 'reviewed_by', None) else '—'
    verified_by.short_description = 'Reviewed By'

    # ── Bulk actions ──────────────────────────────────────────────────────────
    def mark_authentic(self, request, queryset):
        queryset.update(status=Credential.AUTHENTIC)
        self.message_user(request, f'{queryset.count()} credential(s) marked authentic.')
    mark_authentic.short_description = 'Mark selected as Authentic'

    def mark_suspicious(self, request, queryset):
        queryset.update(status=Credential.SUSPICIOUS)
        self.message_user(request, f'{queryset.count()} credential(s) flagged as suspicious.')
    mark_suspicious.short_description = 'Flag selected as Suspicious'

    def mark_forged(self, request, queryset):
        queryset.update(status=Credential.FORGED)
        self.message_user(request, f'{queryset.count()} credential(s) marked as forged.')
    mark_forged.short_description = 'Mark selected as Forged'
