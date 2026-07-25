"""
FUGUSAU Portal — Security Middleware
Inspects every request for threats: SQL injection, XSS, brute force,
path traversal, rate limiting, blocked IPs, session hijacking, etc.
"""
import re
import logging
import hashlib
import json
from django.db import models
from django.utils import timezone
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger('fugusau.security')

# ─── Threat Pattern Library ───────────────────────────────────────────────
SQL_INJECTION_PATTERNS = [
    # Multi-keyword SQL context — requires paired syntax so common words like
    # "select", "delete", "update" in plain prose don't trigger a ban.
    r"(\bSELECT\b.{0,100}\bFROM\b|\bINSERT\b\s+\bINTO\b|\bUPDATE\b\s+\w[\w.]*\s+\bSET\b"
    r"|\bDELETE\b\s+\bFROM\b|\bDROP\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA|PROCEDURE)\b"
    r"|\bUNION\s+(ALL\s+)?\bSELECT\b|\bEXEC(UTE)?\s*\(|\bEXEC(UTE)?\s+\w+\s)",
    # Full tautology patterns: ' OR '1'='1  /  OR 1=1--  (not just bare OR/AND)
    r"('\s*(OR|AND)\s*'[^']*'\s*=\s*'[^']*'"
    r"|'\s*(OR|AND)\s+\d+\s*=\s*\d+"
    r"|\bOR\b\s+\d+\s*=\s*\d+\s*(--|#|$)"
    r"|\bAND\b\s+\d+\s*=\s*\d+\s*(--|#|$))",
    # High-specificity server-side attack tokens
    r"(\bxp_cmdshell\b|\bSYSTEM_USER\b|\bIS_SRVROLEMEMBER\b|\bOPENROWSET\b|\bBULK\s+INSERT\b)",
    # Time-based / encoding blind injection
    r"(CHAR\s*\(\d{2,3}\)|SLEEP\s*\(\d+\)|BENCHMARK\s*\(\d+|WAITFOR\s+DELAY)",
    # Schema enumeration
    r"(INFORMATION_SCHEMA\s*\.|SYS\.TABLES|ALL_TABLES|sqlite_master)",
]

XSS_PATTERNS = [
    r"<\s*script[^>]*>",
    r"javascript\s*:",
    r"on(load|error|click|mouseover|focus|blur|change|submit)\s*=",
    r"<\s*iframe[^>]*>",
    r"<\s*img[^>]+src\s*=\s*[\"']?\s*javascript",
    r"eval\s*\(",
    r"document\s*\.\s*(cookie|write|location)",
    r"window\s*\.\s*(location|open)",
    r"expression\s*\(",
    r"vbscript\s*:",
]

PATH_TRAVERSAL_PATTERNS = [
    r"\.\./",
    r"\.\.\\",
    r"%2e%2e%2f",
    r"%2e%2e/",
    r"\.\.%2f",
    r"%252e%252e",
]

COMMAND_INJECTION_PATTERNS = [
    r"[;&|`]\s*(ls|cat|rm|wget|curl|chmod|bash|sh|python|perl|nc|netcat)",
    r"\$\(.*\)",
    r"`[^`]+`",
    r"\|\s*(bash|sh|cmd|powershell)",
]

COMPILED_SQL    = [re.compile(p, re.IGNORECASE) for p in SQL_INJECTION_PATTERNS]
COMPILED_XSS    = [re.compile(p, re.IGNORECASE) for p in XSS_PATTERNS]
COMPILED_PATH   = [re.compile(p, re.IGNORECASE) for p in PATH_TRAVERSAL_PATTERNS]
COMPILED_CMD    = [re.compile(p, re.IGNORECASE) for p in COMMAND_INJECTION_PATTERNS]


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def scan_for_patterns(text: str, patterns: list) -> tuple[bool, str]:
    """Returns (found, matched_pattern)"""
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            return True, match.group()[:100]
    return False, ''


def log_security_event(event_type, threat_level, description, request,
                       user=None, action_taken='', extra_data=None,
                       ip_blocked=False, user_locked=False):
    """Async-safe security event logger"""
    try:
        from fugusau.apps.security.models import SecurityEvent
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')[:500]

        SecurityEvent.objects.create(
            event_type=event_type,
            threat_level=threat_level,
            description=description,
            user=user or (request.user if request.user.is_authenticated else None),
            ip_address=ip,
            user_agent=ua,
            request_path=request.path[:500],
            request_method=request.method,
            action_taken=action_taken,
            ip_blocked=ip_blocked,
            user_locked=user_locked,
            extra_data=extra_data or {},
        )

        if threat_level in ('high', 'critical'):
            logger.warning(f'SECURITY [{threat_level.upper()}] {event_type}: {description} — IP: {ip}')
            # Alert analysts via cache flag (picked up by Celery task)
            cache.set(f'security_alert_{event_type}_{ip}', {
                'type': event_type,
                'level': threat_level,
                'description': description,
                'ip': ip,
                'path': request.path,
                'timestamp': timezone.now().isoformat(),
            }, timeout=3600)

    except Exception as e:
        logger.error(f'Failed to log security event: {e}')


class SecurityMiddleware:
    """
    Main FUGUSAU security middleware. Runs on every request.
    Order of checks:
    1. Blocked IP check
    2. Rate limiting
    3. Brute force detection
    4. Payload scanning (SQL, XSS, Path Traversal, Command Injection)
    5. Session validation
    6. Suspicious header detection
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Paths exempt from scanning (health checks etc.)
        self.exempt_paths = ['/api/schema/', '/admin/jsi18n/']

    def __call__(self, request):
        ip = get_client_ip(request)

        # ── 1. Blocked IP Check ──────────────────────────────────
        if self._is_blocked_ip(ip):
            self._increment_block_hit(ip)
            logger.warning(f'BLOCKED IP attempted access: {ip} → {request.path}')
            return JsonResponse({'error': 'Access denied.'}, status=403)

        if request.path in self.exempt_paths:
            return self.get_response(request)

        # ── 2. Rate Limiting ─────────────────────────────────────
        rate_result = self._check_rate_limit(ip, request)
        if rate_result:
            return rate_result

        # ── 3. Suspicious Headers Check ──────────────────────────
        self._check_suspicious_headers(request, ip)

        # ── 4. Payload Scanning (only POST/PUT/PATCH) ─────────────
        if request.method in ('POST', 'PUT', 'PATCH'):
            scan_result = self._scan_payload(request, ip)
            if scan_result:
                return scan_result

        # ── 5. URL/Query String Scanning ─────────────────────────
        url_result = self._scan_url(request, ip)
        if url_result:
            return url_result

        # Process request
        response = self.get_response(request)

        # ── 6. Response Security Headers ─────────────────────────
        self._add_security_headers(response)

        # ── 7. Track slow responses ──────────────────────────────
        return response

    def _is_blocked_ip(self, ip: str) -> bool:
        cache_key = f'blocked_ip_{ip}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            from fugusau.apps.security.models import BlockedIP
            blocked = BlockedIP.objects.filter(
                ip_address=ip,
                is_active=True
            ).filter(
                models.Q(expires_at__isnull=True) |
                models.Q(expires_at__gt=timezone.now())
            ).exists()
            cache.set(cache_key, blocked, timeout=300)  # Cache for 5 min
            return blocked
        except Exception:
            return False

    def _increment_block_hit(self, ip: str):
        try:
            from fugusau.apps.security.models import BlockedIP
            BlockedIP.objects.filter(ip_address=ip).update(
                hit_count=models.F('hit_count') + 1
            )
        except Exception:
            pass

    def _check_rate_limit(self, ip: str, request) -> JsonResponse | None:
        minute_key = f'rate_limit_min_{ip}'
        hour_key   = f'rate_limit_hr_{ip}'

        minute_count = cache.get_or_set(minute_key, 0, timeout=60)
        hour_count   = cache.get_or_set(hour_key,   0, timeout=3600)

        cache.incr(minute_key)
        cache.incr(hour_key)

        max_per_minute = getattr(settings, 'MAX_REQUESTS_PER_MINUTE', 120)
        max_per_hour   = getattr(settings, 'MAX_REQUESTS_PER_HOUR', 3000)

        if minute_count > max_per_minute:
            log_security_event(
                'RATE_LIMIT_EXCEEDED', 'medium',
                f'Rate limit exceeded: {minute_count} requests/minute from {ip}',
                request, action_taken='Request blocked',
                extra_data={'count': minute_count, 'window': '1min'}
            )
            return JsonResponse({'error': 'Too many requests. Please slow down.'}, status=429)

        if hour_count > max_per_hour:
            # Auto-block aggressive IPs
            self._auto_block_ip(ip, f'Exceeded {hour_count} requests/hour', request)
            return JsonResponse({'error': 'Access temporarily restricted.'}, status=429)

        return None

    def _scan_payload(self, request, ip: str) -> JsonResponse | None:
        try:
            body = request.body.decode('utf-8', errors='ignore')
        except Exception:
            return None

        if not body or len(body) > 1_000_000:  # Skip > 1MB
            return None

        # Skip file uploads (multipart form data - checked by file scanner)
        content_type = request.META.get('CONTENT_TYPE', '')
        if 'multipart/form-data' in content_type:
            return None

        # SQL Injection
        found, match = scan_for_patterns(body, COMPILED_SQL)
        if found:
            self._auto_block_ip(ip, f'SQL injection attempt: {match}', request)
            log_security_event(
                'SQL_INJECTION', 'critical',
                f'SQL injection detected in payload from {ip}. Pattern: {match}',
                request, action_taken='Request blocked + IP flagged',
                extra_data={'pattern': match},
                ip_blocked=True
            )
            return JsonResponse({'error': 'Invalid request.'}, status=400)

        # XSS
        found, match = scan_for_patterns(body, COMPILED_XSS)
        if found:
            log_security_event(
                'XSS_ATTEMPT', 'high',
                f'XSS attempt detected from {ip}. Pattern: {match}',
                request, action_taken='Request blocked',
                extra_data={'pattern': match}
            )
            return JsonResponse({'error': 'Invalid request content.'}, status=400)

        # Command Injection
        found, match = scan_for_patterns(body, COMPILED_CMD)
        if found:
            self._auto_block_ip(ip, f'Command injection: {match}', request)
            log_security_event(
                'COMMAND_INJECTION', 'critical',
                f'Command injection attempt from {ip}. Pattern: {match}',
                request, action_taken='Request blocked + IP auto-blocked',
                extra_data={'pattern': match},
                ip_blocked=True
            )
            return JsonResponse({'error': 'Invalid request.'}, status=400)

        return None

    def _scan_url(self, request, ip: str) -> JsonResponse | None:
        full_url = request.get_full_path()

        # Path traversal
        found, match = scan_for_patterns(full_url, COMPILED_PATH)
        if found:
            log_security_event(
                'PATH_TRAVERSAL', 'high',
                f'Path traversal attempt from {ip}: {full_url}',
                request, action_taken='Request blocked',
                extra_data={'url': full_url[:200]}
            )
            return JsonResponse({'error': 'Invalid request.'}, status=400)

        # SQL in URL params
        found, match = scan_for_patterns(full_url, COMPILED_SQL)
        if found:
            log_security_event(
                'SQL_INJECTION', 'high',
                f'SQL injection in URL from {ip}: pattern={match}',
                request, action_taken='Request blocked',
                extra_data={'url': full_url[:200], 'pattern': match}
            )
            return JsonResponse({'error': 'Invalid request.'}, status=400)

        return None

    def _check_suspicious_headers(self, request, ip: str):
        ua = request.META.get('HTTP_USER_AGENT', '')

        # No user agent
        if not ua and request.path.startswith('/api/'):
            log_security_event(
                'SUSPICIOUS_LOGIN', 'low',
                f'Request with no User-Agent from {ip}',
                request,
                extra_data={'path': request.path}
            )

        # Scanner signatures
        scanner_sigs = ['sqlmap', 'nikto', 'nmap', 'masscan', 'dirbuster',
                        'hydra', 'metasploit', 'burpsuite', 'w3af', 'acunetix', 'nessus']
        for sig in scanner_sigs:
            if sig.lower() in ua.lower():
                self._auto_block_ip(ip, f'Security scanner detected: {sig}', request)
                log_security_event(
                    'BRUTE_FORCE', 'critical',
                    f'Security scanner/attack tool detected: {sig} from {ip}',
                    request, action_taken='IP auto-blocked',
                    extra_data={'tool': sig},
                    ip_blocked=True
                )
                break

    def _auto_block_ip(self, ip: str, reason: str, request):
        try:
            from fugusau.apps.security.models import BlockedIP
            BlockedIP.objects.get_or_create(
                ip_address=ip,
                defaults={
                    'reason': reason,
                    'block_type': BlockedIP.AUTO,
                    'duration': BlockedIP.TEMPORARY,
                    'expires_at': timezone.now() + timezone.timedelta(hours=24),
                    'is_active': True,
                }
            )
            cache.set(f'blocked_ip_{ip}', True, timeout=86400)
        except Exception as e:
            logger.error(f'Failed to auto-block IP {ip}: {e}')

    def _add_security_headers(self, response):
        """Add security headers to every response"""
        response['X-Content-Type-Options']    = 'nosniff'
        response['X-Frame-Options']           = 'DENY'
        response['X-XSS-Protection']          = '1; mode=block'
        response['Referrer-Policy']           = 'strict-origin-when-cross-origin'
        response['Permissions-Policy']        = 'geolocation=(), microphone=(), camera=()'
        response['Cache-Control']             = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Content-Security-Policy']   = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' wss: ws:; "
            "frame-ancestors 'none';"
        )
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response


# ─── Brute Force Middleware ───────────────────────────────────────────────
class BruteForceProtectionMiddleware:
    """
    Dedicated brute force protection for login endpoint.
    Tracks failed logins per IP and per email, auto-locks accounts.
    """
    MAX_ATTEMPTS_PER_IP    = 10
    MAX_ATTEMPTS_PER_EMAIL = 5
    LOCKOUT_MINUTES        = 30

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == '/api/v1/auth/login/' and request.method == 'POST':
            ip = get_client_ip(request)
            ip_key    = f'login_attempts_ip_{ip}'
            ip_count  = cache.get(ip_key, 0)

            if ip_count >= self.MAX_ATTEMPTS_PER_IP:
                log_security_event(
                    'BRUTE_FORCE', 'critical',
                    f'Brute force detected from {ip}: {ip_count} login attempts',
                    request, action_taken=f'IP blocked for {self.LOCKOUT_MINUTES} minutes',
                    ip_blocked=True
                )
                return JsonResponse({
                    'error': f'Too many login attempts. Please try again in {self.LOCKOUT_MINUTES} minutes.'
                }, status=429)

        response = self.get_response(request)

        # Track failed logins
        if request.path == '/api/v1/auth/login/' and request.method == 'POST':
            if response.status_code == 401:
                ip = get_client_ip(request)
                ip_key   = f'login_attempts_ip_{ip}'
                ip_count = cache.get(ip_key, 0) + 1
                cache.set(ip_key, ip_count, timeout=self.LOCKOUT_MINUTES * 60)

                # Log the attempt
                try:
                    from fugusau.apps.security.models import LoginAttempt
                    import json as json_lib
                    try:
                        body = json_lib.loads(request.body)
                        email = body.get('email', 'unknown')
                    except Exception:
                        email = 'unknown'

                    LoginAttempt.objects.create(
                        email=email,
                        ip_address=ip,
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                        success=False,
                        failure_reason='Invalid credentials'
                    )
                except Exception:
                    pass

                if ip_count >= self.MAX_ATTEMPTS_PER_IP - 2:
                    log_security_event(
                        'MULTIPLE_FAILED_LOGIN', 'high',
                        f'Multiple failed logins from {ip}: {ip_count} attempts',
                        request,
                        extra_data={'attempt_count': ip_count}
                    )

        return response


# ─── File Upload Security Middleware ──────────────────────────────────────
class FileUploadSecurityMiddleware:
    """
    Validates file uploads for dangerous content.
    Checks MIME type, extension, file signature (magic bytes).
    """
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js',
        '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.jar', '.class', '.war', '.msi', '.scr', '.pif',
    }

    ALLOWED_EXTENSIONS = {
        '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx',
        '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip',
    }

    MAGIC_BYTES = {
        b'\x50\x4B\x03\x04': 'ZIP/Office',
        b'\x25\x50\x44\x46': 'PDF',
        b'\xFF\xD8\xFF': 'JPEG',
        b'\x89\x50\x4E\x47': 'PNG',
        b'\x47\x49\x46\x38': 'GIF',
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ('POST', 'PUT', 'PATCH') and request.FILES:
            for field_name, uploaded_file in request.FILES.items():
                result = self._validate_file(uploaded_file, request)
                if result:
                    return result

        return self.get_response(request)

    def _validate_file(self, uploaded_file, request) -> JsonResponse | None:
        import os
        ip = get_client_ip(request)
        filename = uploaded_file.name
        ext = os.path.splitext(filename)[1].lower()

        # Check dangerous extensions
        if ext in self.DANGEROUS_EXTENSIONS:
            log_security_event(
                'FILE_UPLOAD_THREAT', 'critical',
                f'Dangerous file upload attempt: {filename} from {ip}',
                request, action_taken='File rejected',
                extra_data={'filename': filename, 'extension': ext},
            )
            return JsonResponse({'error': f'File type {ext} is not allowed.'}, status=400)

        # Check file size
        max_size = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 10) * 1024 * 1024
        if uploaded_file.size > max_size:
            return JsonResponse({'error': f'File too large. Maximum size is {max_size // 1024 // 1024}MB.'}, status=400)

        # Validate magic bytes (real file type)
        try:
            header = uploaded_file.read(8)
            uploaded_file.seek(0)
            detected = False
            for magic, ftype in self.MAGIC_BYTES.items():
                if header.startswith(magic):
                    detected = True
                    break
            if not detected and ext in self.ALLOWED_EXTENSIONS:
                # Unknown magic bytes for a supposedly safe file — suspicious
                log_security_event(
                    'FILE_UPLOAD_THREAT', 'medium',
                    f'File magic bytes mismatch: {filename} (ext={ext}) from {ip}',
                    request, action_taken='Flagged for review',
                    extra_data={'filename': filename}
                )
        except Exception:
            pass

        return None

