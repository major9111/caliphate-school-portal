"""FUGUSAU Portal — Chat Models (Extended with reactions, replies, pins, tags)"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatRoom(models.Model):
    COURSE   = 'course'
    DIRECT   = 'direct'
    SUPPORT  = 'support'
    GENERAL  = 'general'
    GROUP    = 'group'
    AI       = 'ai'

    ROOM_TYPES = [(COURSE,'Course'),(DIRECT,'Direct'),(SUPPORT,'Support'),(GENERAL,'General'),(GROUP,'Group'),(AI,'AI')]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name         = models.CharField(max_length=200, unique=True)
    room_type    = models.CharField(max_length=20, choices=ROOM_TYPES, default=GENERAL)
    display_name = models.CharField(max_length=200, blank=True)
    description  = models.TextField(blank=True)
    avatar_color = models.CharField(max_length=7, default='#006B3F')
    members      = models.ManyToManyField(User, related_name='chat_rooms', blank=True)
    admins       = models.ManyToManyField(User, related_name='admin_rooms', blank=True)
    created_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_rooms')
    is_active    = models.BooleanField(default=True)
    is_muted     = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_rooms'

    def __str__(self): return self.display_name or self.name


class Message(models.Model):
    TEXT   = 'text'
    FILE   = 'file'
    IMAGE  = 'image'
    SYSTEM = 'system'
    MSG_TYPES = [(TEXT,'Text'),(FILE,'File'),(IMAGE,'Image'),(SYSTEM,'System')]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room         = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content      = models.TextField()
    message_type = models.CharField(max_length=10, choices=MSG_TYPES, default=TEXT)
    file_url     = models.URLField(blank=True)
    file_name    = models.CharField(max_length=255, blank=True)
    is_read      = models.BooleanField(default=False)
    is_deleted   = models.BooleanField(default=False)
    is_pinned    = models.BooleanField(default=False)
    is_edited    = models.BooleanField(default=False)
    reply_to     = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    timestamp    = models.DateTimeField(auto_now_add=True)
    edited_at    = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'messages'
        ordering = ['timestamp']

    def __str__(self): return f'{self.sender.get_full_name()}: {self.content[:50]}'


class MessageReaction(models.Model):
    """Emoji reactions on messages"""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reactions')
    emoji   = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message_reactions'
        unique_together = ('message', 'user', 'emoji')

    def __str__(self): return f'{self.user.get_full_name()} {self.emoji} on {self.message_id}'


class MessageMention(models.Model):
    """@mentions in messages"""
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message    = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='mentions')
    mentioned  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mentioned_in')
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message_mentions'
