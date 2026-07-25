"""
FUGUSAU Portal — Security Views
REST API endpoints consumed by the Security Analyst Dashboard
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from django.core.cache import cache
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    SecurityEvent, BlockedIP, UserSession, LoginAttempt,
    SecurityPolicy, SecurityAnalystProfile, SystemHealthSnapshot
)
from .serializers import (
    SecurityEventSerializer, BlockedIPSerializer, UserSessionSerializer,
    LoginAttemptSerializer, SecurityPolicySerializer, SystemHealthSerializer
)

logger = logging.getLogger('fugusau.security')


class IsSecurityAnalyst(permissions.BasePermission):
    """Only admins or users with analyst profile can access security endpoints"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        return hasattr(request.user, 'analyst_profile')


# ─── Dashboard Overview ───────────────────────────────────────────────────
class SecurityDashboardView(APIView):
    """GET /api/v1/security/dashboard/ — Full security overview"""
    permission_classes = [IsSecurityAnalyst]

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_1h  = now - timedelta(hours=1)
        last_7d  = now - timedelta(days=7)

        # Threat summary
        events_24h = SecurityEvent.objects.filter(timestamp__gte=last_24h)

        threat_summary = {
            'total_events_24h':    events_24h.count(),
            'critical_count':      events_24h.filter(threat_level='critical').count(),
            'high_count':          events_24h.filter(threat_level='high').count(),
            'medium_count':        events_24h.filter(threat_level='medium').count(),
            'low_count':           events_24h.filter(threat_level='low').count(),
            'open_threats':        SecurityEvent.objects.filter(status='open').count(),
            'blocked_ips':         BlockedIP.objects.filter(is_active=True).count(),
            'active_sessions':     UserSession.objects.filter(is_active=True).count(),
            'suspicious_sessions': UserSession.objects.filter(is_suspicious=True, is_active=True).count(),
            'failed_logins_1h':    LoginAttempt.objects.filter(timestamp__gte=last_1h, success=False).count(),
        }

        # Event type breakdown
        event_breakdown = list(
            events_24h.values('event_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Top attacking IPs
        top_attackers = list(
            events_24h.exclude(ip_address=None)
            .values('ip_address')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Recent critical events
        recent_critical = SecurityEventSerializer(
            SecurityEvent.objects.filter(
                threat_level__in=['critical', 'high'],
                timestamp__gte=last_24h
            ).order_by('-timestamp')[:10],
            many=True
        ).data

        # Threat trend (hourly for last 24 hours)
        from django.db.models.functions import TruncHour
        hourly_trend = list(
            SecurityEvent.objects.filter(timestamp__gte=last_24h)
            .annotate(hour=TruncHour('timestamp'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )

        # Login attempt stats
        login_stats = {
            'failed_24h':   LoginAttempt.objects.filter(timestamp__gte=last_24h, success=False).count(),
            'success_24h':  LoginAttempt.objects.filter(timestamp__gte=last_24h, success=True).count(),
            'unique_ips':   LoginAttempt.objects.filter(timestamp__gte=last_24h).values('ip_address').distinct().count(),
        }

        # System health (latest snapshot)
        latest_health = SystemHealthSnapshot.objects.order_by('-timestamp').first()

        return Response({
            'threat_summary':   threat_summary,
            'event_breakdown':  event_breakdown,
            'top_attackers':    top_attackers,
            'recent_critical':  recent_critical,
            'hourly_trend':     hourly_trend,
            'login_stats':      login_stats,
            'system_health':    SystemHealthSerializer(latest_health).data if latest_health else None,
            'generated_at':     now.isoformat(),
        })


# ─── Security Events ──────────────────────────────────────────────────────
class SecurityEventListView(generics.ListAPIView):
    """GET /api/v1/security/events/ — All security events with filtering"""
    serializer_class = SecurityEventSerializer
    permission_classes = [IsSecurityAnalyst]
    filterset_fields = ['event_type', 'threat_level', 'status', 'ip_blocked', 'user_locked']
    search_fields = ['ip_address', 'description', 'user__email']
    ordering_fields = ['timestamp', 'threat_level']
    ordering = ['-timestamp']

    def get_queryset(self):
        qs = SecurityEvent.objects.select_related('user', 'resolved_by')
        # Date filter
        days = self.request.query_params.get('days', 7)
        since = timezone.now() - timedelta(days=int(days))
        return qs.filter(timestamp__gte=since)


class SecurityEventDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/security/events/{id}/ — View/update an event"""
    serializer_class = SecurityEventSerializer
    permission_classes = [IsSecurityAnalyst]
    queryset = SecurityEvent.objects.all()

    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('analyst_notes', '')

        if new_status in (SecurityEvent.RESOLVED, SecurityEvent.FALSE_POS):
            event.resolved_by = request.user
            event.resolved_at = timezone.now()

        event.status = new_status or event.status
        event.analyst_notes = notes or event.analyst_notes
        event.save()

        logger.info(f'Analyst {request.user.email} updated event {event.id}: status={new_status}')
        return Response(SecurityEventSerializer(event).data)


# ─── IP Blocking ──────────────────────────────────────────────────────────
class BlockedIPListView(generics.ListCreateAPIView):
    """GET/POST /api/v1/security/blocked-ips/ — List or block an IP"""
    serializer_class = BlockedIPSerializer
    permission_classes = [IsSecurityAnalyst]

    def get_queryset(self):
        return BlockedIP.objects.filter(is_active=True).order_by('-blocked_at')

    def perform_create(self, serializer):
        ip = serializer.validated_data['ip_address']
        serializer.save(blocked_by=self.request.user)
        # Add to cache for instant effect
        cache.set(f'blocked_ip_{ip}', True, timeout=86400 * 30)
        logger.warning(f'Analyst {self.request.user.email} manually blocked IP: {ip}')


class UnblockIPView(APIView):
    """DELETE /api/v1/security/blocked-ips/{id}/unblock/ — Unblock an IP"""
    permission_classes = [IsSecurityAnalyst]

    def delete(self, request, pk):
        try:
            blocked = BlockedIP.objects.get(id=pk)
            ip = blocked.ip_address
            blocked.is_active = False
            blocked.save()
            cache.delete(f'blocked_ip_{ip}')
            logger.info(f'Analyst {request.user.email} unblocked IP: {ip}')
            return Response({'detail': f'IP {ip} unblocked successfully.'})
        except BlockedIP.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)


# ─── Active Sessions ──────────────────────────────────────────────────────
class ActiveSessionsView(generics.ListAPIView):
    """GET /api/v1/security/sessions/ — All active user sessions"""
    serializer_class = UserSessionSerializer
    permission_classes = [IsSecurityAnalyst]
    filterset_fields = ['is_suspicious', 'device_type']
    ordering = ['-login_at']

    def get_queryset(self):
        return UserSession.objects.filter(is_active=True).select_related('user')


class TerminateSessionView(APIView):
    """DELETE /api/v1/security/sessions/{id}/terminate/ — Force logout a session"""
    permission_classes = [IsSecurityAnalyst]

    def delete(self, request, pk):
        try:
            session = UserSession.objects.get(id=pk)
            session.is_active = False
            session.logout_at = timezone.now()
            session.save()

            # Blacklist their JWT tokens
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=session.user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)

            SecurityEvent.objects.create(
                event_type='SESSION_HIJACKING',
                threat_level='medium',
                description=f'Analyst {request.user.email} force-terminated session for {session.user.email}',
                user=session.user,
                ip_address=session.ip_address,
                action_taken='Session terminated by analyst',
                status=SecurityEvent.RESOLVED,
            )

            return Response({'detail': f'Session for {session.user.email} terminated.'})
        except UserSession.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)


# ─── Login Attempts ───────────────────────────────────────────────────────
class LoginAttemptListView(generics.ListAPIView):
    """GET /api/v1/security/login-attempts/ — Login attempt history"""
    serializer_class = LoginAttemptSerializer
    permission_classes = [IsSecurityAnalyst]
    filterset_fields = ['success', 'ip_address']
    ordering = ['-timestamp']

    def get_queryset(self):
        days = int(self.request.query_params.get('days', 1))
        since = timezone.now() - timedelta(days=days)
        return LoginAttempt.objects.filter(timestamp__gte=since)


# ─── Security Policy ──────────────────────────────────────────────────────
class SecurityPolicyView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/security/policy/ — View/update security settings"""
    serializer_class = SecurityPolicySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        policy, _ = SecurityPolicy.objects.get_or_create(
            name='Default Policy',
            defaults={
                'max_login_attempts': 5,
                'lockout_duration_minutes': 30,
                'max_requests_per_minute': 120,
                'max_requests_per_hour': 3000,
                'session_timeout_minutes': 60,
                'max_sessions_per_user': 3,
                'allowed_file_extensions': ['.pdf', '.jpg', '.jpeg', '.png', '.docx'],
                'max_file_size_mb': 10,
                'auto_block_on_brute_force': True,
                'auto_block_on_sql_inject': True,
                'auto_block_on_xss': True,
                'notify_analyst_on_critical': True,
            }
        )
        return policy

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ─── System Health ────────────────────────────────────────────────────────
class SystemHealthView(APIView):
    """GET /api/v1/security/health/ — Real-time system health snapshot"""
    permission_classes = [IsSecurityAnalyst]

    def get(self, request):
        import psutil
        try:
            cpu    = psutil.cpu_percent(interval=1)
            mem    = psutil.virtual_memory().percent
            disk   = psutil.disk_usage('/').percent
        except Exception:
            cpu = mem = disk = 0

        data = {
            'cpu_usage':        cpu,
            'memory_usage':     mem,
            'disk_usage':       disk,
            'active_users':     UserSession.objects.filter(is_active=True).count(),
            'blocked_ips':      BlockedIP.objects.filter(is_active=True).count(),
            'open_threats':     SecurityEvent.objects.filter(status='open').count(),
            'critical_threats': SecurityEvent.objects.filter(status='open', threat_level='critical').count(),
            'failed_logins_1h': LoginAttempt.objects.filter(
                timestamp__gte=timezone.now() - timedelta(hours=1), success=False
            ).count(),
            'timestamp': timezone.now().isoformat(),
        }
        return Response(data)


# ─── Security Statistics ──────────────────────────────────────────────────
class SecurityStatsView(APIView):
    """GET /api/v1/security/stats/ — 30-day security statistics"""
    permission_classes = [IsSecurityAnalyst]

    def get(self, request):
        from django.db.models.functions import TruncDate
        last_30d = timezone.now() - timedelta(days=30)

        daily_events = list(
            SecurityEvent.objects.filter(timestamp__gte=last_30d)
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(
                total=Count('id'),
                critical=Count('id', filter=Q(threat_level='critical')),
                high=Count('id', filter=Q(threat_level='high')),
            )
            .order_by('date')
        )

        top_event_types = list(
            SecurityEvent.objects.filter(timestamp__gte=last_30d)
            .values('event_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        top_countries = list(
            SecurityEvent.objects.filter(timestamp__gte=last_30d)
            .exclude(country='')
            .values('country')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        return Response({
            'daily_events':    daily_events,
            'top_event_types': top_event_types,
            'top_countries':   top_countries,
            'period':          '30 days',
        })
