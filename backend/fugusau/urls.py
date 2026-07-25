"""FUGUSAU Portal — Root URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from fugusau.health import HealthView  # Gap 11 — /health/ endpoint

API_V1 = 'api/v1/'

urlpatterns = [
    # Health check (Gap 11 — used by Nginx, Docker, load balancers)
    path('health/', HealthView.as_view(), name='health'),

    # Admin
    path('admin/', admin.site.urls),

    # API v1
    path(API_V1 + 'auth/', include('fugusau.apps.users.urls')),
    path(API_V1 + 'students/', include('fugusau.apps.students.urls')),
    path(API_V1 + 'courses/', include('fugusau.apps.courses.urls')),
    path(API_V1 + 'exams/', include('fugusau.apps.exams.urls')),
    path(API_V1 + 'fees/', include('fugusau.apps.fees.urls')),
    path(API_V1 + 'library/', include('fugusau.apps.library.urls')),
    path(API_V1 + 'hostel/', include('fugusau.apps.hostel.urls')),
    path(API_V1 + 'chat/', include('fugusau.apps.chat.urls')),
    path(API_V1 + 'credentials/', include('fugusau.apps.credentials.urls')),
    path(API_V1 + 'notifications/', include('fugusau.apps.notifications.urls')),
    path(API_V1 + 'reports/', include('fugusau.apps.reports.urls')),
    path(API_V1 + 'admissions/', include('fugusau.apps.admissions.urls')),
    path(API_V1 + 'search/', include('fugusau.apps.search.urls')),
    path(API_V1 + 'ai/',          include('fugusau.apps.ai.urls')),
    path(API_V1 + 'security/', include('fugusau.apps.security.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
