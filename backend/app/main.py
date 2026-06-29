"""Main FastAPI application entry point."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.v1.router import router as api_router
from app.core.security_headers import SecurityHeadersMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Caliphate International Schools API",
    description="Enterprise School Management System API",
    version="2.0.0"
)

# Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
    max_age=86400,  # Cache preflight for 24 hours
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    logger.info(" Starting Caliphate International Schools API v2.0.0")
    logger.info("✅ Security headers enabled")
    logger.info("✅ Audit trail active")
    logger.info("✅ RBAC system initialized")
    logger.info("✅ CORS configured for development")

@app.get("/")
def root():
    return {"status": "healthy", "system": "Caliphate Schools API"}

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle all OPTIONS requests."""
    return {"message": "OK"}
