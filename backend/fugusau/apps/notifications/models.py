"""FUGUSAU Portal — Notifications App Models"""
import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    INFO    = 'info'
    WARNING = 'warning'
    SUCCESS = 'success'
    DANGER  = 'danger'

    TYPE_CHOICES = [
        (INFO, 'Info'), (WARNING, 'Warning'),
        (SUCCESS, 'Success'), (DANGER, 'Danger'),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications', null=True, blank=True,
        help_text='Null = broadcast to all users'
    )
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    notif_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=INFO)
    action_url = models.CharField(max_length=300, blank=True, help_text='Frontend route to navigate to')
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sent_notifications'
    )

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        target = self.recipient.get_full_name() if self.recipient else 'All Users'
        return f'[{self.notif_type.upper()}] {self.title} → {target}'
