"""CMS service for public website content."""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.cms import Page, Post, Event, NewsItem, FAQ, DownloadFile
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError


class CMSService:
    def __init__(self, db: Session):
        self.db = db
        self.page_repo = BaseRepository(Page, db)
        self.post_repo = BaseRepository(Post, db)
        self.event_repo = BaseRepository(Event, db)
        self.news_repo = BaseRepository(NewsItem, db)
        self.faq_repo = BaseRepository(FAQ, db)
        self.download_repo = BaseRepository(DownloadFile, db)

    # Pages
    def get_page(self, slug: str) -> Page:
        page = self.db.query(Page).filter(Page.slug == slug).first()
        if not page:
            raise NotFoundError("Page not found")
        return page

    def list_pages(self) -> List[Page]:
        return self.db.query(Page).order_by(Page.id.desc()).all()

    def create_page(self, **data) -> Page:
        page = Page(**data)
        return self.page_repo.create(page)

    def update_page(self, id: int, **data) -> Page:
        page = self.page_repo.get(id)
        if not page:
            raise NotFoundError("Page not found")
        for k, v in data.items():
            setattr(page, k, v)
        return self.page_repo.update(page)

    # Posts
    def list_posts(self, published_only: bool = False) -> List[Post]:
        q = self.db.query(Post)
        if published_only:
            q = q.filter(Post.is_published == 1)
        return q.order_by(Post.published_at.desc()).all()

    def create_post(self, **data) -> Post:
        post = Post(**data)
        return self.post_repo.create(post)

    # Events
    def list_events(self, upcoming_only: bool = False) -> List[Event]:
        q = self.db.query(Event).filter(Event.is_published == 1)
        if upcoming_only:
            from datetime import date
            q = q.filter(Event.start_date >= date.today())
        return q.order_by(Event.start_date.asc()).all()

    def create_event(self, **data) -> Event:
        event = Event(**data)
        return self.event_repo.create(event)

    # News
    def list_news(self, limit: int = 10) -> List[NewsItem]:
        return self.db.query(NewsItem).filter(NewsItem.is_published == 1).order_by(NewsItem.published_at.desc()).limit(limit).all()

    def create_news(self, **data) -> NewsItem:
        news = NewsItem(**data)
        return self.news_repo.create(news)

    # FAQ
    def list_faqs(self) -> List[FAQ]:
        return self.db.query(FAQ).filter(FAQ.is_published == 1).order_by(FAQ.order_index.asc()).all()

    def create_faq(self, **data) -> FAQ:
        faq = FAQ(**data)
        return self.faq_repo.create(faq)

    # Downloads
    def list_downloads(self) -> List[DownloadFile]:
        return self.db.query(DownloadFile).filter(DownloadFile.is_published == 1).order_by(DownloadFile.id.desc()).all()

    def create_download(self, **data) -> DownloadFile:
        dl = DownloadFile(**data)
        return self.download_repo.create(dl)
