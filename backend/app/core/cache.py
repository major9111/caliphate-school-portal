"""Simple In-Memory Cache with TTL."""
import time
from typing import Any, Dict, Optional


class Cache:
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            item = self._store[key]
            if time.time() < item['expires_at']:
                return item['value']
            else:
                del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: int = 60):
        self._store[key] = {'value': value, 'expires_at': time.time() + ttl}

    def delete(self, key: str):
        if key in self._store:
            del self._store[key]

    def clear(self):
        self._store.clear()


cache = Cache()
