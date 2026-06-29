"""AI Chat endpoint."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    session_id: Optional[str] = None


@router.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return {
            "response": "I'm Iqra, your AI school assistant. The AI service is currently unavailable. Please contact the school directly at +234 800 000 0000.",
            "session_id": request.session_id,
        }
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            messages = [{"role": m.get("role", "user"), "content": m.get("text", "")} for m in request.history]
            messages.append({"role": "user", "content": request.message})
            
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.7,
                },
                timeout=30.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data["choices"][0]["message"]["content"]
                return {"response": ai_response, "session_id": request.session_id}
            else:
                return {"response": "I'm having trouble connecting right now. Please try again later.", "session_id": request.session_id}
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return {"response": "I'm having trouble connecting right now. Please contact the school at +234 800 000 0000.", "session_id": request.session_id}
