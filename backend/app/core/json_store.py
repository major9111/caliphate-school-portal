"""Centralized JSON Store with Caching."""
import json
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.cache import cache


def load_json_table(db: Session, table_name: str, ttl: int = 30) -> list:
    cache_key = f"json_table_{table_name}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data
    
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR PRIMARY KEY, value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    row = db.execute(
        text("SELECT value FROM system_settings WHERE key = :key"),
        {"key": table_name}
    ).fetchone()
    
    data = []
    if row:
        try:
            data = json.loads(row[0])
        except:
            data = []
    
    cache.set(cache_key, data, ttl=ttl)
    return data


def save_json_table(db: Session, table_name: str, data: list):
    value_json = json.dumps(data)
    existing = db.execute(
        text("SELECT key FROM system_settings WHERE key = :key"),
        {"key": table_name}
    ).fetchone()
    
    if existing:
        db.execute(
            text("UPDATE system_settings SET value = :value, updated_at = CURRENT_TIMESTAMP WHERE key = :key"),
            {"key": table_name, "value": value_json}
        )
    else:
        db.execute(
            text("INSERT INTO system_settings (key, value) VALUES (:key, :value)"),
            {"key": table_name, "value": value_json}
        )
    
    db.commit()
    cache.delete(f"json_table_{table_name}")
