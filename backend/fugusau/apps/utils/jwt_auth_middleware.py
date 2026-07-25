"""
FUGUSAU Portal — JWT Authentication Middleware for Django Channels
Extracts a JWT access token from the WebSocket query string (?token=<jwt>)
and populates scope['user'] so consumers can call self.scope['user'].

Usage in asgi.py:
    from fugusau.apps.utils.jwt_auth_middleware import JWTAuthMiddlewareStack
    application = ProtocolTypeRouter({
        'websocket': JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
    })
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


import logging as _logging
_mw_logger = _logging.getLogger('fugusau.ws_auth')

@database_sync_to_async
def _get_user_from_token(raw_token: str):
    """Validate a JWT access token and return the corresponding user, or AnonymousUser."""
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

    User = get_user_model()
    try:
        token = AccessToken(raw_token)
        user_id = token.get('user_id') or token.get('sub')
        if not user_id:
            _mw_logger.warning('WS token has no user_id/sub claim')
            return AnonymousUser()
        user = User.objects.get(id=user_id)
        _mw_logger.debug(f'WS authenticated: {user.email}')
        return user
    except (InvalidToken, TokenError) as e:
        _mw_logger.warning(f'WS invalid token: {e}')
        return AnonymousUser()
    except User.DoesNotExist:
        _mw_logger.warning(f'WS token user_id not found: {user_id}')
        return AnonymousUser()
    except Exception as e:
        _mw_logger.error(f'WS auth unexpected error: {e}')
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    ASGI middleware that authenticates WebSocket connections via JWT.
    The client sends the token as a query parameter:
        ws://server/ws/chat/room123/?token=<access_token>
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'websocket':
            query_string = scope.get('query_string', b'').decode('utf-8', errors='ignore')
            params       = parse_qs(query_string)
            token_list   = params.get('token', [])

            if token_list:
                scope['user'] = await _get_user_from_token(token_list[0])
            else:
                scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Convenience wrapper — mirrors AuthMiddlewareStack naming."""
    return JWTAuthMiddleware(inner)
