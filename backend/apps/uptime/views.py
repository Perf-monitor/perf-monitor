import ssl
import socket
import logging
import requests
from datetime import datetime, timezone as dt_timezone, timedelta

from django.db.models import Avg, Q
from django.utils import timezone
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    MonitoredWebsite, MonitoringCheck, Incident,
    SSLCheck, SSLAlert, NotificationProvider,
)
from .serializers import (
    MonitoredWebsiteSerializer, MonitoredWebsiteCreateSerializer,
    MonitoringCheckSerializer, IncidentSerializer,
    SSLCheckSerializer, SSLAlertSerializer,
    NotificationProviderSerializer, UptimeDashboardSerializer,
)

logger = logging.getLogger(__name__)


def _website_qs(request):
    user = request.user
    if getattr(user, "is_admin", False):
        return MonitoredWebsite.objects.all()
    return MonitoredWebsite.objects.filter(owner=user)


# ── Dashboard ─────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def uptime_dashboard(request):
    qs = _website_qs(request)
    total = qs.count()

    statuses = {}
    for w in qs.prefetch_related("checks"):
        statuses[w.id] = w.current_status

    up = sum(1 for s in statuses.values() if s == "up")
    down = sum(1 for s in statuses.values() if s == "down")

    active_incidents = Incident.objects.filter(
        website__in=qs, ended_at__isnull=True
    ).count()

    total_checks = MonitoringCheck.objects.filter(website__in=qs).count()
    up_checks = MonitoringCheck.objects.filter(website__in=qs, status="up").count()
    overall_uptime = round(up_checks / total_checks * 100, 2) if total_checks else 0.0

    avg_rt = MonitoringCheck.objects.filter(
        website__in=qs,
        status="up",
        response_time_ms__isnull=False,
        checked_at__gte=timezone.now() - timedelta(hours=24),
    ).aggregate(avg=Avg("response_time_ms"))["avg"] or 0.0

    ssl_qs = SSLCheck.objects.filter(website__in=qs)
    ssl_expiring = 0
    ssl_expired = 0
    ssl_invalid = 0
    seen_websites = set()
    for check in ssl_qs.order_by("website_id", "-checked_at"):
        if check.website_id in seen_websites:
            continue
        seen_websites.add(check.website_id)
        if check.cert_status == "expiring_soon":
            ssl_expiring += 1
        elif check.cert_status == "expired":
            ssl_expired += 1
        elif check.cert_status in ("invalid", "hostname_mismatch", "handshake_failed"):
            ssl_invalid += 1

    return Response({
        "total_websites": total,
        "websites_up": up,
        "websites_down": down,
        "active_incidents": active_incidents,
        "overall_uptime_pct": overall_uptime,
        "avg_response_time_ms": round(avg_rt, 2),
        "ssl_expiring_soon": ssl_expiring,
        "ssl_expired": ssl_expired,
        "ssl_invalid": ssl_invalid,
    })


# ── Websites CRUD ─────────────────────────────────────────────────────────────

class MonitoredWebsiteListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["active", "protocol", "check_interval"]
    search_fields = ["name", "url"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MonitoredWebsiteCreateSerializer
        return MonitoredWebsiteSerializer

    def get_queryset(self):
        return _website_qs(self.request).prefetch_related("checks", "ssl_checks", "incidents")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(owner=request.user)
        out = MonitoredWebsiteSerializer(instance)
        return Response(out.data, status=status.HTTP_201_CREATED)


class MonitoredWebsiteDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MonitoredWebsiteCreateSerializer
        return MonitoredWebsiteSerializer

    def get_queryset(self):
        return _website_qs(self.request).prefetch_related("checks", "ssl_checks", "incidents")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        out = MonitoredWebsiteSerializer(instance)
        return Response(out.data)


# ── Manual check trigger ──────────────────────────────────────────────────────

def _perform_check(website: MonitoredWebsite) -> MonitoringCheck:
    try:
        resp = requests.get(
            website.url,
            timeout=website.timeout_seconds,
            allow_redirects=True,
            verify=website.verify_ssl,
            headers={"User-Agent": "PerfMonitor-UptimeBot/1.0"},
        )
        rt = resp.elapsed.total_seconds() * 1000
        ok = resp.status_code == website.expected_status_code
        if ok and website.keyword_check:
            ok = website.keyword_check in resp.text
        check_status = MonitoringCheck.Status.UP if ok else MonitoringCheck.Status.DOWN
        check = MonitoringCheck.objects.create(
            website=website,
            status=check_status,
            response_time_ms=rt,
            http_status_code=resp.status_code,
            error_message="" if ok else f"Expected {website.expected_status_code}, got {resp.status_code}",
        )
    except requests.Timeout:
        check = MonitoringCheck.objects.create(
            website=website, status=MonitoringCheck.Status.TIMEOUT,
            error_message="Request timed out",
        )
    except Exception as exc:
        check = MonitoringCheck.objects.create(
            website=website, status=MonitoringCheck.Status.ERROR,
            error_message=str(exc)[:500],
        )

    _handle_incident(website, check)
    return check


def _extract_cert_details(hostname: str) -> dict:
    """
    Second-pass: connect without verification to read raw cert fields.
    Returns a dict with common_name, issuer, valid_from, valid_to, days_remaining.
    Returns empty dict if extraction itself fails.
    """
    try:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with ctx.wrap_socket(
            socket.create_connection((hostname, 443), timeout=10),
            server_hostname=hostname,
        ) as sock:
            cert = sock.getpeercert()

        if not cert:
            # DER binary fallback
            return {}

        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt_timezone.utc)
        not_before = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt_timezone.utc)
        days_remaining = (not_after - datetime.now(dt_timezone.utc)).days
        subject_dict = dict(x[0] for x in cert.get("subject", []))
        issuer_dict = dict(x[0] for x in cert.get("issuer", []))
        return {
            "common_name": subject_dict.get("commonName", ""),
            "issuer": issuer_dict.get("organizationName", "") or issuer_dict.get("commonName", ""),
            "valid_from": not_before,
            "valid_to": not_after,
            "days_remaining": days_remaining,
        }
    except Exception:
        return {}


def _perform_ssl_check(website: MonitoredWebsite) -> SSLCheck:
    if not website.ssl_monitoring or not website.url.startswith("https"):
        return SSLCheck.objects.create(
            website=website,
            cert_status=SSLCheck.CertStatus.DISABLED,
        )

    hostname = website.url.split("//")[1].split("/")[0].split(":")[0]

    # ── Pass 1: strict verification ───────────────────────────────────────────
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(
            socket.create_connection((hostname, 443), timeout=10),
            server_hostname=hostname,
        ) as sock:
            cert = sock.getpeercert()

        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt_timezone.utc)
        not_before = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt_timezone.utc)
        days_remaining = (not_after - datetime.now(dt_timezone.utc)).days
        subject_dict = dict(x[0] for x in cert.get("subject", []))
        issuer_dict = dict(x[0] for x in cert.get("issuer", []))
        common_name = subject_dict.get("commonName", "")
        issuer = issuer_dict.get("organizationName", "") or issuer_dict.get("commonName", "")

        if days_remaining < 0:
            cert_status = SSLCheck.CertStatus.EXPIRED
        elif days_remaining <= website.ssl_expiry_alert_days:
            cert_status = SSLCheck.CertStatus.EXPIRING_SOON
        else:
            cert_status = SSLCheck.CertStatus.HEALTHY

        ssl_check = SSLCheck.objects.create(
            website=website,
            cert_status=cert_status,
            issuer=issuer,
            common_name=common_name,
            valid_from=not_before,
            valid_to=not_after,
            days_remaining=days_remaining,
        )
        _handle_ssl_alert(website, ssl_check)
        return ssl_check

    except ssl.SSLCertVerificationError as exc:
        # ── Pass 2: extract cert metadata despite verification failure ────────
        error_msg = str(exc)[:500]
        details = _extract_cert_details(hostname)

        # Classify more precisely when we have details
        if details:
            dr = details["days_remaining"]
            if dr < 0:
                cert_status = SSLCheck.CertStatus.EXPIRED
            elif "self-signed" in error_msg.lower() or "self signed" in error_msg.lower():
                cert_status = SSLCheck.CertStatus.INVALID
            elif "hostname" in error_msg.lower():
                cert_status = SSLCheck.CertStatus.HOSTNAME_MISMATCH
            else:
                cert_status = SSLCheck.CertStatus.INVALID
        else:
            cert_status = SSLCheck.CertStatus.INVALID

        ssl_check = SSLCheck.objects.create(
            website=website,
            cert_status=cert_status,
            issuer=details.get("issuer", ""),
            common_name=details.get("common_name", ""),
            valid_from=details.get("valid_from"),
            valid_to=details.get("valid_to"),
            days_remaining=details.get("days_remaining"),
            error_message=error_msg,
        )
        _handle_ssl_alert(website, ssl_check)
        return ssl_check

    except ssl.SSLError as exc:
        error_msg = str(exc)[:500]
        details = _extract_cert_details(hostname)
        ssl_check = SSLCheck.objects.create(
            website=website,
            cert_status=SSLCheck.CertStatus.HANDSHAKE_FAILED,
            issuer=details.get("issuer", ""),
            common_name=details.get("common_name", ""),
            valid_from=details.get("valid_from"),
            valid_to=details.get("valid_to"),
            days_remaining=details.get("days_remaining"),
            error_message=error_msg,
        )
        _handle_ssl_alert(website, ssl_check)
        return ssl_check

    except Exception as exc:
        return SSLCheck.objects.create(
            website=website,
            cert_status=SSLCheck.CertStatus.INVALID,
            error_message=str(exc)[:500],
        )


def _notify_providers(website: MonitoredWebsite, event: str, message: str):
    """Dispatch a notification to all enabled providers that subscribe to `event`."""
    providers = NotificationProvider.objects.filter(owner=website.owner, enabled=True)
    event_field_map = {
        "down":         "notify_on_down",
        "recovery":     "notify_on_recovery",
        "ssl_expiring": "notify_on_ssl_expiring",
        "ssl_expired":  "notify_on_ssl_expired",
        "ssl_invalid":  "notify_on_ssl_invalid",
    }
    field = event_field_map.get(event)
    if not field:
        return
    for provider in providers:
        if not getattr(provider, field, False):
            continue
        try:
            _dispatch_provider(provider, message)
        except Exception as exc:
            logger.warning("Notification failed for provider %s: %s", provider.name, exc)


def _build_slack_payload(message: str) -> dict:
    """Slack Block Kit payload — renders rich text with a coloured side bar."""
    # Determine colour from message content
    if "DOWN" in message or "Expired" in message or "Failed" in message or "Invalid" in message:
        color = "#E53E3E"   # red
    elif "Expiring" in message or "expiring" in message or "warning" in message.lower():
        color = "#DD6B20"   # orange
    elif "UP" in message or "back" in message or "Test" in message:
        color = "#38A169"   # green
    else:
        color = "#718096"   # grey

    lines = [l.strip() for l in message.splitlines() if l.strip()]
    title = lines[0] if lines else message
    body_lines = lines[1:] if len(lines) > 1 else []

    blocks = [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": title},
        }
    ]
    if body_lines:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n".join(body_lines)},
        })
    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": "PerfMonitor · Uptime Alerts"}],
    })

    return {
        "attachments": [
            {
                "color": color,
                "blocks": blocks,
                "fallback": title,
            }
        ]
    }


def _build_teams_payload(message: str) -> dict:
    """Teams Legacy Connector Card (MessageCard) — works with all Incoming Webhook URLs."""
    if "DOWN" in message or "Expired" in message or "Failed" in message or "Invalid" in message:
        theme_color = "E53E3E"
        title = "🔴 Downtime / Critical Alert"
    elif "Expiring" in message or "expiring" in message:
        theme_color = "DD6B20"
        title = "⚠️ SSL Warning"
    elif "back UP" in message or "Recovered" in message:
        theme_color = "38A169"
        title = "🟢 Site Recovered"
    elif "Test" in message:
        theme_color = "3182CE"
        title = "🧪 Test Notification"
    else:
        theme_color = "718096"
        title = "PerfMonitor Alert"

    lines = [l.strip() for l in message.splitlines() if l.strip()]
    facts = []
    for line in lines[1:]:
        if ":" in line:
            key, _, val = line.partition(":")
            facts.append({"name": key.strip().lstrip(":").strip(), "value": val.strip()})
        else:
            facts.append({"name": "Info", "value": line})

    sections = []
    if lines:
        sections.append({"activityText": lines[0]})
    if facts:
        sections.append({"facts": facts})

    return {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "themeColor": theme_color,
        "summary": title,
        "title": title,
        "sections": sections,
    }


def _build_discord_payload(message: str) -> dict:
    """Discord webhook embed payload."""
    if "DOWN" in message or "Expired" in message or "Failed" in message or "Invalid" in message:
        color = 0xE53E3E
    elif "Expiring" in message or "expiring" in message:
        color = 0xDD6B20
    elif "back UP" in message or "Recovered" in message:
        color = 0x38A169
    else:
        color = 0x718096

    lines = [l.strip() for l in message.splitlines() if l.strip()]
    title = lines[0] if lines else "PerfMonitor Alert"
    description = "\n".join(lines[1:]) if len(lines) > 1 else ""

    return {
        "embeds": [
            {
                "title": title,
                "description": description,
                "color": color,
                "footer": {"text": "PerfMonitor · Uptime Alerts"},
            }
        ]
    }


def _dispatch_provider(provider: NotificationProvider, message: str):
    config = provider.config or {}

    if provider.provider_type == "slack":
        webhook_url = config.get("webhook_url", "")
        if not webhook_url:
            return
        requests.post(webhook_url, json=_build_slack_payload(message), timeout=10)

    elif provider.provider_type == "teams":
        webhook_url = config.get("webhook_url", "")
        if not webhook_url:
            return
        requests.post(webhook_url, json=_build_teams_payload(message), timeout=10)

    elif provider.provider_type == "discord":
        webhook_url = config.get("webhook_url", "")
        if not webhook_url:
            return
        requests.post(webhook_url, json=_build_discord_payload(message), timeout=10)

    elif provider.provider_type == "webhook":
        webhook_url = config.get("webhook_url", "")
        if not webhook_url:
            return
        secret = config.get("secret", "")
        headers = {"Content-Type": "application/json"}
        if secret:
            import hmac
            import hashlib
            body = message.encode()
            sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
            headers["X-PerfMonitor-Signature"] = f"sha256={sig}"
        requests.post(webhook_url, json={"text": message, "source": "perfmonitor"}, headers=headers, timeout=10)

    elif provider.provider_type == "telegram":
        bot_token = config.get("bot_token", "")
        chat_id = config.get("chat_id", "")
        if not bot_token or not chat_id:
            return
        # Strip Slack-style emoji codes for Telegram plain text
        clean = message.replace(":red_circle:", "🔴").replace(":large_green_circle:", "🟢").replace(":warning:", "⚠️").replace(":test_tube:", "🧪")
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": clean, "parse_mode": "Markdown"},
            timeout=10,
        )

    elif provider.provider_type == "email":
        from django.core.mail import send_mail
        from django.conf import settings as dj_settings
        recipients = [r.strip() for r in config.get("recipients", "").split(",") if r.strip()]
        if not recipients:
            return
        # Plain-text version — strip Slack emoji codes
        plain = message.replace(":red_circle:", "").replace(":large_green_circle:", "").replace(":warning:", "").replace(":test_tube:", "").replace("*", "")
        send_mail(
            subject="[PerfMonitor] " + plain.splitlines()[0][:80],
            message=plain,
            from_email=dj_settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )


def _handle_incident(website: MonitoredWebsite, check: MonitoringCheck):
    active = website.incidents.filter(ended_at__isnull=True).first()
    if check.status != MonitoringCheck.Status.UP:
        if not active:
            Incident.objects.create(website=website, started_at=check.checked_at)
            _notify_providers(
                website,
                "down",
                f":red_circle: *{website.name}* is DOWN\nURL: {website.url}\nStatus: {check.status.upper()}\nError: {check.error_message or 'N/A'}",
            )
    else:
        if active:
            active.ended_at = check.checked_at
            active.save(update_fields=["ended_at"])
            _notify_providers(
                website,
                "recovery",
                f":large_green_circle: *{website.name}* is back UP\nURL: {website.url}\nResponse time: {check.response_time_ms:.0f}ms" if check.response_time_ms else f":large_green_circle: *{website.name}* is back UP\nURL: {website.url}",
            )


def _handle_ssl_alert(website: MonitoredWebsite, ssl_check: SSLCheck):
    alert_map = {
        SSLCheck.CertStatus.EXPIRING_SOON: (SSLAlert.AlertType.EXPIRING_SOON, SSLAlert.Severity.WARNING, "ssl_expiring"),
        SSLCheck.CertStatus.EXPIRED: (SSLAlert.AlertType.EXPIRED, SSLAlert.Severity.CRITICAL, "ssl_expired"),
        SSLCheck.CertStatus.INVALID: (SSLAlert.AlertType.INVALID, SSLAlert.Severity.CRITICAL, "ssl_invalid"),
        SSLCheck.CertStatus.HOSTNAME_MISMATCH: (SSLAlert.AlertType.HOSTNAME_MISMATCH, SSLAlert.Severity.CRITICAL, "ssl_invalid"),
        SSLCheck.CertStatus.HANDSHAKE_FAILED: (SSLAlert.AlertType.HANDSHAKE_FAILED, SSLAlert.Severity.CRITICAL, "ssl_invalid"),
    }
    if ssl_check.cert_status in alert_map:
        alert_type, severity, event = alert_map[ssl_check.cert_status]
        SSLAlert.objects.create(
            website=website,
            ssl_check=ssl_check,
            alert_type=alert_type,
            severity=severity,
            days_remaining=ssl_check.days_remaining,
        )
        days_str = f" ({ssl_check.days_remaining}d remaining)" if ssl_check.days_remaining is not None else ""
        _notify_providers(
            website,
            event,
            f":warning: *SSL Alert* — {website.name}\nURL: {website.url}\nIssue: {alert_type.replace('_', ' ').title()}{days_str}",
        )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def run_check(request, pk):
    try:
        website = _website_qs(request).get(pk=pk)
    except MonitoredWebsite.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)
    check = _perform_check(website)
    ssl_check = None
    if website.ssl_monitoring:
        ssl_check = _perform_ssl_check(website)
    return Response({
        "check": MonitoringCheckSerializer(check).data,
        "ssl_check": SSLCheckSerializer(ssl_check).data if ssl_check else None,
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def toggle_website(request, pk):
    try:
        website = _website_qs(request).get(pk=pk)
    except MonitoredWebsite.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)
    website.active = not website.active
    website.save(update_fields=["active"])
    return Response({"active": website.active})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def bulk_action(request):
    action = request.data.get("action")
    ids = request.data.get("ids", [])
    qs = _website_qs(request).filter(pk__in=ids)

    if action == "enable":
        qs.update(active=True)
        return Response({"updated": qs.count()})
    elif action == "disable":
        qs.update(active=False)
        return Response({"updated": qs.count()})
    elif action == "delete":
        count = qs.count()
        qs.delete()
        return Response({"deleted": count})
    elif action == "run_check":
        results = []
        for website in qs:
            check = _perform_check(website)
            results.append({"website": str(website.id), "status": check.status})
        return Response({"results": results})
    return Response({"detail": "Unknown action."}, status=400)


# ── Monitoring History ────────────────────────────────────────────────────────

class MonitoringHistoryListView(generics.ListAPIView):
    serializer_class = MonitoringCheckSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["website", "status", "http_status_code"]
    search_fields = ["website__name", "website__url", "error_message"]
    ordering_fields = ["checked_at", "response_time_ms"]
    ordering = ["-checked_at"]

    def get_queryset(self):
        qs = MonitoringCheck.objects.filter(
            website__in=_website_qs(self.request)
        ).select_related("website")
        after = self.request.query_params.get("checked_after")
        before = self.request.query_params.get("checked_before")
        if after:
            qs = qs.filter(checked_at__gte=after)
        if before:
            qs = qs.filter(checked_at__lte=before)
        return qs


# ── Incidents ─────────────────────────────────────────────────────────────────

class IncidentListView(generics.ListAPIView):
    serializer_class = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["website", "acknowledged"]
    search_fields = ["website__name", "website__url", "root_cause"]
    ordering_fields = ["started_at", "ended_at"]
    ordering = ["-started_at"]

    def get_queryset(self):
        qs = Incident.objects.filter(
            website__in=_website_qs(self.request)
        ).select_related("website")
        after = self.request.query_params.get("started_after")
        before = self.request.query_params.get("started_before")
        ongoing = self.request.query_params.get("ongoing")
        if after:
            qs = qs.filter(started_at__gte=after)
        if before:
            qs = qs.filter(started_at__lte=before)
        if ongoing == "true":
            qs = qs.filter(ended_at__isnull=True)
        return qs


# ── SSL Monitoring ────────────────────────────────────────────────────────────

class SSLCheckListView(generics.ListAPIView):
    serializer_class = SSLCheckSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["website", "cert_status"]
    search_fields = ["website__name", "website__url", "common_name", "issuer"]
    ordering_fields = ["checked_at", "days_remaining"]
    ordering = ["-checked_at"]

    def get_queryset(self):
        return SSLCheck.objects.filter(
            website__in=_website_qs(self.request)
        ).select_related("website")


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def latest_ssl_per_website(request):
    websites = _website_qs(request).prefetch_related("ssl_checks")
    results = []
    for w in websites:
        ssl = w.ssl_checks.order_by("-checked_at").first()
        if ssl:
            data = SSLCheckSerializer(ssl).data
            data["website_name"] = w.name
            data["website_url"] = w.url
            data["ssl_monitoring"] = w.ssl_monitoring
            results.append(data)
        else:
            results.append({
                "website": str(w.id),
                "website_name": w.name,
                "website_url": w.url,
                "ssl_monitoring": w.ssl_monitoring,
                "cert_status": "disabled" if not w.ssl_monitoring else "unknown",
                "checked_at": None,
            })
    return Response({"count": len(results), "results": results})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def run_ssl_check(request, pk):
    try:
        website = _website_qs(request).get(pk=pk)
    except MonitoredWebsite.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)
    check = _perform_ssl_check(website)
    return Response(SSLCheckSerializer(check).data)


# ── SSL Alerts ────────────────────────────────────────────────────────────────

class SSLAlertListView(generics.ListAPIView):
    serializer_class = SSLAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["website", "alert_type", "severity", "status"]
    search_fields = ["website__name", "website__url"]
    ordering_fields = ["generated_at", "days_remaining"]
    ordering = ["-generated_at"]

    def get_queryset(self):
        return SSLAlert.objects.filter(
            website__in=_website_qs(self.request)
        ).select_related("website", "ssl_check")


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def acknowledge_ssl_alert(request, pk):
    try:
        alert = SSLAlert.objects.get(pk=pk, website__in=_website_qs(request))
    except SSLAlert.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)
    alert.status = SSLAlert.AlertStatus.ACKNOWLEDGED
    alert.save(update_fields=["status"])
    return Response(SSLAlertSerializer(alert).data)


# ── Notification Providers ────────────────────────────────────────────────────

class NotificationProviderListCreateView(generics.ListCreateAPIView):
    serializer_class = NotificationProviderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_admin", False):
            return NotificationProvider.objects.all()
        return NotificationProvider.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class NotificationProviderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NotificationProviderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_admin", False):
            return NotificationProvider.objects.all()
        return NotificationProvider.objects.filter(owner=user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def test_notification(request, pk):
    try:
        provider = NotificationProvider.objects.get(pk=pk, owner=request.user)
    except NotificationProvider.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    try:
        _send_test_notification(provider)
        return Response({"success": True, "message": f"Test notification sent via {provider.provider_type}"})
    except Exception as exc:
        return Response({"success": False, "message": str(exc)}, status=400)


def _send_test_notification(provider: NotificationProvider):
    config = provider.config or {}
    if provider.provider_type in ("slack", "teams", "discord", "webhook") and not config.get("webhook_url"):
        raise ValueError("No webhook_url configured")
    if provider.provider_type == "telegram" and (not config.get("bot_token") or not config.get("chat_id")):
        raise ValueError("Telegram requires bot_token and chat_id")
    if provider.provider_type == "email" and not config.get("recipients"):
        raise ValueError("No recipients configured")
    _dispatch_provider(provider, f":test_tube: *[PerfMonitor]* Test notification from provider *{provider.name}*")


# ── Website Uptime Trend ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def website_uptime_trend(request, pk):
    try:
        website = _website_qs(request).get(pk=pk)
    except MonitoredWebsite.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    days = int(request.query_params.get("days", 30))
    since = timezone.now() - timedelta(days=days)
    checks = website.checks.filter(checked_at__gte=since).order_by("checked_at")

    data = [
        {
            "checked_at": c.checked_at,
            "status": c.status,
            "response_time_ms": c.response_time_ms,
        }
        for c in checks
    ]
    return Response({"website": str(website.id), "days": days, "checks": data})
