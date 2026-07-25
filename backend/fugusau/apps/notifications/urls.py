"""FUGUSAU Portal — Notifications URLs"""
from django.urls import path
from .views import (
    MyNotificationsView, UnreadCountView,
    MarkReadView, MarkAllReadView, BroadcastNotificationView,
)

urlpatterns = [
    path('',                        MyNotificationsView.as_view(),      name='notifications'),
    path('unread-count/',           UnreadCountView.as_view(),          name='unread-count'),
    path('mark-all-read/',          MarkAllReadView.as_view(),          name='mark-all-read'),
    path('broadcast/',              BroadcastNotificationView.as_view(), name='broadcast'),
    path('<uuid:pk>/read/',         MarkReadView.as_view(),             name='mark-read'),
]
