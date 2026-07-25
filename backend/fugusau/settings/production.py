"""FUGUSAU Portal — Production Settings"""
from .base import *
from decouple import config

DEBUG = False

# ─── HTTPS / HSTS ────────────────────────────────────────────────────────────
# HTTPS_ENABLED=True enables SSL redirect + secure cookies (use when you have a domain + cert)
# HTTPS_ENABLED=False (default) keeps HTTP — correct for local Kali deployment
_HTTPS = config('HTTPS_ENABLED', default=False, cast=bool)

SECURE_PROXY_SSL_HEADER      = ('HTTP_X_FORWARDED_PROTO', 'https') if _HTTPS else None
SECURE_SSL_REDIRECT          = _HTTPS
SECURE_BROWSER_XSS_FILTER   = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE        = _HTTPS
SESSION_COOKIE_HTTPONLY      = True
CSRF_COOKIE_SECURE           = _HTTPS
CSRF_COOKIE_HTTPONLY         = True
X_FRAME_OPTIONS              = 'DENY'
SECURE_HSTS_SECONDS          = 31536000 if _HTTPS else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = _HTTPS
SECURE_HSTS_PRELOAD          = _HTTPS

# Email
EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
SENDGRID_API_KEY = config('SENDGRID_API_KEY')

# S3 Storage
if config('USE_S3', default=False, cast=bool):
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL = 'private'
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
else:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─── Read Replica DB (Gap 10) ─────────────────────────────────────────────────
replica_url = config('DATABASE_REPLICA_URL', default=None)
if replica_url:
    import dj_database_url
    DATABASES['replica'] = dj_database_url.parse(replica_url)
    DATABASES['replica']['TEST'] = {'MIRROR': 'default'}
elif config('DB_REPLICA_HOST', default=None):
    DATABASES['replica'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     config('DB_REPLICA_NAME',     default='fugusau_db'),
        'USER':     config('DB_REPLICA_USER',     default='fugusau_replica'),
        'PASSWORD': config('DB_REPLICA_PASSWORD', default=''),
        'HOST':     config('DB_REPLICA_HOST'),
        'PORT':     config('DB_REPLICA_PORT',     default='5432'),
        'TEST':     {'MIRROR': 'default'},
    }
else:
    if 'replica' in DATABASES:
        del DATABASES['replica']

