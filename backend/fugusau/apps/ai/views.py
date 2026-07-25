"""FUGUSAU Portal — AI Chatbot (Claude-powered academic assistant)"""
import json
import logging
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

logger = logging.getLogger('fugusau.ai')

SYSTEM_PROMPT = """You are FUGUSAU AI Assistant — a helpful, knowledgeable academic assistant for Federal University Gusau (FUGUSAU) undergraduate students portal.

Your role:
- Help students with course registration, results, fees, hostel allocation, library, and exam schedules
- Answer general academic questions about Nigerian university education
- Guide users on how to use the FUGUSAU portal
- Provide study tips, research guidance, and academic support
- Answer questions about university policies, deadlines, and procedures

Portal features you know about:
- Dashboard: overview of academic performance, fees, notifications
- My Courses: registered courses for current semester
- Results: view semester results and CGPA
- Fees & Payments: check fee balance, make payments via Paystack/Flutterwave
- Exam Card: download exam clearance card
- Hostel: apply for hostel accommodation
- Library: browse and borrow eBooks and physical books
- Credential Verifier: verify academic credentials using AI
- Messages: chat with lecturers, admin, and fellow students
- Notifications: stay updated on announcements

Rules:
- Be friendly, concise, and accurate
- If you don't know something specific to FUGUSAU, say so honestly
- Never invent exam dates, fees, or policies you're unsure about
- Always respond in the same language the user writes in
- Keep responses focused and relevant to academics/university life
- Format responses with clear headings and bullet points when listing steps
"""


class AIChatView(APIView):
    """POST /api/v1/ai/chat/ — AI chatbot endpoint"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            import anthropic
        except ImportError:
            return Response(
                {'error': 'AI service not available. Install anthropic package.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response(
                {'error': 'AI service not configured. Set ANTHROPIC_API_KEY in environment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        messages  = request.data.get('messages', [])
        user_msg  = request.data.get('message', '')
        stream    = request.data.get('stream', False)

        if not messages and not user_msg:
            return Response({'error': 'No message provided.'}, status=400)

        # Build message list
        if not messages:
            messages = [{'role': 'user', 'content': user_msg}]

        # Add user context to system prompt
        user    = request.user
        role    = getattr(user, 'role', 'student')
        context = f"\n\nCurrent user: {user.get_full_name()} | Role: {role} | Email: {user.email}"

        # Validate and clean messages
        clean_messages = []
        for m in messages[-20:]:  # Keep last 20 messages to avoid token limits
            if isinstance(m, dict) and m.get('role') in ('user', 'assistant') and m.get('content'):
                clean_messages.append({
                    'role':    m['role'],
                    'content': str(m['content'])[:4000]  # Limit per message
                })

        if not clean_messages:
            return Response({'error': 'Invalid message format.'}, status=400)

        try:
            client = anthropic.Anthropic(api_key=api_key)

            if stream:
                # Streaming response
                def event_stream():
                    with client.messages.stream(
                        model      = 'claude-3-haiku-20240307',
                        max_tokens = 1024,
                        system     = SYSTEM_PROMPT + context,
                        messages   = clean_messages,
                    ) as stream_obj:
                        for text in stream_obj.text_stream:
                            yield f"data: {json.dumps({'text': text})}\n\n"
                    yield "data: [DONE]\n\n"

                return StreamingHttpResponse(
                    event_stream(),
                    content_type='text/event-stream',
                    headers={
                        'Cache-Control':   'no-cache',
                        'X-Accel-Buffering': 'no',
                    }
                )
            else:
                # Regular response
                response = client.messages.create(
                    model      = 'claude-3-haiku-20240307',
                    max_tokens = 1024,
                    system     = SYSTEM_PROMPT + context,
                    messages   = clean_messages,
                )
                reply = response.content[0].text
                logger.info(f'AI chat: {user.email} — {len(reply)} chars reply')
                return Response({
                    'reply':        reply,
                    'input_tokens':  response.usage.input_tokens,
                    'output_tokens': response.usage.output_tokens,
                })

        except Exception as e:
            logger.error(f'AI chat error: {e}')
            if 'authentication' in str(e).lower() or 'api_key' in str(e).lower():
                return Response({'error': 'Invalid AI API key.'}, status=503)
            if 'rate' in str(e).lower():
                return Response({'error': 'AI service rate limit reached. Try again shortly.'}, status=429)
            return Response({'error': f'AI service error: {str(e)}'}, status=500)


class AIQuickReplyView(APIView):
    """POST /api/v1/ai/quick/ — Quick one-shot AI reply (no history)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question = request.data.get('question', '').strip()
        if not question:
            return Response({'error': 'Question is required.'}, status=400)

        try:
            import anthropic
            api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
            if not api_key:
                return Response({'error': 'AI not configured.'}, status=503)

            client   = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model      = 'claude-3-haiku-20240307',
                max_tokens = 512,
                system     = SYSTEM_PROMPT,
                messages   = [{'role': 'user', 'content': question}],
            )
            return Response({'reply': response.content[0].text})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
