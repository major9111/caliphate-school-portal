"""Gallery endpoints — public listing (no auth), staff-only management.

Mounted with no router-level auth dependency so the public gallery page
can list images without logging in, while add/edit/delete require staff.
"""
import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.dependencies import require_staff
from app.core.upload_service import upload_image, delete_file
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

TABLE = "gallery"


def _load(db: Session) -> list:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR PRIMARY KEY, value TEXT, category VARCHAR DEFAULT 'system',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()
    row = db.execute(text("SELECT value FROM system_settings WHERE key = :k"), {"k": TABLE}).fetchone()
    return json.loads(row[0]) if row else []


def _save(db: Session, data: list):
    value_json = json.dumps(data, default=str)
    existing = db.execute(text("SELECT key FROM system_settings WHERE key = :k"), {"k": TABLE}).fetchone()
    if existing:
        db.execute(text("UPDATE system_settings SET value = :v, updated_at = CURRENT_TIMESTAMP WHERE key = :k"), {"k": TABLE, "v": value_json})
    else:
        db.execute(text("INSERT INTO system_settings (key, value, category) VALUES (:k, :v, 'media')"), {"k": TABLE, "v": value_json})
    db.commit()


_SEED_ITEMS = [
    ("hero-playground.jpg", "On the playground", "campus"),
    ("playground-wide.jpg", "Seesaw and swings", "campus"),
    ("swing-single.jpg", "Swing time", "campus"),
    ("swing-pair.jpg", "Friends on the swings", "campus"),
    ("classroom-1.jpg", "Nursery classroom", "classroom"),
    ("classroom-2.jpg", "Learning together", "classroom"),
    ("classroom-3.jpg", "In class", "classroom"),
    ("classroom-4.jpg", "Classroom display wall", "classroom"),
    ("classroom-5.jpg", "Focused on the lesson", "classroom"),
    ("classroom-6.jpg", "Classroom time", "classroom"),
    ("classroom-7.jpg", "Morning class", "classroom"),
    ("classroom-8.jpg", "In the classroom", "classroom"),
    ("classroom-9.jpg", "Class session", "classroom"),
    ("classroom-10.jpg", "Students at their desks", "classroom"),
    ("classroom-11.jpg", "Classroom moment", "classroom"),
]


def _seed_if_empty(db: Session) -> list:
    """On first ever load, populate the gallery with the campus photos
    already shipped in the frontend's public/images folder, so the page
    isn't empty before an admin uploads anything new."""
    existing = _load(db)
    if existing:
        return existing
    seeded = [
        {
            "id": str(uuid.uuid4()),
            "url": f"/images/{filename}",
            "public_id": None,
            "caption": caption,
            "note": "",
            "category": category,
            "uploaded_by": "Caliphate Schools",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        for filename, caption, category in _SEED_ITEMS
    ]
    _save(db, seeded)
    return seeded


# ─── Public ───────────────────────────────────────────────────────────────────

@router.get("/gallery")
def list_gallery(db: Session = Depends(get_db)):
    """Public: list all gallery images, newest first."""
    items = _seed_if_empty(db)
    return {"items": items, "total": len(items)}


# ─── Staff management ─────────────────────────────────────────────────────────

@router.post("/gallery")
async def create_gallery_item(
    file: UploadFile = File(...),
    caption: str = Form(""),
    note: str = Form(""),
    category: str = Form("general"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    url, public_id = await upload_image(file, folder="gallery")
    item = {
        "id": str(uuid.uuid4()),
        "url": url,
        "public_id": public_id,
        "caption": caption.strip(),
        "note": note.strip(),
        "category": category.strip() or "general",
        "uploaded_by": current_user.full_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items = _load(db)
    items.insert(0, item)
    _save(db, items)
    return item


@router.put("/gallery/{item_id}")
def update_gallery_item(
    item_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    items = _load(db)
    updated = None
    result = []
    for item in items:
        if item["id"] == item_id:
            updated = {**item, **{k: v for k, v in data.items() if k in ("caption", "note", "category")}}
            result.append(updated)
        else:
            result.append(item)
    if updated is None:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    _save(db, result)
    return updated


@router.delete("/gallery/{item_id}")
def delete_gallery_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    items = _load(db)
    target = next((i for i in items if i["id"] == item_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    remaining = [i for i in items if i["id"] != item_id]
    _save(db, remaining)
    if target.get("public_id"):
        try:
            delete_file(target["public_id"])
        except Exception as e:
            logger.warning(f"Could not delete gallery file {target.get('public_id')}: {e}")
    return {"message": "Deleted"}
