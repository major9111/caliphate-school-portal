"""
FUGUSAU Portal — Advanced IP Management
Covers all 6 IP management gaps:
  1. AbuseIPDB / VirusTotal reputation import
  2. CIDR / IPv6 range blocking
  3. Country-level geo-fencing
  4. IP reputation score (0-100) + adaptive throttling
  5. Unblock appeal flow for false positives
  6. Campus allowlist (bypass brute-force limits)

Drop-in location: fugusau/apps/security/ip_management.py
Wire up the views to security/urls.py (see bottom of file).
Add ABUSEIPDB_API_KEY and VIRUSTOTAL_API_KEY to your .env.
"""
import ipaddress
import logging
import requests
from datetime import timedelta

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.db import models
from django.contrib.auth import get_user_model

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from fugusau.apps.security.models import BlockedIP, SecurityEvent
from fugusau.apps.permissions import IsAdmin

logger = logging.getLogger('fugusau.security.ip')
User = get_user_model()

# ─── Constants ────────────────────────────────────────────────────────────────

ABUSEIPDB_API_KEY  = getattr(settings, 'ABUSEIPDB_API_KEY', '')
VIRUSTOTAL_API_KEY = getattr(settings, 'VIRUSTOTAL_API_KEY', '')

# Nigerian university campus ranges — add real CIDR blocks here
CAMPUS_ALLOWLIST_CIDRS = getattr(settings, 'CAMPUS_ALLOWLIST_CIDRS', [
    '197.210.64.0/18',   # Example: FUGUSAU campus ISP range — replace with real one
    '10.0.0.0/8',        # Internal Docker / VPN
    '127.0.0.0/8',       # Localhost
])

# Countries to allow; everyone else is flagged (not hard-blocked by default)
ALLOWED_COUNTRIES = getattr(settings, 'ALLOWED_COUNTRIES', ['Nigeria'])

# Score thresholds
SCORE_THRESHOLD_BLOCK    = 75   # auto-block at this score
SCORE_THRESHOLD_THROTTLE = 40   # adaptive throttle above this


# ─── Models Additions ─────────────────────────────────────────────────────────
# These are added via a migration; shown here for clarity.
# Migration: add IPReputationScore, CIDRBlock, UnblockAppeal models.

class IPReputationScore(models.Model):
    """Cached reputation data for an IP (refreshed daily)."""
    ip_address    = models.GenericIPAddressField(unique=True, db_index=True)
    score         = models.IntegerField(default=0, help_text='0=clean, 100=malicious')
    abuseipdb_score   = models.IntegerField(default=0)
    virustotal_score  = models.IntegerField(default=0)
    country       = models.CharField(max_length=100, blank=True)
    isp           = models.CharField(max_length=200, blank=True)
    is_vpn        = models.BooleanField(default=False)
    is_tor        = models.BooleanField(default=False)
    last_checked  = models.DateTimeField(auto_now=True)
    raw_data      = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'ip_reputation_scores'

    def __str__(self):
        return f'{self.ip_address} — score {self.score}'


class CIDRBlock(models.Model):
    """Block an entire subnet (IPv4 or IPv6 CIDR notation)."""
    cidr        = models.CharField(max_length=50, unique=True, help_text='e.g. 192.168.0.0/16')
    reason      = models.TextField()
    is_active   = models.BooleanField(default=True)
    blocked_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cidr_blocks'

    def __str__(self):
        return f'{self.cidr} ({"active" if self.is_active else "inactive"})'

    def contains(self, ip: str) -> bool:
        try:
            return ipaddress.ip_address(ip) in ipaddress.ip_network(self.cidr, strict=False)
        except ValueError:
            return False


class UnblockAppeal(models.Model):
    """False-positive appeal from a blocked user/IP."""
    PENDING  = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    STATUS_CHOICES = [(PENDING,'Pending'),(APPROVED,'Approved'),(REJECTED,'Rejected')]

    blocked_ip  = models.ForeignKey(BlockedIP, on_delete=models.CASCADE, related_name='appeals')
    email       = models.EmailField(help_text='Contact email of the person appealing')
    reason      = models.TextField()
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_appeals')
    reviewer_note = models.TextField(blank=True)
    submitted_at  = models.DateTimeField(auto_now_add=True)
    reviewed_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'unblock_appeals'
        ordering = ['-submitted_at']

    def __str__(self):
        return f'Appeal for {self.blocked_ip.ip_address} ({self.status})'


# ─── Helpers ──────────────────────────────────────────────────────────────────

def is_campus_ip(ip: str) -> bool:
    """Return True if the IP belongs to the campus/allowlist network."""
    cache_key = f'campus_ip_{ip}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        addr = ipaddress.ip_address(ip)
        for cidr in CAMPUS_ALLOWLIST_CIDRS:
            if addr in ipaddress.ip_network(cidr, strict=False):
                cache.set(cache_key, True, timeout=3600)
                return True
    except ValueError:
        pass

    cache.set(cache_key, False, timeout=3600)
    return False


def is_cidr_blocked(ip: str) -> bool:
    """Check if IP falls in any active CIDR block."""
    cache_key = f'cidr_blocked_{ip}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    for block in CIDRBlock.objects.filter(is_active=True):
        if block.contains(ip):
            cache.set(cache_key, True, timeout=300)
            return True

    cache.set(cache_key, False, timeout=300)
    return False


def get_ip_country(ip: str) -> str:
    """Return country name for IP using cached reputation data."""
    rep = IPReputationScore.objects.filter(ip_address=ip).first()
    if rep:
        return rep.country
    return ''


def is_geo_blocked(ip: str) -> bool:
    """Block if IP country is not in ALLOWED_COUNTRIES and geo-fencing is on."""
    if not getattr(settings, 'GEO_FENCING_ENABLED', False):
        return False
    if is_campus_ip(ip):
        return False
    country = get_ip_country(ip)
    if not country:
        return False  # Don't block if we can't determine country
    return country not in ALLOWED_COUNTRIES


def get_reputation_score(ip: str) -> int:
    """
    Return 0-100 reputation score from cache/DB.
    Higher = more malicious.
    """
    cache_key = f'ip_score_{ip}'
    score = cache.get(cache_key)
    if score is not None:
        return score

    rep = IPReputationScore.objects.filter(ip_address=ip).first()
    if rep:
        cache.set(cache_key, rep.score, timeout=3600)
        return rep.score

    return 0


def get_throttle_multiplier(ip: str) -> float:
    """
    Return a throttle multiplier (1.0 = normal, <1.0 = tighter limit).
    Used by middleware to adjust per-IP rate limits.
    """
    score = get_reputation_score(ip)
    if score >= SCORE_THRESHOLD_BLOCK:
        return 0.1     # 90% reduction
    if score >= SCORE_THRESHOLD_THROTTLE:
        return 0.5     # 50% reduction
    return 1.0


# ─── External Reputation Fetching ─────────────────────────────────────────────

def fetch_abuseipdb_score(ip: str) -> dict:
    """Query AbuseIPDB v2 API. Returns dict with score, country, isp, etc."""
    if not ABUSEIPDB_API_KEY:
        return {}
    try:
        resp = requests.get(
            'https://api.abuseipdb.com/api/v2/check',
            headers={'Key': ABUSEIPDB_API_KEY, 'Accept': 'application/json'},
            params={'ipAddress': ip, 'maxAgeInDays': 90, 'verbose': True},
            timeout=10,
        )
        if resp.status_code == 200:
            d = resp.json().get('data', {})
            return {
                'score': d.get('abuseConfidenceScore', 0),
                'country': d.get('countryName', ''),
                'isp': d.get('isp', ''),
                'is_tor': d.get('isTor', False),
                'total_reports': d.get('totalReports', 0),
            }
    except Exception as exc:
        logger.warning('AbuseIPDB check failed for %s: %s', ip, exc)
    return {}


def fetch_virustotal_score(ip: str) -> dict:
    """Query VirusTotal IP report. Returns dict with malicious count."""
    if not VIRUSTOTAL_API_KEY:
        return {}
    try:
        resp = requests.get(
            f'https://www.virustotal.com/api/v3/ip_addresses/{ip}',
            headers={'x-apikey': VIRUSTOTAL_API_KEY},
            timeout=10,
        )
        if resp.status_code == 200:
            stats = resp.json().get('data', {}).get('attributes', {}).get('last_analysis_stats', {})
            malicious = stats.get('malicious', 0)
            total = sum(stats.values()) or 1
            return {
                'score': int((malicious / total) * 100),
                'malicious': malicious,
                'total': total,
            }
    except Exception as exc:
        logger.warning('VirusTotal check failed for %s: %s', ip, exc)
    return {}


def enrich_ip_reputation(ip: str, force: bool = False) -> IPReputationScore:
    """
    Fetch and store/update reputation for an IP.
    Skips if checked within 24h (unless force=True).
    """
    rep, _ = IPReputationScore.objects.get_or_create(ip_address=ip)

    if not force and rep.last_checked and (timezone.now() - rep.last_checked).seconds < 86400:
        return rep

    abuse = fetch_abuseipdb_score(ip)
    vt    = fetch_virustotal_score(ip)

    rep.abuseipdb_score  = abuse.get('score', 0)
    rep.virustotal_score = vt.get('score', 0)
    rep.score = max(rep.abuseipdb_score, rep.virustotal_score)
    rep.country = abuse.get('country', rep.country)
    rep.isp     = abuse.get('isp', rep.isp)
    rep.is_tor  = abuse.get('is_tor', False)
    rep.raw_data = {'abuseipdb': abuse, 'virustotal': vt}
    rep.save()

    # Auto-block if score crosses threshold
    if rep.score >= SCORE_THRESHOLD_BLOCK and not BlockedIP.objects.filter(ip_address=ip, is_active=True).exists():
        BlockedIP.objects.create(
            ip_address=ip,
            reason=f'Auto-blocked: reputation score {rep.score}/100 (AbuseIPDB + VirusTotal)',
            block_type=BlockedIP.AUTO,
            duration=BlockedIP.TEMPORARY,
            expires_at=timezone.now() + timedelta(hours=48),
        )
        SecurityEvent.objects.create(
            event_type='SUSPICIOUS_LOGIN',
            threat_level='high',
            ip_address=ip,
            description=f'IP auto-blocked due to reputation score {rep.score}/100',
            action_taken='IP added to blocklist',
            ip_blocked=True,
        )
        logger.warning('Auto-blocked %s (score %s)', ip, rep.score)

    cache.set(f'ip_score_{ip}', rep.score, timeout=3600)
    return rep


# ─── API Views ────────────────────────────────────────────────────────────────

class IPReputationView(APIView):
    """GET /api/v1/security/ip/<ip>/reputation/ — Fetch/refresh IP reputation"""
    permission_classes = [IsAdmin]

    def get(self, request, ip):
        try:
            ipaddress.ip_address(ip)
        except ValueError:
            return Response({'error': 'Invalid IP address'}, status=400)

        force = request.query_params.get('refresh', 'false').lower() == 'true'
        rep = enrich_ip_reputation(ip, force=force)
        return Response({
            'ip_address': rep.ip_address,
            'score': rep.score,
            'abuseipdb_score': rep.abuseipdb_score,
            'virustotal_score': rep.virustotal_score,
            'country': rep.country,
            'isp': rep.isp,
            'is_tor': rep.is_tor,
            'is_vpn': rep.is_vpn,
            'last_checked': rep.last_checked,
            'is_campus': is_campus_ip(ip),
            'is_geo_blocked': is_geo_blocked(ip),
            'throttle_multiplier': get_throttle_multiplier(ip),
        })


class CIDRBlockListView(APIView):
    """
    GET  /api/v1/security/cidr/ — List active CIDR blocks
    POST /api/v1/security/cidr/ — Add a new CIDR block
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        blocks = CIDRBlock.objects.filter(is_active=True).values(
            'id', 'cidr', 'reason', 'is_active', 'created_at'
        )
        return Response(list(blocks))

    def post(self, request):
        cidr   = request.data.get('cidr', '').strip()
        reason = request.data.get('reason', '').strip()
        if not cidr or not reason:
            return Response({'error': 'cidr and reason are required'}, status=400)
        try:
            ipaddress.ip_network(cidr, strict=False)
        except ValueError:
            return Response({'error': f'Invalid CIDR notation: {cidr}'}, status=400)

        block, created = CIDRBlock.objects.get_or_create(
            cidr=cidr,
            defaults={'reason': reason, 'blocked_by': request.user}
        )
        if not created:
            block.is_active = True
            block.reason = reason
            block.save()

        # Invalidate cache for any IPs we might have cached
        logger.info('CIDR block added: %s by %s', cidr, request.user.email)
        return Response({'id': str(block.id), 'cidr': block.cidr, 'created': created}, status=201)

    def delete(self, request, cidr_id):
        try:
            block = CIDRBlock.objects.get(id=cidr_id)
            block.is_active = False
            block.save()
            return Response({'detail': 'CIDR block deactivated'})
        except CIDRBlock.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class UnblockAppealView(APIView):
    """
    POST /api/v1/security/appeal/         — Submit an unblock appeal (no auth required)
    GET  /api/v1/security/appeals/        — List pending appeals (admin only)
    POST /api/v1/security/appeals/<id>/review/ — Approve or reject (admin only)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ip     = request.META.get('REMOTE_ADDR', '')
        email  = request.data.get('email', '').strip()
        reason = request.data.get('reason', '').strip()

        if not email or not reason:
            return Response({'error': 'email and reason are required'}, status=400)

        blocked = BlockedIP.objects.filter(ip_address=ip, is_active=True).first()
        if not blocked:
            return Response({'error': 'Your IP is not currently blocked.'}, status=400)

        if UnblockAppeal.objects.filter(blocked_ip=blocked, status='pending').exists():
            return Response({'detail': 'An appeal for this IP is already pending review.'})

        appeal = UnblockAppeal.objects.create(blocked_ip=blocked, email=email, reason=reason)
        return Response({
            'detail': 'Your appeal has been submitted. You will be contacted at the email provided.',
            'appeal_id': str(appeal.id),
        }, status=201)


class UnblockAppealListView(APIView):
    """Admin: list + review appeals."""
    permission_classes = [IsAdmin]

    def get(self, request):
        appeals = UnblockAppeal.objects.select_related('blocked_ip', 'reviewed_by').all()
        status_filter = request.query_params.get('status')
        if status_filter:
            appeals = appeals.filter(status=status_filter)
        data = [
            {
                'id': str(a.id),
                'ip': a.blocked_ip.ip_address,
                'email': a.email,
                'reason': a.reason,
                'status': a.status,
                'submitted_at': a.submitted_at,
            }
            for a in appeals
        ]
        return Response(data)


class UnblockAppealReviewView(APIView):
    """POST /api/v1/security/appeals/<id>/review/"""
    permission_classes = [IsAdmin]

    def post(self, request, appeal_id):
        try:
            appeal = UnblockAppeal.objects.get(id=appeal_id)
        except UnblockAppeal.DoesNotExist:
            return Response({'error': 'Appeal not found'}, status=404)

        decision = request.data.get('decision')  # 'approved' or 'rejected'
        note     = request.data.get('note', '')

        if decision not in ('approved', 'rejected'):
            return Response({'error': 'decision must be approved or rejected'}, status=400)

        appeal.status       = decision
        appeal.reviewer_note = note
        appeal.reviewed_by  = request.user
        appeal.reviewed_at  = timezone.now()
        appeal.save()

        if decision == 'approved':
            # Unblock the IP
            appeal.blocked_ip.is_active = False
            appeal.blocked_ip.save()
            cache.delete(f'blocked_ip_{appeal.blocked_ip.ip_address}')
            cache.delete(f'cidr_blocked_{appeal.blocked_ip.ip_address}')
            logger.info('Unblock appeal approved for %s by %s', appeal.blocked_ip.ip_address, request.user.email)

        return Response({'detail': f'Appeal {decision}.', 'appeal_id': str(appeal.id)})


class CampusAllowlistView(APIView):
    """GET /api/v1/security/allowlist/ — View campus CIDR ranges (admin)"""
    permission_classes = [IsAdmin]

    def get(self, request):
        ip = request.query_params.get('check_ip')
        data = {
            'campus_cidrs': CAMPUS_ALLOWLIST_CIDRS,
            'allowed_countries': ALLOWED_COUNTRIES,
            'geo_fencing_enabled': getattr(settings, 'GEO_FENCING_ENABLED', False),
        }
        if ip:
            data['ip_check'] = {
                'ip': ip,
                'is_campus': is_campus_ip(ip),
                'is_geo_blocked': is_geo_blocked(ip),
            }
        return Response(data)


# ─── URL patterns (add to security/urls.py) ───────────────────────────────────
"""
from fugusau.apps.security.ip_management import (
    IPReputationView, CIDRBlockListView, UnblockAppealView,
    UnblockAppealListView, UnblockAppealReviewView, CampusAllowlistView,
)

urlpatterns += [
    path('ip/<str:ip>/reputation/', IPReputationView.as_view()),
    path('cidr/', CIDRBlockListView.as_view()),
    path('cidr/<uuid:cidr_id>/', CIDRBlockListView.as_view()),
    path('appeal/', UnblockAppealView.as_view()),
    path('appeals/', UnblockAppealListView.as_view()),
    path('appeals/<uuid:appeal_id>/review/', UnblockAppealReviewView.as_view()),
    path('allowlist/', CampusAllowlistView.as_view()),
]
"""
