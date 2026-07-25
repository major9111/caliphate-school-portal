"""
FUGUSAU Portal — Security App Models
Tracks attacks, suspicious activity, sessions, and security events
"""
import uuid
from django.conf import settings
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class ThreatLevel:
    LOW      = 'low'
    MEDIUM   = 'medium'
    HIGH     = 'high'
    CRITICAL = 'critical'
    CHOICES  = [(LOW,'Low'),(MEDIUM,'Medium'),(HIGH,'High'),(CRITICAL,'Critical')]


# ─── Security Event Log ───────────────────────────────────────────────────
class SecurityEvent(models.Model):
    # Event types
    BRUTE_FORCE         = 'BRUTE_FORCE'
    SQL_INJECTION       = 'SQL_INJECTION'
    XSS_ATTEMPT         = 'XSS_ATTEMPT'
    CSRF_VIOLATION      = 'CSRF_VIOLATION'
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS'
    PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION'
    SUSPICIOUS_LOGIN    = 'SUSPICIOUS_LOGIN'
    MULTIPLE_FAILED_LOGIN = 'MULTIPLE_FAILED_LOGIN'
    UNUSUAL_LOCATION    = 'UNUSUAL_LOCATION'
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
    FILE_UPLOAD_THREAT  = 'FILE_UPLOAD_THREAT'
    PATH_TRAVERSAL      = 'PATH_TRAVERSAL'
    COMMAND_INJECTION   = 'COMMAND_INJECTION'
    DATA_EXFILTRATION   = 'DATA_EXFILTRATION'
    ACCOUNT_LOCKOUT     = 'ACCOUNT_LOCKOUT'
    SESSION_HIJACKING   = 'SESSION_HIJACKING'
    DOS_ATTACK          = 'DOS_ATTACK'
    MALICIOUS_FILE      = 'MALICIOUS_FILE'
    PERMISSION_DENIED   = 'PERMISSION_DENIED'
    INFO                = 'INFO'

    EVENT_TYPE_CHOICES = [
        (BRUTE_FORCE, 'Brute Force Attack'),
        (SQL_INJECTION, 'SQL Injection Attempt'),
        (XSS_ATTEMPT, 'XSS Attempt'),
        (CSRF_VIOLATION, 'CSRF Violation'),
        (UNAUTHORIZED_ACCESS, 'Unauthorized Access'),
        (PRIVILEGE_ESCALATION, 'Privilege Escalation Attempt'),
        (SUSPICIOUS_LOGIN, 'Suspicious Login'),
        (MULTIPLE_FAILED_LOGIN, 'Multiple Failed Logins'),
        (UNUSUAL_LOCATION, 'Unusual Location Login'),
        (RATE_LIMIT_EXCEEDED, 'Rate Limit Exceeded'),
        (FILE_UPLOAD_THREAT, 'Malicious File Upload Attempt'),
        (PATH_TRAVERSAL, 'Path Traversal Attempt'),
        (COMMAND_INJECTION, 'Command Injection Attempt'),
        (DATA_EXFILTRATION, 'Possible Data Exfiltration'),
        (ACCOUNT_LOCKOUT, 'Account Locked Out'),
        (SESSION_HIJACKING, 'Session Hijacking Attempt'),
        (DOS_ATTACK, 'DoS/DDoS Attack'),
        (MALICIOUS_FILE, 'Malicious File Detected'),
        (PERMISSION_DENIED, 'Permission Denied'),
        (INFO, 'Information'),
    ]

    OPEN       = 'open'
    REVIEWING  = 'reviewing'
    RESOLVED   = 'resolved'
    FALSE_POS  = 'false_positive'
    STATUS_CHOICES = [(OPEN,'Open'),(REVIEWING,'Reviewing'),(RESOLVED,'Resolved'),(FALSE_POS,'False Positive')]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type     = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    threat_level   = models.CharField(max_length=10, choices=ThreatLevel.CHOICES, default=ThreatLevel.LOW)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=OPEN)

    # Who/where
    user           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_events')
    ip_address     = models.GenericIPAddressField(blank=True, null=True)
    user_agent     = models.TextField(blank=True)
    request_path   = models.CharField(max_length=500, blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    country        = models.CharField(max_length=100, blank=True)
    city           = models.CharField(max_length=100, blank=True)

    # Details
    description    = models.TextField()
    raw_payload    = models.TextField(blank=True, help_text='Sanitized request payload')
    extra_data     = models.JSONField(default=dict, blank=True)

    # Response
    action_taken   = models.TextField(blank=True)
    resolved_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_events')
    resolved_at    = models.DateTimeField(blank=True, null=True)
    analyst_notes  = models.TextField(blank=True)

    # Auto-response
    ip_blocked     = models.BooleanField(default=False)
    user_locked    = models.BooleanField(default=False)

    timestamp      = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ip_address']),
            models.Index(fields=['event_type']),
            models.Index(fields=['threat_level']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'[{self.threat_level.upper()}] {self.event_type} — {self.ip_address} @ {self.timestamp}'


# ─── Blocked IPs ──────────────────────────────────────────────────────────
class BlockedIP(models.Model):
    MANUAL    = 'manual'
    AUTO      = 'auto'
    TEMPORARY = 'temporary'
    PERMANENT = 'permanent'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ip_address  = models.GenericIPAddressField(unique=True)
    reason      = models.TextField()
    block_type  = models.CharField(max_length=10, choices=[(MANUAL,'Manual'),(AUTO,'Auto-blocked')], default=AUTO)
    duration    = models.CharField(max_length=10, choices=[(TEMPORARY,'Temporary'),(PERMANENT,'Permanent')], default=TEMPORARY)
    blocked_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    blocked_at  = models.DateTimeField(auto_now_add=True)
    expires_at  = models.DateTimeField(blank=True, null=True)
    is_active   = models.BooleanField(default=True)
    hit_count   = models.IntegerField(default=0, help_text='How many times this IP tried after being blocked')

    class Meta:
        db_table = 'blocked_ips'
        ordering = ['-blocked_at']

    def __str__(self):
        return f'{self.ip_address} — {"ACTIVE" if self.is_active else "EXPIRED"}'


# ─── Active Sessions ──────────────────────────────────────────────────────
class UserSession(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tracked_sessions')
    session_key  = models.CharField(max_length=100, unique=True)
    ip_address   = models.GenericIPAddressField()
    user_agent   = models.TextField(blank=True)
    device_type  = models.CharField(max_length=50, blank=True)
    browser      = models.CharField(max_length=100, blank=True)
    os           = models.CharField(max_length=100, blank=True)
    country      = models.CharField(max_length=100, blank=True)
    city         = models.CharField(max_length=100, blank=True)
    is_active    = models.BooleanField(default=True)
    is_suspicious = models.BooleanField(default=False)
    login_at     = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    logout_at    = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'user_sessions'
        ordering = ['-login_at']

    def __str__(self):
        return f'{self.user.email} — {self.ip_address} ({self.device_type})'


# ─── Login Attempts Tracker ───────────────────────────────────────────────
class LoginAttempt(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email        = models.EmailField(db_index=True)
    ip_address   = models.GenericIPAddressField(db_index=True)
    user_agent   = models.TextField(blank=True)
    success      = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=200, blank=True)
    timestamp    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'login_attempts'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['email', 'timestamp']),
        ]


# ─── Security Rules / Policies ────────────────────────────────────────────
class SecurityPolicy(models.Model):
    id                     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                   = models.CharField(max_length=200, unique=True)
    description            = models.TextField(blank=True)
    is_enabled             = models.BooleanField(default=True)

    # Brute force settings
    max_login_attempts     = models.IntegerField(default=5)
    lockout_duration_minutes = models.IntegerField(default=30)

    # Rate limiting
    max_requests_per_minute = models.IntegerField(default=60)
    max_requests_per_hour   = models.IntegerField(default=1000)

    # Session settings
    session_timeout_minutes  = models.IntegerField(default=60)
    max_sessions_per_user    = models.IntegerField(default=3)

    # File upload settings
    allowed_file_extensions  = models.JSONField(default=list)
    max_file_size_mb         = models.IntegerField(default=10)
    scan_uploads_for_malware = models.BooleanField(default=True)

    # Auto-block settings
    auto_block_on_brute_force = models.BooleanField(default=True)
    auto_block_on_sql_inject  = models.BooleanField(default=True)
    auto_block_on_xss         = models.BooleanField(default=True)
    notify_analyst_on_critical = models.BooleanField(default=True)

    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_policies'

    def __str__(self):
        return self.name


# ─── Security Analyst Profile ─────────────────────────────────────────────
class SecurityAnalystProfile(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='analyst_profile')
    analyst_id      = models.CharField(max_length=20, unique=True)
    clearance_level = models.IntegerField(default=1, help_text='1=Junior, 2=Senior, 3=Lead')
    can_block_ips   = models.BooleanField(default=True)
    can_lock_accounts = models.BooleanField(default=True)
    can_view_payloads = models.BooleanField(default=False, help_text='Can see raw attack payloads')
    on_duty         = models.BooleanField(default=False)
    alert_email     = models.EmailField(blank=True)
    alert_phone     = models.CharField(max_length=20, blank=True)
    assigned_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_analyst_profiles'

    def __str__(self):
        return f'Analyst {self.analyst_id} — {self.user.get_full_name()}'


# ─── System Health Monitor ────────────────────────────────────────────────
class SystemHealthSnapshot(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp           = models.DateTimeField(auto_now_add=True)
    active_users        = models.IntegerField(default=0)
    requests_per_minute = models.FloatField(default=0)
    error_rate          = models.FloatField(default=0, help_text='Percentage of 4xx/5xx responses')
    blocked_ips_count   = models.IntegerField(default=0)
    open_threats_count  = models.IntegerField(default=0)
    cpu_usage           = models.FloatField(default=0)
    memory_usage        = models.FloatField(default=0)
    db_connections      = models.IntegerField(default=0)
    avg_response_ms     = models.FloatField(default=0)

    class Meta:
        db_table = 'system_health_snapshots'
        ordering = ['-timestamp']


# ── Firewall Rules ────────────────────────────────────────────────────────────
class FirewallRule(models.Model):
    ALLOW  = 'allow'
    DENY   = 'deny'
    LOG    = 'log'
    ACTION_CHOICES = [(ALLOW,'Allow'),(DENY,'Deny'),(LOG,'Log Only')]
    PROTO_CHOICES  = [('tcp','TCP'),('udp','UDP'),('icmp','ICMP'),('any','Any')]
    DIR_CHOICES    = [('inbound','Inbound'),('outbound','Outbound'),('both','Both')]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    action      = models.CharField(max_length=10, choices=ACTION_CHOICES, default=DENY)
    protocol    = models.CharField(max_length=10, choices=PROTO_CHOICES, default='any')
    direction   = models.CharField(max_length=10, choices=DIR_CHOICES, default='inbound')
    source_ip   = models.CharField(max_length=50, blank=True)
    dest_ip     = models.CharField(max_length=50, blank=True)
    source_port = models.CharField(max_length=20, blank=True)
    dest_port   = models.CharField(max_length=20, blank=True)
    priority    = models.IntegerField(default=100)
    is_active   = models.BooleanField(default=True)
    hit_count   = models.BigIntegerField(default=0)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='firewall_rules'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_firewall_rules'
        ordering = ['priority', '-created_at']

    def __str__(self):
        return f'[{self.action.upper()}] {self.name}'
