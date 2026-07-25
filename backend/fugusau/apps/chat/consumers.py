"""FUGUSAU Portal — Chat WebSocket Consumer (Full Featured)"""
import json
import logging
import re
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger('fugusau.chat')

COMMON_EMOJIS = ['👍','❤️','😂','😮','😢','🙏','🔥','✅']


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_name       = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user            = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.set_user_online(True)

        # Send message history on connect
        messages = await self.get_room_messages(self.room_name)
        await self.send(text_data=json.dumps({
            'type': 'message_history',
            'messages': messages,
        }))

        logger.info(f'User {getattr(self.user, "email", str(self.user))} connected to room {self.room_name}')

    async def disconnect(self, close_code):
        room_group = getattr(self, 'room_group_name', None)
        room_name  = getattr(self, 'room_name', 'unknown')
        user       = getattr(self, 'user', None)

        if room_group:
            await self.channel_layer.group_discard(room_group, self.channel_name)
        if user and not user.is_anonymous:
            await self.set_user_online(False)
            logger.info(f'User {getattr(user, "email", str(user))} disconnected from room {room_name}')

    async def receive(self, text_data):
        from django.core.cache import cache
        rate_limit_key = f"ws_limit_{self.user.id}"
        msg_count = cache.get(rate_limit_key, 0)
        if msg_count >= 10:  # Allow 10 messages per 10 seconds
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Rate limit exceeded. Please slow down.'
            }))
            return
        cache.set(rate_limit_key, msg_count + 1, timeout=10)

        try:
            data     = json.loads(text_data)
            msg_type = data.get('type', 'message')

            handlers = {
                'message':      self.handle_chat_message,
                'typing':       self.handle_typing,
                'read_receipt': self.handle_read_receipt,
                'edit':         self.handle_edit,
                'delete':       self.handle_delete,
                'react':        self.handle_react,
                'pin':          self.handle_pin,
            }
            handler = handlers.get(msg_type)
            if handler:
                await handler(data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
        except Exception as e:
            logger.error(f'Error in receive: {e}')
            await self.send(text_data=json.dumps({'error': str(e)}))

    # ── Send a new message ────────────────────────────────────────────────

    async def handle_chat_message(self, data):
        content      = data.get('content', '').strip()
        msg_type     = data.get('message_type', 'text')
        reply_to     = data.get('reply_to_id')
        file_data    = data.get('file_data') # base64 payload
        file_name    = data.get('file_name', 'file')
        tutor_mode   = data.get('tutor_mode', False)

        if not content and not file_data:
            return

        file_url = ""
        local_path = ""
        raw_b64 = ""
        
        # Save base64 upload if present
        if file_data:
            file_url, local_path, raw_b64 = await self.save_base64_file(file_data, file_name)
            if not content:
                content = file_url or file_name

        # Extract @mentions from content
        mentions  = re.findall(r'@(\w+(?:\s\w+)?)', content)

        message = await self.save_message(
            room_name=self.room_name,
            sender=self.user,
            content=content,
            message_type=msg_type,
            reply_to_id=reply_to,
            mentions=mentions,
            file_url=file_url,
            file_name=file_name,
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat_message', 'message': message}
        )

        # Trigger AI reply if this is an AI chat room
        is_ai = await self.is_room_ai(self.room_name)
        if is_ai:
            import asyncio
            # Send typing indicator for AI Assistant
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': 'ai-assistant-id-placeholder',
                    'user_name': 'AI Assistant',
                    'is_typing': True
                }
            )
            # Start background task to fetch AI response
            asyncio.create_task(self.reply_with_ai(
                student_content=content,
                tutor_mode=tutor_mode,
                file_type=msg_type if file_data else None,
                local_path=local_path,
                raw_b64=raw_b64,
                file_name=file_name
            ))

    # ── Edit message ──────────────────────────────────────────────────────

    async def handle_edit(self, data):
        message_id  = data.get('message_id')
        new_content = data.get('content', '').strip()
        if not message_id or not new_content:
            return

        result = await self.edit_message(message_id, new_content)
        if result:
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'message_edited', 'message_id': message_id,
                 'content': new_content, 'edited_at': result}
            )

    # ── Delete message ────────────────────────────────────────────────────

    async def handle_delete(self, data):
        message_id = data.get('message_id')
        if not message_id:
            return

        ok = await self.delete_message(message_id)
        if ok:
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'message_deleted', 'message_id': message_id}
            )

    # ── React to message ──────────────────────────────────────────────────

    async def handle_react(self, data):
        message_id = data.get('message_id')
        emoji      = data.get('emoji', '').strip()
        if not message_id or not emoji:
            return

        result = await self.toggle_reaction(message_id, emoji)
        if result is not None:
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'message_reacted', 'message_id': message_id,
                 'reactions': result}
            )

    # ── Pin message ───────────────────────────────────────────────────────

    async def handle_pin(self, data):
        message_id = data.get('message_id')
        if not message_id:
            return

        is_pinned = await self.toggle_pin(message_id)
        if is_pinned is not None:
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'message_pinned', 'message_id': message_id,
                 'is_pinned': is_pinned,
                 'pinned_by': self.user.get_full_name()}
            )

    # ── Typing ────────────────────────────────────────────────────────────

    async def handle_typing(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'typing_indicator',
             'user_id':   str(self.user.id),
             'user_name': self.user.get_full_name(),
             'is_typing': data.get('is_typing', False)}
        )

    async def handle_read_receipt(self, data):
        message_id = data.get('message_id')
        if message_id:
            await self.mark_message_read(message_id)

    # ── Channel layer event handlers ──────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            **event['message']
        }))

    async def message_edited(self, event):
        await self.send(text_data=json.dumps({
            'type':       'message_edited',
            'message_id': event['message_id'],
            'content':    event['content'],
            'edited_at':  event['edited_at'],
        }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type':       'message_deleted',
            'message_id': event['message_id'],
        }))

    async def message_reacted(self, event):
        await self.send(text_data=json.dumps({
            'type':       'message_reacted',
            'message_id': event['message_id'],
            'reactions':  event['reactions'],
        }))

    async def message_pinned(self, event):
        await self.send(text_data=json.dumps({
            'type':       'message_pinned',
            'message_id': event['message_id'],
            'is_pinned':  event['is_pinned'],
            'pinned_by':  event['pinned_by'],
        }))

    async def typing_indicator(self, event):
        if str(self.user.id) != event['user_id']:
            await self.send(text_data=json.dumps({
                'type':      'typing',
                'user_id':   event['user_id'],
                'user_name': event['user_name'],
                'is_typing': event['is_typing'],
            }))

    # ── Database operations ───────────────────────────────────────────────

    @database_sync_to_async
    def save_message(self, room_name, sender, content, message_type, reply_to_id=None, mentions=None, file_url="", file_name=""):
        from .models import ChatRoom, Message, MessageMention
        from django.contrib.auth import get_user_model
        User = get_user_model()

        room, _ = ChatRoom.objects.get_or_create(name=room_name, defaults={'room_type': 'general'})

        reply_obj = None
        if reply_to_id:
            try:
                reply_obj = Message.objects.get(id=reply_to_id)
            except Message.DoesNotExist:
                pass

        msg = Message.objects.create(
            room=room, sender=sender,
            content=content, message_type=message_type,
            reply_to=reply_obj,
            file_url=file_url or "",
            file_name=file_name or "",
        )

        # Save @mentions
        reply_preview = None
        if reply_obj:
            reply_preview = {
                'id':          str(reply_obj.id),
                'sender_name': reply_obj.sender.get_full_name(),
                'content':     reply_obj.content[:80],
            }

        if mentions:
            for name_part in mentions:
                parts = name_part.strip().split()
                qs    = User.objects.filter(is_active=True)
                if len(parts) >= 2:
                    qs = qs.filter(first_name__iexact=parts[0], last_name__iexact=parts[1])
                else:
                    qs = qs.filter(first_name__iexact=parts[0])
                for u in qs[:3]:
                    MessageMention.objects.get_or_create(message=msg, mentioned=u)

        return {
            'id':           str(msg.id),
            'content':      content,
            'message_type': message_type,
            'sender_id':    str(sender.id),
            'sender_name':  sender.get_full_name(),
            'sender_role':  sender.role,
            'timestamp':    msg.timestamp.isoformat(),
            'is_read':      False,
            'is_edited':    False,
            'is_pinned':    False,
            'is_deleted':   False,
            'reply_to':     reply_preview,
            'reactions':    {},
            'mentions':     mentions or [],
            'file_url':     msg.file_url,
            'file_name':    msg.file_name,
        }

    @database_sync_to_async
    def get_room_messages(self, room_name):
        from .models import ChatRoom, Message
        try:
            room = ChatRoom.objects.get(name=room_name)
        except ChatRoom.DoesNotExist:
            return []

        messages = (Message.objects
                    .filter(room=room, is_deleted=False)
                    .select_related('sender', 'reply_to', 'reply_to__sender')
                    .prefetch_related('reactions')
                    .order_by('-timestamp')[:60])

        result = []
        for m in reversed(list(messages)):
            reactions = {}
            for r in m.reactions.all():
                if r.emoji not in reactions:
                    reactions[r.emoji] = {'count': 0, 'users': []}
                reactions[r.emoji]['count']  += 1
                reactions[r.emoji]['users'].append(r.user.get_full_name())

            reply_preview = None
            if m.reply_to:
                reply_preview = {
                    'id':          str(m.reply_to.id),
                    'sender_name': m.reply_to.sender.get_full_name(),
                    'content':     m.reply_to.content[:80],
                }

            result.append({
                'id':           str(m.id),
                'content':      m.content,
                'message_type': m.message_type,
                'sender_id':    str(m.sender.id),
                'sender_name':  m.sender.get_full_name(),
                'sender_role':  'ai' if m.sender.email == 'ai.assistant@fugusau.edu.ng' else m.sender.role,
                'timestamp':    m.timestamp.isoformat(),
                'is_read':      m.is_read,
                'is_edited':    m.is_edited,
                'is_pinned':    m.is_pinned,
                'is_deleted':   m.is_deleted,
                'reply_to':     reply_preview,
                'reactions':    reactions,
                'mentions':     [],
            })
        return result

    @database_sync_to_async
    def edit_message(self, message_id, content):
        from .models import Message
        try:
            msg = Message.objects.get(id=message_id, sender=self.user, is_deleted=False)
            msg.content   = content
            msg.is_edited = True
            msg.edited_at = timezone.now()
            msg.save(update_fields=['content', 'is_edited', 'edited_at'])
            return msg.edited_at.isoformat()
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def delete_message(self, message_id):
        from .models import Message
        try:
            msg = Message.objects.get(id=message_id, is_deleted=False)
            if msg.sender == self.user or self.user.role == 'admin':
                msg.content    = 'This message was deleted.'
                msg.is_deleted = True
                msg.save(update_fields=['content', 'is_deleted'])
                return True
        except Message.DoesNotExist:
            pass
        return False

    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        from .models import Message, MessageReaction
        try:
            msg      = Message.objects.get(id=message_id, is_deleted=False)
            reaction, created = MessageReaction.objects.get_or_create(
                message=msg, user=self.user, emoji=emoji
            )
            if not created:
                reaction.delete()
            reactions = {}
            for r in msg.reactions.all():
                if r.emoji not in reactions:
                    reactions[r.emoji] = {'count': 0, 'users': []}
                reactions[r.emoji]['count']  += 1
                reactions[r.emoji]['users'].append(r.user.get_full_name())
            return reactions
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def toggle_pin(self, message_id):
        from .models import Message
        try:
            msg = Message.objects.get(id=message_id, is_deleted=False)
            msg.is_pinned = not msg.is_pinned
            msg.save(update_fields=['is_pinned'])
            return msg.is_pinned
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_message_read(self, message_id):
        from .models import Message
        Message.objects.filter(id=message_id).update(is_read=True)

    @database_sync_to_async
    def set_user_online(self, is_online):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        User.objects.filter(id=self.user.id).update(
            last_seen=None if is_online else timezone.now()
        )

    @database_sync_to_async
    def is_room_ai(self, room_name):
        from .models import ChatRoom
        try:
            return ChatRoom.objects.get(name=room_name).room_type == 'ai'
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def get_room_history_for_ai(self, room_name):
        from .models import ChatRoom, Message
        try:
            room = ChatRoom.objects.get(name=room_name)
        except ChatRoom.DoesNotExist:
            return []
        messages = Message.objects.filter(room=room, is_deleted=False).order_by('-timestamp')[:10]
        result = []
        for m in reversed(list(messages)):
            result.append({
                'sender_email': m.sender.email,
                'content': m.content
            })
        return result

    @database_sync_to_async
    def save_ai_message(self, room_name, content):
        from .models import ChatRoom, Message
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        room = ChatRoom.objects.get(name=room_name)
        ai_user, _ = User.objects.get_or_create(
            email='ai.assistant@fugusau.edu.ng',
            defaults={
                'first_name': 'AI',
                'last_name': 'Assistant',
                'role': 'lecturer',
                'is_active': True,
            }
        )
        
        msg = Message.objects.create(
            room=room,
            sender=ai_user,
            content=content,
            message_type='text'
        )
        
        return {
            'id':           str(msg.id),
            'content':      content,
            'message_type': 'text',
            'sender_id':    str(ai_user.id),
            'sender_name':  ai_user.get_full_name(),
            'sender_role':  'ai',
            'timestamp':    msg.timestamp.isoformat(),
            'is_read':      False,
            'is_edited':    False,
            'is_pinned':    False,
            'is_deleted':   False,
            'reply_to':     None,
            'reactions':    {},
            'mentions':     [],
        }

    @database_sync_to_async
    def save_base64_file(self, file_data_b64, file_name):
        import base64
        import uuid
        import os
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage
        from django.conf import settings

        try:
            if ';base64,' in file_data_b64:
                header, file_data_b64 = file_data_b64.split(';base64,')
            
            file_bytes = base64.b64decode(file_data_b64)
            ext = file_name.split('.')[-1] if '.' in file_name else 'bin'
            unique_name = f"chat_uploads/{uuid.uuid4()}.{ext}"
            
            saved_path = default_storage.save(unique_name, ContentFile(file_bytes))
            file_url = default_storage.url(saved_path)
            local_path = os.path.join(settings.MEDIA_ROOT, saved_path)
            return file_url, local_path, file_data_b64
        except Exception as e:
            logger.error(f"Error saving base64 file: {e}")
            return "", "", ""

    def transcribe_audio_with_groq(self, file_path):
        import requests
        from decouple import config
        groq_key = config('GROQ_API_KEY', default=None)
        if not groq_key:
            return "[Voice message: Groq API Key not configured on server]"
            
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {groq_key}"}
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.split('/')[-1], f, 'audio/webm')}
                data = {'model': 'whisper-large-v3'}
                response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            if response.status_code == 200:
                return response.json().get('text', '')
            else:
                logger.error(f"Groq Whisper transcription failed: {response.text}")
                return f"[Voice transcription failed: API status {response.status_code}]"
        except Exception as e:
            logger.error(f"Error transcribing audio with Groq: {e}")
            return "[Voice transcription error]"

    async def reply_with_ai(self, student_content, tutor_mode=False, file_type=None, local_path=None, raw_b64=None, file_name=None):
        import asyncio
        import requests
        from decouple import config
        
        # 1. Handle attachments if present
        attachment_text = ""
        
        if file_type == 'voice' and local_path:
            # Transcribe audio file asynchronously
            loop = asyncio.get_event_loop()
            transcription = await loop.run_in_executor(None, self.transcribe_audio_with_groq, local_path)
            student_content = f"{student_content} (Transcribed voice: {transcription})"
            
        elif file_type == 'file' and local_path and file_name.lower().endswith('.pdf'):
            def extract_pdf():
                from pypdf import PdfReader
                try:
                    reader = PdfReader(local_path)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() or ""
                    return text[:8000] # limit context size
                except Exception as ex:
                    logger.error(f"PDF extraction error: {ex}")
                    return ""
            loop = asyncio.get_event_loop()
            pdf_text = await loop.run_in_executor(None, extract_pdf)
            if pdf_text:
                attachment_text = f"\n\n[Content of PDF file '{file_name}']:\n{pdf_text}"
                
        elif file_type == 'image' and local_path:
            # For Gemini, we pass raw_b64 directly.
            # For Groq/DeepSeek, we do pytesseract OCR
            ai_provider = config('AI_PROVIDER', default='gemini').lower()
            if ai_provider != 'gemini':
                def run_ocr():
                    import pytesseract
                    from PIL import Image
                    try:
                        return pytesseract.image_to_string(Image.open(local_path))
                    except Exception as ex:
                        logger.error(f"OCR error: {ex}")
                        return ""
                loop = asyncio.get_event_loop()
                ocr_text = await loop.run_in_executor(None, run_ocr)
                if ocr_text:
                    attachment_text = f"\n\n[OCR text from uploaded image]:\n{ocr_text}"

        # Combine text prompts
        full_user_content = student_content
        if attachment_text:
            full_user_content += attachment_text

        # 2. Build system instruction
        if tutor_mode:
            system_prompt = (
                "You are the official Socratic AI Academic Tutor for Federal University Gusau (FUGUSAU), Nigeria.\n"
                "Motto: Knowledge · Innovation · Service.\n"
                "CRITICAL: Do NOT give the student direct answers to homework or study questions. "
                "Instead, ask guiding questions to lead them to discover the answer themselves. "
                "Explain concepts using simple, friendly Nigerian analogies. Break down complex steps and check their understanding at each stage."
            )
        else:
            system_prompt = (
                "You are the official AI Academic Assistant for Federal University Gusau (FUGUSAU), Nigeria.\n"
                "Motto: Knowledge · Innovation · Service.\n"
                "Your purpose is to assist students with academic queries, courses, studying tips, and portal guides.\n"
                "Respond politely, clearly, and concisely in friendly Nigerian English when appropriate."
            )

        # 3. Fetch history
        history = await self.get_room_history_for_ai(self.room_name)

        ai_provider = config('AI_PROVIDER', default='gemini').lower()
        ai_response = ""

        # Router based on AI Provider
        if ai_provider == 'groq':
            groq_key = config('GROQ_API_KEY', default=None)
            if not groq_key:
                ai_response = "I am ready to use Groq, but the GROQ_API_KEY environment variable is not configured."
            else:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history:
                    role = "assistant" if msg['sender_email'] == 'ai.assistant@fugusau.edu.ng' else "user"
                    messages.append({"role": role, "content": msg['content']})
                messages.append({"role": "user", "content": full_user_content})
                
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.5,
                    "max_tokens": 1024
                }
                try:
                    def call_groq():
                        return requests.post(url, headers=headers, json=payload, timeout=20)
                    response = await asyncio.get_event_loop().run_in_executor(None, call_groq)
                    if response.status_code == 200:
                        ai_response = response.json()['choices'][0]['message']['content']
                    else:
                        logger.error(f"Groq API returned error: {response.text}")
                        ai_response = "I encountered an issue connecting to Groq. Please check the server settings."
                except Exception as e:
                    logger.error(f"Error calling Groq API: {e}")
                    ai_response = "Error communicating with Groq."

        elif ai_provider == 'deepseek':
            ds_key = config('DEEPSEEK_API_KEY', default=None)
            if not ds_key:
                ai_response = "I am ready to use DeepSeek, but the DEEPSEEK_API_KEY environment variable is not configured."
            else:
                url = "https://api.deepseek.com/chat/completions"
                headers = {
                    "Authorization": f"Bearer {ds_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history:
                    role = "assistant" if msg['sender_email'] == 'ai.assistant@fugusau.edu.ng' else "user"
                    messages.append({"role": role, "content": msg['content']})
                messages.append({"role": "user", "content": full_user_content})
                
                payload = {
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.5,
                    "max_tokens": 1024
                }
                try:
                    def call_ds():
                        return requests.post(url, headers=headers, json=payload, timeout=20)
                    response = await asyncio.get_event_loop().run_in_executor(None, call_ds)
                    if response.status_code == 200:
                        ai_response = response.json()['choices'][0]['message']['content']
                    else:
                        logger.error(f"DeepSeek API returned error: {response.text}")
                        ai_response = "I encountered an issue connecting to DeepSeek. Please check the server settings."
                except Exception as e:
                    logger.error(f"Error calling DeepSeek API: {e}")
                    ai_response = "Error communicating with DeepSeek."

        else:  # default 'gemini'
            gemini_key = config('GEMINI_API_KEY', default=None)
            if not gemini_key:
                ai_response = (
                    "Hello! I am your FUGUSAU AI Academic Assistant.\n\n"
                    "To enable my full AI brain, please ask the admin to configure the **`GEMINI_API_KEY`** environment variable. "
                    "How else can I assist you with portal features?"
                )
            else:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                headers = {"Content-Type": "application/json"}
                
                contents = []
                for msg in history:
                    role = "model" if msg['sender_email'] == 'ai.assistant@fugusau.edu.ng' else "user"
                    contents.append({
                        "role": role,
                        "parts": [{"text": msg['content']}]
                    })
                
                user_parts = [{"text": full_user_content}]
                if file_type == 'image' and raw_b64:
                    ext = file_name.split('.')[-1].lower() if '.' in file_name else 'png'
                    mime = f"image/{ext}" if ext in ['png', 'jpg', 'jpeg', 'webp', 'gif'] else 'image/png'
                    user_parts.append({
                        "inlineData": {
                            "mimeType": mime,
                            "data": raw_b64
                        }
                    })
                
                contents.append({
                    "role": "user",
                    "parts": user_parts
                })
                
                payload = {
                    "contents": contents,
                    "systemInstruction": {
                        "parts": [{"text": system_prompt}]
                    }
                }
                try:
                    def call_api():
                        return requests.post(url, headers=headers, json=payload, timeout=15)
                    response = await asyncio.get_event_loop().run_in_executor(None, call_api)
                    if response.status_code == 200:
                        res_data = response.json()
                        ai_response = res_data['candidates'][0]['content']['parts'][0]['text']
                    else:
                        logger.error(f"Gemini API returned error: {response.text}")
                        ai_response = "I encountered an issue connecting to my brain. Please try again in a moment."
                except Exception as e:
                    logger.error(f"Error calling Gemini API: {e}")
                    ai_response = "I encountered an error trying to process your request."

        # 4. Save AI message to database
        ai_message = await self.save_ai_message(self.room_name, ai_response)
        
        # 5. Turn off typing indicator
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': 'ai-assistant-id-placeholder',
                'user_name': 'AI Assistant',
                'is_typing': False
            }
        )
        
        # 6. Broadcast message to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat_message', 'message': ai_message}
        )

