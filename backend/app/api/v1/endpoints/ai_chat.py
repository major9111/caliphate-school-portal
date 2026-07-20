"""AI Chat endpoint — powers the public AI Receptionist widget."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

FALLBACK_MESSAGE = (
    "I'm Iqra, your AI school assistant. The AI service is currently unavailable. "
    "Please contact the school directly for assistance."
)
ERROR_MESSAGE = "I'm having trouble connecting right now. Please try again shortly, or contact the school directly."


class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    session_id: Optional[str] = None


@router.post("/chat")
async def chat(request: ChatRequest):
    if not settings.GROQ_API_KEY:
        return {"reply": FALLBACK_MESSAGE, "session_id": request.session_id or ""}

    try:
        messages = [{"role": m.get("role", "user"), "content": m.get("text", "")} for m in request.history]
        messages.append({"role": "user", "content": request.message})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                },
                timeout=30.0,
            )

        if response.status_code == 200:
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
            return {"reply": ai_response, "session_id": request.session_id or ""}

        logger.warning(f"Groq API returned status {response.status_code}: {response.text}")
        return {"reply": ERROR_MESSAGE, "session_id": request.session_id or ""}

    except Exception as exc:
        logger.error(f"AI chat error: {exc}")
        return {"reply": ERROR_MESSAGE, "session_id": request.session_id or ""}
