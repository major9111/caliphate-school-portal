"""Analytics endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.services.analytics_service import AnalyticsService
from app.models.user import User

router = APIRouter()


@router.get("/dashboard")
def dashboard_stats(db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = AnalyticsService(db)
    return service.get_dashboard_stats()


@router.get("/student-growth")
def student_growth(months: int = Query(12, ge=1, le=36), db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = AnalyticsService(db)
    return service.get_student_growth(months)


@router.get("/fee-trend")
def fee_trend(months: int = Query(12, ge=1, le=36), db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = AnalyticsService(db)
    return service.get_fee_collection_trend(months)
