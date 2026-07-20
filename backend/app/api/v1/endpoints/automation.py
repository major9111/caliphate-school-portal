"""Manual trigger + history for the daily background automation."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.scheduler import run_daily_automations, _load_state, RUN_LOG_KEY
from app.api.v1.endpoints.complete_system import _load

router = APIRouter()


@router.post("/automation/run-now")
def run_now(db: Session = Depends(get_db)):
    """Force an immediate run, bypassing the once-per-day guard — useful for
    testing or catching up after the reminder window already passed today."""
    return run_daily_automations(db=db, force=True)


@router.get("/automation/status")
def automation_status(db: Session = Depends(get_db)):
    state = _load_state(db)
    return {
        "last_run_date": state.get("last_run_date"),
        "last_run_at": state.get("last_run_at"),
    }


@router.get("/automation/log")
def automation_log(db: Session = Depends(get_db)):
    return {"items": _load(db, RUN_LOG_KEY)}
