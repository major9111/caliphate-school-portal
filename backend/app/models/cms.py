"""CMS: pages, posts, events, news, FAQ, downloads."""
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from app.core.database import Base
from app.models.base import TimestampMixin


class Page(TimestampMixin, Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    meta_title = Column(String(200), nullable=True)
    meta_description = Column(Text, nullable=True)
    is_published = Column(Integer, default=1)
    published_at = Column(DateTime(timezone=True), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class Post(TimestampMixin, Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    excerpt = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    featured_image = Column(String(500), nullable=True)
    category = Column(String(50), nullable=True)
    is_published = Column(Integer, default=0)
    published_at = Column(DateTime(timezone=True), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class Event(TimestampMixin, Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    location = Column(String(200), nullable=True)
    cover_image = Column(String(500), nullable=True)
    is_published = Column(Integer, default=1)


class NewsItem(TimestampMixin, Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=True)
    featured_image = Column(String(500), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    is_published = Column(Integer, default=1)


class FAQ(TimestampMixin, Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    order_index = Column(Integer, default=0)
    is_published = Column(Integer, default=1)


class DownloadFile(TimestampMixin, Base):
    __tablename__ = "download_files"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    downloads_count = Column(Integer, default=0)
    is_published = Column(Integer, default=1)
