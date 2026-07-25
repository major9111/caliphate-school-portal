"""FUGUSAU Portal — Admissions URLs"""
from django.urls import path
from .views import (
    ApplicationListView, ApplicationDetailView,
    ApplicationStatusCheckView, SendOfferView,
    RejectApplicationView, UpdateApplicationStatusView,
    AdmissionStatsView, AdmissionSessionListView,
)
urlpatterns = [
    path('',                            ApplicationListView.as_view(),              name='applications'),
    path('check/',                      ApplicationStatusCheckView.as_view(),       name='admission-check'),
    path('sessions/',                   AdmissionSessionListView.as_view(),         name='admission-sessions'),
    path('stats/',                      AdmissionStatsView.as_view(),               name='admission-stats'),
    path('<uuid:pk>/',                  ApplicationDetailView.as_view(),            name='application-detail'),
    path('<uuid:pk>/offer/',            SendOfferView.as_view(),                    name='send-offer'),
    path('<uuid:pk>/reject/',           RejectApplicationView.as_view(),            name='reject-application'),
    path('<uuid:pk>/status/',           UpdateApplicationStatusView.as_view(),      name='update-status'),
]
