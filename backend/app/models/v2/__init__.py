"""V2 models with UUID PKs, audit fields, soft delete."""
from app.models.v2.base import UUIDAuditMixin
from app.models.v2.academic import (
    ClassArm, GradingSystem, PromotionRule,
    SchoolCalendar, PublicHoliday, ExamCalendar,
    ResultComputationRule, AttendanceRule,
)
from app.models.v2.ai import (
    AIKnowledgeDocument, AIKnowledgeChunk, AIConversation,
    AIMessage, AISettings, AIFallbackAction,
)
from app.models.v2.website import (
    Testimonial, Announcement, Facility, QuickLink,
    HeroSlide, SiteSettings,
)
from app.models.v2.notification import Notification, NotificationPreference
