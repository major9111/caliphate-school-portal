"""Settings endpoints (audit logs, activity logs, backup triggers)."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_super_admin
from app.models.user import AuditLog, ActivityLog
from app.models.user import User

router = APIRouter()


@router.get("/audit-logs")
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    return db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()


@router.get("/activity-logs")
def list_activity_logs(limit: int = 100, db: Session = Depends(get_db), _: User = Depends(require_super_admin)):
    return db.query(ActivityLog).order_by(ActivityLog.id.desc()).limit(limit).all()


@router.post("/backup")
def trigger_backup(_: User = Depends(require_super_admin)):
    # In production, this would enqueue a Celery task
    return {"message": "Backup task queued"}
