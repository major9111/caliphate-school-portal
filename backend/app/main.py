"""Main FastAPI application entry point."""
import logging
import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import router as api_router
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.scheduler import start_scheduler
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


def _seed_admin_from_env() -> None:
    """If ADMIN_EMAIL/ADMIN_PASSWORD are set, create-or-reset that super_admin
    account against THIS service's own database on every boot. This makes
    the running backend itself the source of truth for the admin login,
    instead of relying on a one-off script run against (possibly) a
    different database than the one this service actually uses.
    """
    email = settings.ADMIN_EMAIL.strip().lower()
    password = settings.ADMIN_PASSWORD
    if not email or not password:
        return
    if len(password) < 8:
        logger.warning("⚠️  ADMIN_PASSWORD is set but shorter than 8 characters — skipping admin seed.")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.hashed_password = hash_password(password)
            user.role = "super_admin"
            user.is_active = True
            user.is_verified = True
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()
            logger.info(f"✅ Admin account '{email}' reset from ADMIN_EMAIL/ADMIN_PASSWORD env vars.")
            return

        username = email.split("@")[0]
        base_username, suffix, final_username = username, 1, username
        while db.query(User).filter(User.username == final_username).first():
            final_username = f"{base_username}{suffix}"
            suffix += 1

        db.add(User(
            id=str(uuid.uuid4()),
            username=final_username,
            email=email,
            full_name=settings.ADMIN_NAME,
            hashed_password=hash_password(password),
            role="super_admin",
            is_active=True,
            is_verified=True,
        ))
        db.commit()
        logger.info(f"✅ Admin account '{email}' created from ADMIN_EMAIL/ADMIN_PASSWORD env vars.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Caliphate International Schools API v2.0.0 started")
    logger.info(f"   CORS origins: {settings.CORS_ORIGINS}")
    logger.info(f"   Email configured: {'yes' if settings.SMTP_USER else 'no (dev mode)'}")
    logger.info(f"   Cloudinary: {'yes' if settings.CLOUDINARY_CLOUD_NAME else 'no (local storage)'}")
    _seed_admin_from_env()
    start_scheduler()
    yield


app = FastAPI(
    title="Caliphate International Schools API",
    description="Enterprise School Management System API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

app.include_router(api_router, prefix="/api/v1")

# Serve local uploads in dev (Cloudinary replaces this in production)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"status": "healthy", "system": "Caliphate Schools API", "version": "2.0.0"}
