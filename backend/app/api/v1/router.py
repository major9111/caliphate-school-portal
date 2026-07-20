"""API v1 Router — mounts all endpoints with appropriate auth."""
from fastapi import APIRouter, Depends
from app.core.dependencies import require_staff, require_admin
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# (module_name, prefix, tags, dependencies_or_None)
_ENDPOINTS = [
    ("auth",            "/auth",           ["Authentication"],   None),
    ("students",        "/students",       ["Students"],         [Depends(require_staff)]),
    ("teachers",        "/teachers",       ["Teachers"],         [Depends(require_staff)]),
    ("finance",         "/finance",        ["Finance"],          [Depends(require_staff)]),
    ("fee_structures",  "/fees",           ["Fees"],             [Depends(require_staff)]),
    ("exports",         "/exports",        ["Exports"],          [Depends(require_staff)]),
    ("uploads",         "/uploads",        ["Uploads"],          [Depends(require_staff)]),
    ("ai_chat",         "/ai",             ["AI"],               None),
    ("gallery",         "/system",         ["Gallery"],          None),
    ("admin_modules",   "/admin",          ["Admin"],            [Depends(require_staff)]),
    ("promotion",       "/admin",          ["Promotion"],        [Depends(require_staff)]),
    ("automation",      "/admin",          ["Automation"],       [Depends(require_staff)]),
    ("complete_system", "/system",         ["System"],           [Depends(require_staff)]),
    ("portal",          "/system/portal",  ["Portal"],           None),
    ("audit",           "/audit",          ["Audit"],            [Depends(require_admin)]),
    ("stream",          "/system",         ["Stream"],           None),
]


def _import(module_name: str):
    import importlib
    return importlib.import_module(f"app.api.v1.endpoints.{module_name}")


for module_name, prefix, tags, deps in _ENDPOINTS:
    try:
        mod = _import(module_name)
        if hasattr(mod, "router"):
            router.include_router(mod.router, prefix=prefix, tags=tags, dependencies=deps or [])
            logger.info(f"✅ {module_name}")
        else:
            logger.warning(f"⚠️  No router in: {module_name}")
    except Exception as exc:
        logger.error(f"❌ {module_name}: {exc}")

# ── Static uploads ────────────────────────────────────────────────────────────
# Mounted at app level in main.py as /uploads for local dev file serving
