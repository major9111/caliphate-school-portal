"""FUGUSAU Portal — Hostel URLs (Full CRUD)"""
from django.urls import path
from .views import (
    HostelListView, HostelDetailView, HostelDeleteView,
    RoomListView, RoomDetailView,
    ApplyForHostelView, AllocationListView, MyAllocationView,
    ApproveAllocationView, RejectAllocationView, VacateRoomView,
)

urlpatterns = [
    path('',                                    HostelListView.as_view(),           name='hostel-list'),
    path('<uuid:pk>/',                          HostelDetailView.as_view(),         name='hostel-detail'),
    path('<uuid:pk>/delete/',                   HostelDeleteView.as_view(),         name='hostel-delete'),
    path('rooms/',                              RoomListView.as_view(),             name='room-list'),
    path('rooms/<uuid:pk>/',                    RoomDetailView.as_view(),           name='room-detail'),
    path('apply/',                              ApplyForHostelView.as_view(),       name='hostel-apply'),
    path('my-allocation/',                      MyAllocationView.as_view(),         name='my-allocation'),
    path('allocations/',                        AllocationListView.as_view(),       name='allocation-list'),
    path('allocations/<uuid:pk>/approve/',      ApproveAllocationView.as_view(),    name='approve-allocation'),
    path('allocations/<uuid:pk>/reject/',       RejectAllocationView.as_view(),     name='reject-allocation'),
    path('allocations/<uuid:pk>/vacate/',       VacateRoomView.as_view(),           name='vacate-room'),
]
