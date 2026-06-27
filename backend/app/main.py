"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.exceptions import AppException, app_exception_handler, http_exception_handler, generic_exception_handler
from app.api.v1.router import router as v1_router
from app.core.database import engine, Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}")
    # Create tables in development (use Alembic in production)
    if settings.DEBUG:
        Base.metadata.create_all(bind=engine)
        _seed_defaults()
    yield
    logger.info("Shutting down")


def _seed_defaults():
    """Seed essential data on first run."""
    from app.core.database import SessionLocal
    from app.models.school import SchoolInfo
    from app.models.user import User
    from app.core.security import hash_password

    db = SessionLocal()
    try:
        if not db.query(SchoolInfo).first():
            info = SchoolInfo(
                id=1,
                name="Caliphate International Schools Gusau Ltd",
                registration_number="RC 1159138",
                registration_date="12 December 2013",
                institution_type="Private Company Limited by Shares",
                business_activity="Educational Institution",
                address="No. 3, Eastern Bypass Road, Gusau",
                city="Gusau",
                state="Zamfara State",
                country="Nigeria",
                motto="Knowledge, Faith and Excellence",
                vision="To be a leading institution producing morally upright and academically excellent graduates.",
                mission="To provide quality Islamic and Western education in a conducive environment.",
                contact_numbers=["+234 800 000 0000"],
                email="info@caliphateschools.edu.ng",
                website="https://caliphateschools.edu.ng",
                primary_colors=["#0EA5E9", "#1E3A8A", "#FFFFFF", "#000000"],
                social_media={"facebook": "", "twitter": "", "instagram": "", "youtube": ""},
            )
            db.add(info)

        if not db.query(User).filter(User.role == "super_admin").first():
            admin = User(
                email="admin@caliphateschools.edu.ng",
                username="superadmin",
                full_name="Super Administrator",
                hashed_password=hash_password("Admin@1234"),
                role="super_admin",
                is_active=True,
                is_verified=True,
            )
            db.add(admin)

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Seed error: {e}")
    finally:
        db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Enterprise School Portal API",
    lifespan=lifespan,
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda req, exc: JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"}))

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads folder if exists
import os
if os.path.isdir("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# API router
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
