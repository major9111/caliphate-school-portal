"""Finance endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()


@router.get("/stats")
def get_finance_stats(db: Session = Depends(get_db)):
    return {
        "total_revenue": 0,
        "collected": 0,
        "outstanding": 0,
        "expenses": 0,
    }


@router.get("/payments")
def get_payments(limit: int = 10, db: Session = Depends(get_db)):
    return {"items": [], "total": 0}


@router.post("/payments")
def record_payment(data: dict, db: Session = Depends(get_db)):
    return {"message": "Payment recorded", "id": "temp"}
