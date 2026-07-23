import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Min, Max, Q, F
from django.db.models.functions import TruncMinute, TruncHour
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import RumApplication, RumSession, RumEvent
from .serializers import RumApplicationSerializer, RumEventIngestSerializer, RumEventSerializer

logger = logging.getLogger(__name__)


# ── Application CRUD ──────────────────────────────────────────────────────────

class RumApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = RumApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return RumApplication.objects.none()
        user = self.request.user
        if user.is_admin:
            return RumApplication.objects.all()
        return RumApplication.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class RumApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RumApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return RumApplication.objects.all()
        return RumApplication.objects.filter(owner=user)


# ── Event Ingestion ───────────────────────────────────────────────────────────

@api_view(["POST", "OPTIONS"])
@permission_classes([permissions.AllowAny])
def ingest_events(request):
    """Public endpoint — accepts batches of RUM events from the SDK."""
    if request.method == "OPTIONS":
        return Response(status=200)

    serializer = RumEventIngestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    api_key = serializer.validated_data["api_key"]
    events_data = serializer.validated_data["events"]

    try:
        app = RumApplication.objects.get(api_key=api_key, active=True)
    except RumApplication.DoesNotExist:
        return Response({"error": "Invalid API key."}, status=401)

    saved = 0
    for ev in events_data:
        try:
            session_id = ev.get("session_id", "")
            session = None
            if session_id:
                session, _ = RumSession.objects.get_or_create(
                    application=app,
                    session_id=session_id,
                    defaults={
                        "user_id": ev.get("user_id", ""),
                        "anonymous_id": ev.get("anonymous_id", ""),
                        "browser_name": ev.get("browser_name", ""),
                        "browser_version": ev.get("browser_version", ""),
                        "os_name": ev.get("os_name", ""),
                        "device_type": ev.get("device_type", ""),
                        "screen_resolution": ev.get("screen_resolution", ""),
                        "network_type": ev.get("network_type", ""),
                    },
                )

            from django.utils.dateparse import parse_datetime
            import datetime
            ts_raw = ev.get("timestamp")
            if ts_raw:
                if isinstance(ts_raw, (int, float)):
                    timestamp = timezone.datetime.fromtimestamp(ts_raw / 1000, tz=timezone.utc)
                else:
                    timestamp = parse_datetime(str(ts_raw)) or timezone.now()
            else:
                timestamp = timezone.now()

            status_code = ev.get("status_code")
            success = ev.get("success", True)
            if status_code and status_code >= 400:
                success = False

            RumEvent.objects.create(
                application=app,
                session=session,
                api_url=ev.get("api_url", ""),
                api_name=ev.get("api_name", ""),
                method=ev.get("method", "GET").upper()[:10],
                status_code=status_code,
                success=success,
                error_message=ev.get("error_message", ""),
                request_headers=ev.get("request_headers"),
                response_headers=ev.get("response_headers"),
                start_time=ev.get("start_time"),
                end_time=ev.get("end_time"),
                response_time_ms=ev.get("response_time_ms"),
                dns_time_ms=ev.get("dns_time_ms"),
                tcp_time_ms=ev.get("tcp_time_ms"),
                tls_time_ms=ev.get("tls_time_ms"),
                ttfb_ms=ev.get("ttfb_ms"),
                download_time_ms=ev.get("download_time_ms"),
                page_url=ev.get("page_url", ""),
                previous_url=ev.get("previous_url", ""),
                route_name=ev.get("route_name", ""),
                referrer=ev.get("referrer", ""),
                environment=ev.get("environment", app.environment),
                app_version=ev.get("version", app.version),
                timestamp=timestamp,
            )
            saved += 1
        except Exception as e:
            logger.warning(f"RUM ingest error: {e}")

    return Response({"saved": saved}, status=201)


# ── Dashboard Summary ─────────────────────────────────────────────────────────

def _app_qs(request):
    user = request.user
    app_id = request.query_params.get("app_id")
    qs = RumApplication.objects.all() if user.is_admin else RumApplication.objects.filter(owner=user)
    if app_id:
        qs = qs.filter(id=app_id)
    return qs


def _event_qs(request, hours=24):
    apps = _app_qs(request)
    since = timezone.now() - timedelta(hours=hours)
    return RumEvent.objects.filter(application__in=apps, timestamp__gte=since)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rum_dashboard(request):
    hours = int(request.query_params.get("hours", 24))
    events = _event_qs(request, hours)
    total = events.count()
    errors = events.filter(success=False).count()
    agg = events.aggregate(
        avg_rt=Avg("response_time_ms"),
        min_rt=Min("response_time_ms"),
        max_rt=Max("response_time_ms"),
    )
    active_sessions = RumSession.objects.filter(
        application__in=_app_qs(request),
        last_seen_at__gte=timezone.now() - timedelta(minutes=30),
    ).count()

    # Requests per minute
    window_minutes = hours * 60
    rpm = round(total / window_minutes, 2) if window_minutes else 0

    # Error rate
    error_rate = round(errors / total * 100, 2) if total else 0

    # Status code distribution
    status_dist = list(
        events.exclude(status_code=None)
        .values("status_code")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # Browser distribution
    browser_dist = list(
        RumSession.objects.filter(application__in=_app_qs(request))
        .exclude(browser_name="")
        .values("browser_name")
        .annotate(count=Count("id"))
        .order_by("-count")[:8]
    )

    # Device distribution
    device_dist = list(
        RumSession.objects.filter(application__in=_app_qs(request))
        .exclude(device_type="")
        .values("device_type")
        .annotate(count=Count("id"))
        .order_by("-count")[:5]
    )

    # RPM trend (last 60 minutes in 5-min buckets)
    rpm_trend = list(
        events.filter(timestamp__gte=timezone.now() - timedelta(hours=1))
        .annotate(bucket=TruncMinute("timestamp"))
        .values("bucket")
        .annotate(count=Count("id"))
        .order_by("bucket")
    )

    return Response({
        "total_calls": total,
        "active_users": active_sessions,
        "rpm": rpm,
        "avg_response_time_ms": round(agg["avg_rt"] or 0, 2),
        "min_response_time_ms": round(agg["min_rt"] or 0, 2),
        "max_response_time_ms": round(agg["max_rt"] or 0, 2),
        "error_rate": error_rate,
        "success_rate": round(100 - error_rate, 2),
        "total_errors": errors,
        "status_distribution": status_dist,
        "browser_distribution": browser_dist,
        "device_distribution": device_dist,
        "rpm_trend": [{"time": r["bucket"].isoformat(), "count": r["count"]} for r in rpm_trend],
        "hours": hours,
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rum_apis(request):
    """Aggregated stats per API endpoint."""
    hours = int(request.query_params.get("hours", 24))
    events = _event_qs(request, hours)

    apis = (
        events.values("api_url", "method")
        .annotate(
            calls=Count("id"),
            avg_time=Avg("response_time_ms"),
            min_time=Min("response_time_ms"),
            max_time=Max("response_time_ms"),
            error_count=Count("id", filter=Q(success=False)),
        )
        .order_by("-calls")[:100]
    )

    results = []
    for a in apis:
        total = a["calls"]
        results.append({
            "api_url": a["api_url"],
            "method": a["method"],
            "calls": total,
            "avg_time": round(a["avg_time"] or 0, 2),
            "min_time": round(a["min_time"] or 0, 2),
            "max_time": round(a["max_time"] or 0, 2),
            "error_count": a["error_count"],
            "success_pct": round((total - a["error_count"]) / total * 100, 1) if total else 100,
        })

    return Response({"results": results, "count": len(results)})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rum_errors(request):
    hours = int(request.query_params.get("hours", 24))
    events = _event_qs(request, hours).filter(success=False).select_related("application")
    serializer = RumEventSerializer(events[:200], many=True)
    return Response({"count": events.count(), "results": serializer.data})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rum_slow(request):
    hours = int(request.query_params.get("hours", 24))
    threshold = float(request.query_params.get("threshold", 1000))
    events = _event_qs(request, hours).filter(response_time_ms__gte=threshold).order_by("-response_time_ms")
    serializer = RumEventSerializer(events[:200], many=True)
    return Response({"count": events.count(), "threshold_ms": threshold, "results": serializer.data})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rum_live(request):
    """Last 100 events across all apps (last 5 minutes)."""
    events = _event_qs(request, hours=1).order_by("-timestamp")[:100]
    serializer = RumEventSerializer(events, many=True)
    return Response({"results": serializer.data})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rum_active_users(request):
    apps = _app_qs(request)
    sessions = RumSession.objects.filter(
        application__in=apps,
        last_seen_at__gte=timezone.now() - timedelta(minutes=30),
    ).values("session_id", "user_id", "anonymous_id", "browser_name", "device_type", "last_seen_at")
    return Response({"count": sessions.count(), "results": list(sessions[:100])})
