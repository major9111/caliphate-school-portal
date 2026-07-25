"""
FUGUSAU Portal — Reports App Admin
Path: fugusau/apps/reports/admin.py

Fix #10b: reports/admin.py was missing.
Registers the ReportSnapshot model introduced in reports/models.py (Fix #9).
"""
from django.contrib import admin
from .models import ReportSnapshot


@admin.register(ReportSnapshot)
class ReportSnapshotAdmin(admin.ModelAdmin):
    list_display    = ('title', 'report_type', 'output_format', 'row_count', 'generated_by', 'generated_at')
    list_filter     = ('report_type', 'output_format')
    search_fields   = ('title', 'generated_by__email')
    readonly_fields = ('generated_at', 'generated_by', 'parameters', 'row_count')
    ordering        = ('-generated_at',)
    date_hierarchy  = 'generated_at'

    def has_add_permission(self, request):
        # Reports are generated programmatically, not through the admin form
        return False
