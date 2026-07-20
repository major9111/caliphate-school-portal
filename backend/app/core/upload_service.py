"""File upload service — Cloudinary for production, local storage for dev."""
import os
import io
import uuid
import logging
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES   = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_SIZE_MB    = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Local upload fallback path (used in dev when Cloudinary is not configured)
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")


def _ensure_local_dir():
    os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


async def _read_and_validate(file: UploadFile, allowed_types: set) -> bytes:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB.")
    ct = file.content_type or ""
    if ct not in allowed_types:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {ct}. Allowed: {', '.join(allowed_types)}")
    return content


async def upload_image(file: UploadFile, folder: str = "general") -> Tuple[str, str]:
    """Upload an image. Returns (url, public_id)."""
    content = await _read_and_validate(file, ALLOWED_IMAGE_TYPES)

    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        return await _cloudinary_upload(content, file.filename or "upload", folder, resource_type="image")
    else:
        return _local_upload(content, file.filename or "upload", folder)


async def upload_document(file: UploadFile, folder: str = "documents") -> Tuple[str, str]:
    """Upload a document (PDF or image). Returns (url, public_id)."""
    content = await _read_and_validate(file, ALLOWED_DOC_TYPES)

    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        resource_type = "image" if file.content_type in ALLOWED_IMAGE_TYPES else "raw"
        return await _cloudinary_upload(content, file.filename or "doc", folder, resource_type=resource_type)
    else:
        return _local_upload(content, file.filename or "doc", folder)


async def _cloudinary_upload(content: bytes, filename: str, folder: str, resource_type: str) -> Tuple[str, str]:
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        public_id = f"caliphate_school/{folder}/{uuid.uuid4().hex}"
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            public_id=public_id,
            resource_type=resource_type,
            overwrite=True,
            folder=f"caliphate_school/{folder}",
        )
        return result["secure_url"], result["public_id"]
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed. Please try again.")


def _local_upload(content: bytes, filename: str, folder: str) -> Tuple[str, str]:
    _ensure_local_dir()
    ext = os.path.splitext(filename)[-1] or ".bin"
    uid = uuid.uuid4().hex
    dest_dir = os.path.join(LOCAL_UPLOAD_DIR, folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, f"{uid}{ext}")
    with open(dest_path, "wb") as f:
        f.write(content)
    # Return a relative URL served via /uploads static mount
    url = f"/uploads/{folder}/{uid}{ext}"
    logger.info(f"[LOCAL-UPLOAD] Saved to {dest_path} (Cloudinary not configured)")
    return url, f"{folder}/{uid}{ext}"


def delete_file(public_id: str) -> bool:
    """Delete a file from Cloudinary (no-op for local uploads)."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        return True
    try:
        import cloudinary.uploader
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        return False
