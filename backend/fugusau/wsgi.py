"""
FUGUSAU Portal — WSGI Configuration
Used by Gunicorn in production
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fugusau.settings.production')

application = get_wsgi_application()
