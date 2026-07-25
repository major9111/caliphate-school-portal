"""FUGUSAU Portal — Notifications Views"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from fugusau.apps.permissions import IsAdmin
from .models import Notification
from .serializers import NotificationSerializer, BroadcastSerializer

User = get_user_model()


class MyNotificationsView(generics.ListAPIView):
    """GET /api/v1/notifications/ — Current user's notifications + broadcasts"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        return Notification.objects.filter(
            Q(recipient=user) | Q(recipient__isnull=True)
        ).order_by('-created_at')


class UnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/ — Badge count"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        count = Notification.objects.filter(
            Q(recipient=request.user) | Q(recipient__isnull=True),
            is_read=False
        ).count()
        return Response({'unread_count': count})


class MarkReadView(APIView):
    """POST /api/v1/notifications/<pk>/read/ — Mark single notification as read"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notif = get_object_or_404(Notification, id=pk)
        if notif.recipient and notif.recipient != request.user:
            return Response({'error': 'Not your notification.'}, status=403)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'detail': 'Marked as read.'})


class MarkAllReadView(APIView):
    """POST /api/v1/notifications/mark-all-read/ — Bulk mark all as read"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.db.models import Q
        Notification.objects.filter(
            Q(recipient=request.user) | Q(recipient__isnull=True),
            is_read=False
        ).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})


class BroadcastNotificationView(APIView):
    """POST /api/v1/notifications/broadcast/ — Send notification to role/all (admin only)"""
    permission_classes = [IsAdmin]

    def post(self, request):
        from .utils import send_notification
        serializer = BroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        role_filter = data.pop('role_filter')
        title = data.get('title')
        message = data.get('message')
        notif_type = data.get('notif_type', 'info')

        if role_filter == 'all':
            users = User.objects.filter(is_active=True)
        else:
            users = User.objects.filter(role=role_filter, is_active=True)

        user_ids = list(users.values_list('id', flat=True))
        if user_ids:
            send_notification(
                user_ids=user_ids,
                title=title,
                message=message,
                notification_type=notif_type,
                data={'action_url': data.get('action_url')}
            )
            # Create a general broadcast record in DB
            if role_filter == 'all':
                Notification.objects.create(
                    recipient=None,
                    created_by=request.user,
                    title=title,
                    message=message,
                    notif_type=notif_type,
                    action_url=data.get('action_url', '')
                )

        return Response({'detail': f'Notification sent to {len(user_ids)} {role_filter}(s) successfully.'})
