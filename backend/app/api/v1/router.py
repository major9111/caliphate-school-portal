"""API v1 Router - loads only working endpoints."""
from fastapi import APIRouter
import importlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Only load endpoints that actually exist and work
endpoints_to_load = [
    ("auth", "/auth", ["auth"]),
    ("students", "/students", ["students"]),
    ("teachers", "/teachers", ["teachers"]),
    ("finance", "/finance", ["finance"]),
    ("ai_chat", "/ai", ["ai"]),
    ("admin_modules", "/admin", ["admin"]),
    ("complete_system", "/system", ["system"]),
    ("audit", "/audit", ["audit"]),
]

for module_name, prefix, tags in endpoints_to_load:
    try:
        module = importlib.import_module(f"app.api.v1.endpoints.{module_name}")
        if hasattr(module, "router"):
            router.include_router(module.router, prefix=prefix, tags=tags)
            logger.info(f"✅ Loaded endpoint: {module_name}")
    except ImportError as e:
        logger.warning(f"⚠️ Could not import {module_name}: {e}")
    except Exception as e:
        logger.error(f"❌ Error loading {module_name}: {e}")
