"""Management profiles endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.models.school import ManagementProfile
from app.schemas.school import ManagementProfileCreate, ManagementProfileUpdate, ManagementProfileOut
from app.models.user import User

router = APIRouter()


@router.get("", response_model=List[ManagementProfileOut])
def list_management(db: Session = Depends(get_db)):
    return db.query(ManagementProfile).filter(ManagementProfile.is_active == 1).order_by(ManagementProfile.order_index.asc()).all()


@router.post("", response_model=ManagementProfileOut, status_code=201)
def create_management(
    payload: ManagementProfileCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_above),
):
    profile = ManagementProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/{profile_id}", response_model=ManagementProfileOut)
def update_management(
    profile_id: int,
    payload: ManagementProfileUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_above),
):
    profile = db.query(ManagementProfile).filter(ManagementProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}")
def delete_management(
    profile_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_above),
):
    profile = db.query(ManagementProfile).filter(ManagementProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Deleted"}
