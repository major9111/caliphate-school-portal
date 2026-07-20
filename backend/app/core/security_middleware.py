"""Enterprise security middleware and utilities."""
import re
import hashlib
import secrets
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
PASSWORD_MIN_LENGTH = 8


class SecurityUtils:
    @staticmethod
    def validate_password(password: str) -> List[str]:
        errors = []
        if len(password) < PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        return errors
    
    @staticmethod
    def sanitize_input(value: str) -> str:
        if not value:
            return value
        value = re.sub(r'<[^>]+>', '', value)
        value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
        value = re.sub(r'javascript\s*:', '', value, flags=re.IGNORECASE)
        return value.strip()
    
    @staticmethod
    def validate_email(email: str) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def get_client_info(request: Request) -> Dict[str, str]:
        return {
            'ip_address': request.client.host if request.client else 'unknown',
            'user_agent': request.headers.get('user-agent', 'unknown'),
        }


class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, List[datetime]] = {}
    
    def is_rate_limited(self, key: str, max_requests: int = 100, window_minutes: int = 15) -> bool:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)
        if key in self.requests:
            self.requests[key] = [t for t in self.requests[key] if t > window_start]
        if key not in self.requests:
            self.requests[key] = []
        if len(self.requests[key]) >= max_requests:
            return True
        self.requests[key].append(now)
        return False


class AuditLogger:
    @staticmethod
    def log_action(db: Session, user_id: Optional[str], action: str, module: str,
                   resource_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None,
                   success: bool = True, request: Optional[Request] = None):
        from app.models.user import AuditLog
        from sqlalchemy import text
        try:
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id VARCHAR, action VARCHAR NOT NULL, module VARCHAR NOT NULL,
                    resource_id VARCHAR, details TEXT, ip_address VARCHAR, user_agent TEXT,
                    success BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            client_info = SecurityUtils.get_client_info(request) if request else {}
            audit_entry = AuditLog(
                user_id=user_id, action=action, module=module, resource_id=resource_id,
                details=json.dumps(details) if details else None,
                ip_address=client_info.get('ip_address'),
                user_agent=client_info.get('user_agent'),
                success=success
            )
            db.add(audit_entry)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log audit action: {e}")
            db.rollback()


rate_limiter = RateLimiter()
audit_logger = AuditLogger()
security_utils = SecurityUtils()
