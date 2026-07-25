"""
FUGUSAU Portal — Base Django Settings
Shared across all environments
"""
import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

# ─── Applications ──────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'channels',
    'django_celery_beat',
    'django_celery_results',
    'storages',
    'django_otp',
    'django_otp.plugins.otp_totp',
    'django_recaptcha',
]

LOCAL_APPS = [
    'fugusau.apps.users',
    'fugusau.apps.students',
    'fugusau.apps.courses',
    'fugusau.apps.exams',
    'fugusau.apps.fees',
    'fugusau.apps.library',
    'fugusau.apps.chat',
    'fugusau.apps.credentials',
    'fugusau.apps.hostel',
    'fugusau.apps.notifications',
    'fugusau.apps.reports',
    'fugusau.apps.admissions',
    'fugusau.apps.search',
    'fugusau.apps.security',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─── Middleware ────────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ── FUGUSAU Security (order is load-bearing) ──
    'fugusau.apps.security.honeypot.HoneypotMiddleware',         # blocks bots before anything else
    'fugusau.apps.security.middleware.SecurityMiddleware',
    'fugusau.apps.security.middleware.BruteForceProtectionMiddleware',
    'fugusau.apps.security.middleware.FileUploadSecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',                       # after AuthenticationMiddleware
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'fugusau.urls'
WSGI_APPLICATION = 'fugusau.wsgi.application'
ASGI_APPLICATION = 'fugusau.asgi.application'

# ─── Templates ─────────────────────────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ─── Database ──────────────────────────────────────────────────
DATABASES = {
    'default': dj_database_url.config(
        default=f"postgres://{config('DB_USER', default='fugusau_user')}:{config('DB_PASSWORD', default='fugusau_pass')}@{config('DB_HOST', default='localhost')}:{config('DB_PORT', default='5432')}/{config('DB_NAME', default='fugusau_db')}"
    )
}
DATABASES['default']['OPTIONS'] = {'connect_timeout': 10}

# ─── Database Router (Gap 10) — SELECT → replica, writes → primary ───────────
DATABASE_ROUTERS = ['fugusau.db_router.PrimaryReplicaRouter']

# ─── Custom User Model ─────────────────────────────────────────
AUTH_USER_MODEL = 'users.User'

# ─── Password Validation ───────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'fugusau.apps.users.password_policy.ComplexityValidator'},
    {'NAME': 'fugusau.apps.users.password_policy.BreachCheckValidator'},
]

# ─── Internationalization ──────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Lagos'
USE_I18N = True
USE_TZ = True

# ─── Static & Media Files ─────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── REST Framework ────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
    },
}

# ─── JWT Settings ──────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─── CORS ─────────────────────────────────────────────────────
# .strip() on each entry matters: CORS_ALLOWED_ORIGINS does an *exact* string
# match against the browser's Origin header, which never has whitespace. If
# the env var is set as "https://a.com, https://b.com" (space after the
# comma — easy to do by hand), the unstripped version silently fails to
# match https://b.com and CORS blocks it with no obvious error.
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000').split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]

# ─── Channels (WebSocket) ─────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [config('REDIS_URL', default='redis://localhost:6379/0')]},
    },
}

# ─── Celery ────────────────────────────────────────────────────
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default=config('REDIS_URL', default='redis://localhost:6379/0'))
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default=config('REDIS_URL', default='redis://localhost:6379/0'))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ─── Cache ─────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/0'),
    }
}

# ─── API Docs (Spectacular) ───────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'FUGUSAU Portal API',
    'DESCRIPTION': 'Federal University Gusau — Undergraduate Students Portal API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {'name': 'FUGUSAU Web Team', 'email': 'webteam@fugusau.edu.ng'},
}

# ─── External Services ─────────────────────────────────────────
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')
PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='')
PAYSTACK_BASE_URL = config('PAYSTACK_BASE_URL', default='https://api.paystack.co')

REMITA_API_KEY = config('REMITA_API_KEY', default='')
REMITA_MERCHANT_ID = config('REMITA_MERCHANT_ID', default='')
REMITA_BASE_URL = config('REMITA_BASE_URL', default='')

ANTHROPIC_API_KEY = config('ANTHROPIC_API_KEY', default='')

WAEC_API_KEY = config('WAEC_API_KEY', default='')
WAEC_API_URL = config('WAEC_API_URL', default='')
NECO_API_KEY = config('NECO_API_KEY', default='')
NECO_API_URL = config('NECO_API_URL', default='')
JAMB_API_KEY = config('JAMB_API_KEY', default='')
JAMB_API_URL = config('JAMB_API_URL', default='')

AT_USERNAME = config('AT_USERNAME', default='sandbox')
AT_API_KEY = config('AT_API_KEY', default='')
AT_SENDER_ID = config('AT_SENDER_ID', default='FUGUSAU')

SENDGRID_API_KEY = config('SENDGRID_API_KEY', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@fugusau.edu.ng')

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# ─── Geo-IP ───────────────────────────────────────────────────
GEOIP_PATH = config('GEOIP_PATH', default='/opt/geoip/')

# ─── reCAPTCHA v3 ─────────────────────────────────────────────
RECAPTCHA_PUBLIC_KEY     = config('RECAPTCHA_PUBLIC_KEY', default='')
RECAPTCHA_PRIVATE_KEY    = config('RECAPTCHA_PRIVATE_KEY', default='')
RECAPTCHA_REQUIRED_SCORE = 0.7

# ─── University Constants ──────────────────────────────────────
UNIVERSITY_NAME = 'Federal University Gusau'
UNIVERSITY_ABBREVIATION = 'FUGUSAU'
CURRENT_SESSION = '2025/2026'
CURRENT_SEMESTER = 'Second'
MAX_CREDIT_UNITS_PER_SEMESTER = 36
MIN_CREDIT_UNITS_PER_SEMESTER = 15
MIN_ATTENDANCE_PERCENTAGE = 75
PASS_MARK = 40

# Grade boundaries
GRADE_BOUNDARIES = {
    'A':  (70, 100, 5.0),
    'B+': (60, 69,  4.0),
    'B':  (55, 59,  3.5),
    'C+': (50, 54,  3.0),
    'C':  (45, 49,  2.5),
    'D':  (40, 44,  2.0),
    'F':  (0,  39,  0.0),
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{levelname} {asctime} {module} {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/fugusau.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'fugusau': {'handlers': ['console', 'file'], 'level': 'DEBUG', 'propagate': False},
    },
}
