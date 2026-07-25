from django.urls import path
from .views import AIChatView, AIQuickReplyView

urlpatterns = [
    path('chat/',   AIChatView.as_view(),      name='ai-chat'),
    path('quick/',  AIQuickReplyView.as_view(), name='ai-quick'),
]
