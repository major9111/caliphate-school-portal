"""FUGUSAU Portal — Chat Views (REST + WebSocket features)"""
import re
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import ChatRoom, Message, MessageReaction, MessageMention
from .serializers import ChatRoomSerializer, MessageSerializer

User = get_user_model()


class MyChatRoomsView(generics.ListAPIView):
    serializer_class   = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(
            members=self.request.user, is_active=True
        ).prefetch_related('members').order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CreateRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        member_ids   = request.data.get('member_ids', [])
        name         = request.data.get('name', '')
        display_name = request.data.get('display_name', '')
        room_type    = request.data.get('room_type', 'direct')

        members = User.objects.filter(id__in=member_ids)

        if room_type == 'ai':
            if request.user.role != 'student':
                return Response({'error': 'AI Assistant is only available for students.'}, status=403)
            
            # Find or create AI assistant room
            name = f'ai_student_{request.user.id}'
            existing = ChatRoom.objects.filter(name=name, room_type='ai').first()
            if existing:
                return Response(ChatRoomSerializer(existing, context={'request': request}).data)
            
            # Get or create the AI Assistant user in database
            ai_user, _ = User.objects.get_or_create(
                email='ai.assistant@fugusau.edu.ng',
                defaults={
                    'first_name': 'AI',
                    'last_name': 'Assistant',
                    'role': 'lecturer',
                    'is_active': True,
                }
            )
            
            room = ChatRoom.objects.create(
                name=name,
                display_name='AI Academic Assistant',
                room_type='ai',
                created_by=request.user
            )
            room.members.add(request.user, ai_user)
            room.admins.add(request.user)
            return Response(ChatRoomSerializer(room, context={'request': request}).data, status=201)

        if room_type == 'direct':
            if members.count() != 1:
                return Response({'error': 'DM requires exactly one other user.'}, status=400)
            # Return existing DM if already exists
            existing = ChatRoom.objects.filter(
                room_type='direct', members=request.user
            ).filter(members=members.first()).first()
            if existing:
                return Response(ChatRoomSerializer(existing, context={'request': request}).data)

        # Auto-generate name if not provided
        if not name:
            if room_type == 'direct':
                name = f'dm_{request.user.id}_{members.first().id}'
            else:
                name = f'group_{request.user.id}_{timezone.now().timestamp():.0f}'

        room = ChatRoom.objects.create(
            name=name,
            display_name=display_name or name,
            room_type=room_type,
            created_by=request.user
        )
        room.members.add(request.user, *members)
        room.admins.add(request.user)
        return Response(ChatRoomSerializer(room, context={'request': request}).data, status=201)


class RoomMessagesView(generics.ListAPIView):
    serializer_class   = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id  = self.kwargs['room_id']
        search   = self.request.query_params.get('search', '')
        room     = get_object_or_404(ChatRoom, id=room_id, members=self.request.user)
        room.messages.filter(is_read=False).exclude(sender=self.request.user).update(is_read=True)
        qs = room.messages.filter(is_deleted=False).select_related(
            'sender', 'reply_to', 'reply_to__sender'
        ).prefetch_related('reactions', 'mentions').order_by('-timestamp')[:100]
        if search:
            qs = qs.filter(content__icontains=search)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class EditMessageView(APIView):
    """PATCH /api/v1/chat/messages/<id>/edit/"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, message_id):
        msg = get_object_or_404(Message, id=message_id, sender=request.user, is_deleted=False)
        new_content = request.data.get('content', '').strip()
        if not new_content:
            return Response({'error': 'Content cannot be empty.'}, status=400)
        msg.content   = new_content
        msg.is_edited = True
        msg.edited_at = timezone.now()
        msg.save(update_fields=['content', 'is_edited', 'edited_at'])
        return Response(MessageSerializer(msg, context={'request': request}).data)


class DeleteMessageView(APIView):
    """DELETE /api/v1/chat/messages/<id>/"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, message_id):
        msg = get_object_or_404(Message, id=message_id, is_deleted=False)
        # Owner or room admin can delete
        is_admin = msg.room.admins.filter(id=request.user.id).exists()
        if msg.sender != request.user and not is_admin and not request.user.role == 'admin':
            return Response({'error': 'Not allowed.'}, status=403)
        msg.content    = 'This message was deleted.'
        msg.is_deleted = True
        msg.save(update_fields=['content', 'is_deleted'])
        return Response({'id': str(msg.id), 'deleted': True})


class PinMessageView(APIView):
    """POST /api/v1/chat/messages/<id>/pin/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        msg = get_object_or_404(Message, id=message_id, is_deleted=False)
        is_admin = msg.room.admins.filter(id=request.user.id).exists()
        if not is_admin and not request.user.role == 'admin':
            return Response({'error': 'Only room admins can pin messages.'}, status=403)
        msg.is_pinned = not msg.is_pinned
        msg.save(update_fields=['is_pinned'])
        return Response({'id': str(msg.id), 'is_pinned': msg.is_pinned})


class PinnedMessagesView(generics.ListAPIView):
    """GET /api/v1/chat/rooms/<room_id>/pinned/"""
    serializer_class   = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room = get_object_or_404(ChatRoom, id=self.kwargs['room_id'], members=self.request.user)
        return room.messages.filter(is_pinned=True, is_deleted=False).select_related('sender').order_by('-timestamp')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ReactMessageView(APIView):
    """POST /api/v1/chat/messages/<id>/react/  body: {emoji: '👍'}"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        msg   = get_object_or_404(Message, id=message_id, is_deleted=False)
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'error': 'Emoji is required.'}, status=400)
        reaction, created = MessageReaction.objects.get_or_create(
            message=msg, user=request.user, emoji=emoji
        )
        if not created:
            reaction.delete()
            action = 'removed'
        else:
            action = 'added'
        # Return updated reaction counts
        reactions = {}
        for r in msg.reactions.all():
            reactions[r.emoji] = reactions.get(r.emoji, 0) + 1
        return Response({'action': action, 'reactions': reactions})


class SearchMessagesView(APIView):
    """GET /api/v1/chat/rooms/<room_id>/search/?q=text"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(ChatRoom, id=room_id, members=request.user)
        q    = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        msgs = room.messages.filter(
            content__icontains=q, is_deleted=False
        ).select_related('sender').order_by('-timestamp')[:30]
        return Response(MessageSerializer(msgs, many=True, context={'request': request}).data)


class MyMentionsView(generics.ListAPIView):
    """GET /api/v1/chat/mentions/ — Unread @mentions for the current user"""
    serializer_class   = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(
            mentions__mentioned=self.request.user,
            is_deleted=False,
        ).select_related('sender', 'room').order_by('-timestamp')[:50]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
