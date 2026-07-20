"""Main FastAPI application entry point."""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import router as api_router
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Caliphate International Schools API v2.0.0 started")
    logger.info(f"   CORS origins: {settings.CORS_ORIGINS}")
    logger.info(f"   Email configured: {'yes' if settings.SMTP_USER else 'no (dev mode)'}")
    logger.info(f"   Cloudinary: {'yes' if settings.CLOUDINARY_CLOUD_NAME else 'no (local storage)'}")
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
