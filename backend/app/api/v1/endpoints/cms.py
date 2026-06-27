"""CMS endpoints for website content."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_admin_or_above
from app.services.cms_service import CMSService
from app.schemas.cms import (
    PageCreate, PageOut, PostCreate, PostOut, EventCreate, EventOut,
    NewsCreate, NewsOut, FAQCreate, FAQOut, DownloadCreate, DownloadOut,
)
from app.models.user import User

router = APIRouter()


# Pages
@router.get("/pages", response_model=List[PageOut])
def list_pages(db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.list_pages()


@router.get("/pages/{slug}", response_model=PageOut)
def get_page(slug: str, db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.get_page(slug)


@router.post("/pages", response_model=PageOut, status_code=201)
def create_page(payload: PageCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.create_page(**payload.model_dump())


@router.patch("/pages/{page_id}", response_model=PageOut)
def update_page(page_id: int, payload: PageCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.update_page(page_id, **payload.model_dump())


# Posts
@router.get("/posts", response_model=List[PostOut])
def list_posts(published_only: bool = False, db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.list_posts(published_only)


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(payload: PostCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.create_post(**payload.model_dump())


# Events
@router.get("/events", response_model=List[EventOut])
def list_events(upcoming_only: bool = False, db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.list_events(upcoming_only)


@router.post("/events", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.create_event(**payload.model_dump())


# News
@router.get("/news", response_model=List[NewsOut])
def list_news(limit: int = 10, db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.list_news(limit)


@router.post("/news", response_model=NewsOut, status_code=201)
def create_news(payload: NewsCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.create_news(**payload.model_dump())


# FAQ
@router.get("/faqs", response_model=List[FAQOut])
def list_faqs(db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.list_faqs()


@router.post("/faqs", response_model=FAQOut, status_code=201)
def create_faq(payload: FAQCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.create_faq(**payload.model_dump())


# Downloads
@router.get("/downloads", response_model=List[DownloadOut])
def list_downloads(db: Session = Depends(get_db)):
    service = CMSService(db)
    return service.list_downloads()


@router.post("/downloads", response_model=DownloadOut, status_code=201)
def create_download(payload: DownloadCreate, db: Session = Depends(get_db), _: User = Depends(require_admin_or_above)):
    service = CMSService(db)
    return service.create_download(**payload.model_dump())
