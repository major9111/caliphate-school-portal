"""FUGUSAU Portal — Chat URLs (Extended)"""
from django.urls import path
from .views import (
    MyChatRoomsView, CreateRoomView, RoomMessagesView,
    EditMessageView, DeleteMessageView, PinMessageView,
    PinnedMessagesView, ReactMessageView, SearchMessagesView, MyMentionsView,
)

urlpatterns = [
    path('rooms/',                                  MyChatRoomsView.as_view(),     name='chat-rooms'),
    path('rooms/create/',                           CreateRoomView.as_view(),       name='create-room'),
    path('rooms/<uuid:room_id>/messages/',          RoomMessagesView.as_view(),     name='room-messages'),
    path('rooms/<uuid:room_id>/pinned/',            PinnedMessagesView.as_view(),   name='pinned-messages'),
    path('rooms/<uuid:room_id>/search/',            SearchMessagesView.as_view(),   name='search-messages'),
    path('messages/<uuid:message_id>/edit/',        EditMessageView.as_view(),      name='edit-message'),
    path('messages/<uuid:message_id>/',             DeleteMessageView.as_view(),    name='delete-message'),
    path('messages/<uuid:message_id>/pin/',         PinMessageView.as_view(),       name='pin-message'),
    path('messages/<uuid:message_id>/react/',       ReactMessageView.as_view(),     name='react-message'),
    path('mentions/',                               MyMentionsView.as_view(),       name='my-mentions'),
]
