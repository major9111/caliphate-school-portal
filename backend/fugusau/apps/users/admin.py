"""FUGUSAU Portal — Users Admin"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'get_full_name', 'role', 'is_active', 'is_verified', 'date_joined']
    list_filter = ['role', 'is_active', 'is_verified', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'middle_name', 'last_name', 'phone', 'profile_photo', 'date_of_birth', 'gender')}),
        ('Role & Status', {'fields': ('role', 'is_active', 'is_staff', 'is_verified', 'two_fa_enabled')}),
        ('Permissions', {'fields': ('is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2')}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'ip_address', 'timestamp']
    list_filter = ['action']
    search_fields = ['user__email', 'description']
    readonly_fields = ['id', 'user', 'action', 'description', 'ip_address', 'user_agent', 'timestamp', 'extra_data']
    ordering = ['-timestamp']
