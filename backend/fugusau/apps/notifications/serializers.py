"""FUGUSAU Portal — Notifications Serializers"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'title', 'message', 'notif_type',
            'action_url', 'is_read', 'created_at', 'created_by', 'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'created_by']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'


class BroadcastSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    notif_type = serializers.ChoiceField(choices=['info', 'warning', 'success', 'danger'], default='info')
    action_url = serializers.CharField(required=False, allow_blank=True)
    role_filter = serializers.ChoiceField(
        choices=['all', 'student', 'lecturer', 'admin'],
        default='all',
        help_text='Send to users of a specific role only'
    )
