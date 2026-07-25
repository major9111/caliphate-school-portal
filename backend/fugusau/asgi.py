"""FUGUSAU Portal — ASGI Configuration (HTTP + WebSocket)"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fugusau.settings.production')

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from fugusau.apps.chat.routing import websocket_urlpatterns as chat_ws
from fugusau.apps.notifications.routing import websocket_urlpatterns as notif_ws
from fugusau.apps.utils.jwt_auth_middleware import JWTAuthMiddlewareStack

# NOTE: AllowedHostsOriginValidator removed — it was rejecting all WS connections
# because the Origin header (http://localhost) didn't match ALLOWED_HOSTS in production.
# JWT authentication in JWTAuthMiddlewareStack provides the security layer instead.
application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(chat_ws + notif_ws)
    ),
})
