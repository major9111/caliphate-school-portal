"""FUGUSAU Portal — Development Settings"""
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Dev email backend (print to console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Django Debug Toolbar
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE.insert(1, 'debug_toolbar.middleware.DebugToolbarMiddleware')
# INTERNAL_IPS = ['127.0.0.1']

# Local file storage in development
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
