"""
FUGUSAU Portal — /health/ endpoint + Database Router

1. Add HealthView to fugusau/urls.py (before API_V1 patterns):
      path('health/', HealthView.as_view(), name='health'),

2. Place DatabaseRouter in fugusau/db_router.py and add to settings/base.py:
      DATABASE_ROUTERS = ['fugusau.db_router.PrimaryReplicaRouter']

3. Add read replica to settings/production.py DATABASES:
      DATABASES['replica'] = {
          'ENGINE': 'django.db.backends.postgresql',
          'NAME': config('DB_REPLICA_NAME', default='fugusau_db'),
          'USER': config('DB_REPLICA_USER', default='fugusau_replica'),
          'PASSWORD': config('DB_REPLICA_PASSWORD', default=''),
          'HOST': config('DB_REPLICA_HOST', default='localhost'),
          'PORT': config('DB_REPLICA_PORT', default='5432'),
          'TEST': {'MIRROR': 'default'},   # Use primary in tests
      }
"""
import time
from django.http import JsonResponse
from django.db import connections
from django.core.cache import cache
from django.views import View


# ─── /health/ View ────────────────────────────────────────────────────────────

class HealthView(View):
    """
    GET /health/
    Used by Nginx, Docker healthchecks, and load balancers.
    Returns 200 if all services are up, 503 if any critical service is down.
    """

    def get(self, request):
        status = {
            'status': 'ok',
            'services': {}
        }
        http_status = 200

        # ── Database ──────────────────────────────────────────────────
        try:
            t0 = time.monotonic()
            connections['default'].cursor().execute('SELECT 1')
            db_ms = round((time.monotonic() - t0) * 1000, 1)
            status['services']['database'] = {'status': 'ok', 'latency_ms': db_ms}
        except Exception as exc:
            status['services']['database'] = {'status': 'error', 'detail': str(exc)}
            status['status'] = 'degraded'
            http_status = 503

        # ── Redis / Cache ─────────────────────────────────────────────
        try:
            t0 = time.monotonic()
            cache.set('_health_check', '1', timeout=10)
            val = cache.get('_health_check')
            redis_ms = round((time.monotonic() - t0) * 1000, 1)
            if val == '1':
                status['services']['redis'] = {'status': 'ok', 'latency_ms': redis_ms}
            else:
                raise RuntimeError('Cache read/write mismatch')
        except Exception as exc:
            status['services']['redis'] = {'status': 'error', 'detail': str(exc)}
            status['status'] = 'degraded'
            http_status = 503

        # ── Replica (if configured) ───────────────────────────────────
        if 'replica' in connections.databases:
            try:
                t0 = time.monotonic()
                connections['replica'].cursor().execute('SELECT 1')
                rep_ms = round((time.monotonic() - t0) * 1000, 1)
                status['services']['replica'] = {'status': 'ok', 'latency_ms': rep_ms}
            except Exception as exc:
                # Replica down is degraded, not critical
                status['services']['replica'] = {'status': 'error', 'detail': str(exc)}
                if status['status'] == 'ok':
                    status['status'] = 'degraded'

        return JsonResponse(status, status=http_status)
