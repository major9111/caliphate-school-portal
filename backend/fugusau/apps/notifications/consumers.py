
"""
fugusau/apps/notifications/consumers.py
WebSocket consumer for real-time push notifications.

Add to fugusau/asgi.py URL routing:
    from fugusau.apps.notifications.consumers import NotificationConsumer
    websocket_urlpatterns = [
        re_path(r"^ws/notifications/$", NotificationConsumer.as_asgi()),
    ]

Frontend connects with:
    const ws = new WebSocket(`wss://portal.fugusau.edu.ng/ws/notifications/`);
    ws.onmessage = (e) => { const msg = JSON.parse(e.data); ... };
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger('fugusau.notifications')


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections for per-user real-time notifications.
    Each user joins their own group: notifications_{user_id}
    Messages are sent via send_notification() utility.
    """

    async def connect(self):
        user = self.scope.get('user')

        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = str(user.id)
        self.group_name = f'notifications_{self.user_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send count of unread notifications on connect
        unread_count = await self._get_unread_count(user)
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'unread_count': unread_count,
        }))
        logger.debug('WS connected: user %s', self.user_id)

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle messages from the client (e.g. mark-as-read)."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = data.get('action')
        if action == 'mark_read':
            notif_id = data.get('notification_id')
            if notif_id:
                await self._mark_read(notif_id)
                await self.send(text_data=json.dumps({
                    'type': 'notification_read',
                    'notification_id': notif_id,
                }))
        elif action == 'mark_all_read':
            await self._mark_all_read()
            await self.send(text_data=json.dumps({'type': 'all_notifications_read'}))

    # ── Group message handlers (called by channel layer) ──────────────────────

    async def notification_message(self, event):
        """Receive from group, forward to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            **event.get('notification', {}),
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _get_unread_count(self, user):
        from fugusau.apps.notifications.models import Notification
        return Notification.objects.filter(recipient=user, is_read=False).count()

    @database_sync_to_async
    def _mark_read(self, notification_id):
        from fugusau.apps.notifications.models import Notification
        Notification.objects.filter(id=notification_id, recipient_id=self.user_id).update(is_read=True)

    @database_sync_to_async
    def _mark_all_read(self):
        from fugusau.apps.notifications.models import Notification
        Notification.objects.filter(recipient_id=self.user_id, is_read=False).update(is_read=True)
