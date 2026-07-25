"""FUGUSAU Portal — Chat Serializers (Extended)"""
from rest_framework import serializers
from .models import ChatRoom, Message, MessageReaction


class ReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    class Meta:
        model  = MessageReaction
        fields = ['emoji', 'user_name']


class ReplyPreviewSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    class Meta:
        model  = Message
        fields = ['id', 'sender_name', 'content', 'message_type']


class MessageSerializer(serializers.ModelSerializer):
    sender_name  = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_role  = serializers.CharField(source='sender.role', read_only=True)
    sender_photo = serializers.SerializerMethodField()
    reactions    = serializers.SerializerMethodField()
    reply_to     = ReplyPreviewSerializer(read_only=True)
    is_mine      = serializers.SerializerMethodField()
    mentions     = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'room', 'sender', 'sender_name', 'sender_role', 'sender_photo',
            'content', 'message_type', 'file_url', 'file_name',
            'is_read', 'is_deleted', 'is_pinned', 'is_edited',
            'reply_to', 'reactions', 'mentions', 'is_mine',
            'timestamp', 'edited_at',
        ]
        read_only_fields = ['id', 'sender', 'timestamp']

    def get_sender_photo(self, obj):
        try:
            photo = obj.sender.profile_photo
            return photo.url if photo else None
        except Exception:
            return None

    def get_reactions(self, obj):
        agg = {}
        for r in obj.reactions.all():
            if r.emoji not in agg:
                agg[r.emoji] = {'count': 0, 'users': []}
            agg[r.emoji]['count'] += 1
            agg[r.emoji]['users'].append(r.user.get_full_name())
        return agg

    def get_is_mine(self, obj):
        req = self.context.get('request')
        return req and obj.sender_id == req.user.id

    def get_mentions(self, obj):
        return [m.mentioned.get_full_name() for m in obj.mentions.all()]


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message  = serializers.SerializerMethodField()
    unread_count  = serializers.SerializerMethodField()
    member_names  = serializers.SerializerMethodField()
    member_ids    = serializers.SerializerMethodField()
    display_name  = serializers.SerializerMethodField()
    pinned_count  = serializers.SerializerMethodField()

    class Meta:
        model  = ChatRoom
        fields = [
            'id', 'name', 'room_type', 'display_name', 'description',
            'members', 'member_names', 'member_ids',
            'created_at', 'last_message', 'unread_count', 'pinned_count',
        ]
        read_only_fields = ['id', 'created_at']

    def get_display_name(self, obj):
        if obj.display_name:
            return obj.display_name
        req = self.context.get('request')
        if obj.room_type == 'direct' and req:
            other = obj.members.exclude(id=req.user.id).first()
            return other.get_full_name() if other else obj.name
        return obj.name

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).order_by('-timestamp').first()
        if msg:
            return {
                'content':   '🗑 Deleted' if msg.is_deleted else msg.content[:80],
                'timestamp': msg.timestamp,
                'sender':    msg.sender.get_full_name(),
            }
        return None

    def get_unread_count(self, obj):
        req = self.context.get('request')
        if not req:
            return 0
        return obj.messages.filter(is_read=False, is_deleted=False).exclude(sender=req.user).count()

    def get_member_names(self, obj):
        return [m.get_full_name() for m in obj.members.all()]

    def get_member_ids(self, obj):
        return [str(m.id) for m in obj.members.all()]

    def get_pinned_count(self, obj):
        return obj.messages.filter(is_pinned=True, is_deleted=False).count()
