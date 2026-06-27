"""School info endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_super_admin
from app.models.school import SchoolInfo
from app.schemas.school import SchoolInfoUpdate, SchoolInfoOut
from app.models.user import User

router = APIRouter()


def _get_or_create_school(db: Session) -> SchoolInfo:
    info = db.query(SchoolInfo).filter(SchoolInfo.id == 1).first()
    if not info:
        info = SchoolInfo(id=1)
        db.add(info)
        db.commit()
        db.refresh(info)
    return info


@router.get("", response_model=SchoolInfoOut)
def get_school_info(db: Session = Depends(get_db)):
    return _get_or_create_school(db)


@router.patch("", response_model=SchoolInfoOut)
def update_school_info(
    payload: SchoolInfoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    info = _get_or_create_school(db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(info, k, v)
    db.commit()
    db.refresh(info)
    return info
