"""FUGUSAU Portal — Security Serializers"""
from rest_framework import serializers
from .models import (
    SecurityEvent, BlockedIP, UserSession, LoginAttempt,
    SecurityPolicy, SystemHealthSnapshot
)


class SecurityEventSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'event_type', 'threat_level', 'status',
            'user', 'user_email', 'ip_address', 'user_agent',
            'request_path', 'request_method', 'country', 'city',
            'description', 'action_taken', 'analyst_notes',
            'resolved_by', 'resolved_by_name', 'resolved_at',
            'ip_blocked', 'user_locked', 'timestamp', 'updated_at',
            'extra_data',
        ]
        read_only_fields = [
            'id', 'event_type', 'threat_level', 'ip_address',
            'user_agent', 'request_path', 'request_method',
            'description', 'action_taken', 'ip_blocked', 'user_locked',
            'timestamp', 'user',
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'

    def get_resolved_by_name(self, obj):
        return obj.resolved_by.get_full_name() if obj.resolved_by else None


class BlockedIPSerializer(serializers.ModelSerializer):
    blocked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BlockedIP
        fields = [
            'id', 'ip_address', 'reason', 'block_type', 'duration',
            'blocked_by', 'blocked_by_name', 'blocked_at', 'expires_at',
            'is_active', 'hit_count',
        ]
        read_only_fields = ['id', 'blocked_at', 'hit_count', 'blocked_by']

    def get_blocked_by_name(self, obj):
        return obj.blocked_by.get_full_name() if obj.blocked_by else 'System (Auto)'


class UserSessionSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    user_name  = serializers.SerializerMethodField()
    duration   = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_email', 'user_name', 'ip_address',
            'device_type', 'browser', 'os', 'country', 'city',
            'is_active', 'is_suspicious', 'login_at', 'last_activity',
            'logout_at', 'duration',
        ]

    def get_user_email(self, obj): return obj.user.email
    def get_user_name(self, obj): return obj.user.get_full_name()
    def get_duration(self, obj):
        end = obj.logout_at or obj.last_activity
        if end:
            diff = end - obj.login_at
            hours, rem = divmod(diff.seconds, 3600)
            mins, _ = divmod(rem, 60)
            return f'{hours}h {mins}m'
        return 'Active'


class LoginAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginAttempt
        fields = ['id', 'email', 'ip_address', 'user_agent', 'success', 'failure_reason', 'timestamp']
        read_only_fields = fields


class SecurityPolicySerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SecurityPolicy
        fields = '__all__'
        read_only_fields = ['id', 'updated_at', 'updated_by']

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_full_name() if obj.updated_by else None


class SystemHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemHealthSnapshot
        fields = '__all__'
        read_only_fields = fields
