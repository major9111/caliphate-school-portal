"""
Server-Sent Events streaming endpoint for real-time UI updates.

Clients connect to /stream?token=<jwt> and receive JSON events when:
  - notifications are created
  - attendance is marked
  - payments are recorded
  - announcements are published

Uses a simple in-process pub/sub queue per token (no Redis required for
single-instance deployments). For multi-instance deployments, replace the
in-process queue with a Redis pub/sub channel.
"""
import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Dict, Set
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from app.core.security import verify_token

router = APIRouter()
logger = logging.getLogger(__name__)

# In-process pub/sub — maps user_id → set of asyncio.Queue instances
_subscribers: Dict[str, Set[asyncio.Queue]] = {}


def publish(user_ids: list[str] | None, event_type: str, data: dict):
    """
    Publish an event to connected SSE clients.

    Args:
        user_ids: List of user IDs to notify, or None to broadcast to all.
        event_type: One of 'notification', 'attendance_update', 'payment', 'announcement'.
        data: Arbitrary dict payload.
    """
    payload = json.dumps({"type": event_type, "data": data})
    targets = list(_subscribers.keys()) if user_ids is None else user_ids
    for uid in targets:
        for q in list(_subscribers.get(uid, set())):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass


async def _event_generator(user_id: str) -> AsyncGenerator[str, None]:
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers.setdefault(user_id, set()).add(q)
    try:
        # Send initial ping so the browser knows the connection is live
        yield f"data: {json.dumps({'type': 'ping', 'data': {'ts': int(time.time())}})}\n\n"
        while True:
            try:
                payload = await asyncio.wait_for(q.get(), timeout=25)
                yield f"data: {payload}\n\n"
            except asyncio.TimeoutError:
                # Heartbeat to keep the connection alive through proxies
                yield f"data: {json.dumps({'type': 'ping', 'data': {'ts': int(time.time())}})}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        _subscribers.get(user_id, set()).discard(q)
        if not _subscribers.get(user_id):
            _subscribers.pop(user_id, None)


@router.get("/stream")
async def sse_stream(token: str = Query(...)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user_id = payload.get("sub", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    return StreamingResponse(
        _event_generator(user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive",
        },
    )


@router.get("/stream/stats")
def stream_stats():
    """Admin endpoint — how many clients are currently connected."""
    return {
        "connected_users": len(_subscribers),
        "total_queues": sum(len(qs) for qs in _subscribers.values()),
    }
