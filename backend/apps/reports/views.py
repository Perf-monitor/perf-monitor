import logging
import csv
import io
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .serializers import (
    PerformanceReportSerializer,
    PerformanceTrendSerializer,
    DashboardStatsSerializer,
    MonthlyAverageSerializer,
    NetworkRequestSerializer,
)
from .models import PerformanceReport, NetworkRequest
from .filters import ReportFilter
from apps.projects.models import Project

logger = logging.getLogger(__name__)


class ReportListView(generics.ListAPIView):
    serializer_class = PerformanceReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = ReportFilter
    ordering_fields = ["tested_at", "performance_score", "accessibility_score", "seo_score"]
    ordering = ["-tested_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return PerformanceReport.objects.select_related("project").all()
        return PerformanceReport.objects.select_related("project").filter(project__owner=user)


class ProjectReportListView(generics.ListAPIView):
    serializer_class = PerformanceReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = ReportFilter
    ordering = ["-tested_at"]

    def get_queryset(self):
        project_id = self.kwargs["project_id"]
        user = self.request.user
        qs = PerformanceReport.objects.select_related("project").filter(project_id=project_id)
        if not user.is_admin:
            qs = qs.filter(project__owner=user)
        return qs


class ReportDetailView(generics.RetrieveAPIView):
    serializer_class = PerformanceReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return PerformanceReport.objects.select_related("project").all()
        return PerformanceReport.objects.select_related("project").filter(project__owner=user)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    """Aggregated dashboard statistics."""
    user = request.user
    if user.is_admin:
        projects = Project.objects.all()
    else:
        projects = Project.objects.filter(owner=user)

    total_projects = projects.count()
    active_projects = projects.filter(active=True).count()

    # For each project, get the latest report
    healthy = 0
    warning = 0
    critical = 0
    perf_scores = []
    latest_scan_time = None

    for project in projects.prefetch_related("reports"):
        latest = project.reports.order_by("-tested_at").first()
        if latest:
            perf_scores.append(latest.performance_score)
            if latest.performance_score >= 90:
                healthy += 1
            elif latest.performance_score >= 80:
                warning += 1
            else:
                critical += 1
            if latest_scan_time is None or latest.tested_at > latest_scan_time:
                latest_scan_time = latest.tested_at

    avg_performance = round(sum(perf_scores) / len(perf_scores), 1) if perf_scores else 0

    if user.is_admin:
        total_reports = PerformanceReport.objects.count()
    else:
        total_reports = PerformanceReport.objects.filter(project__owner=user).count()

    data = {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "average_performance": avg_performance,
        "projects_healthy": healthy,
        "projects_warning": warning,
        "projects_critical": critical,
        "latest_scan_time": latest_scan_time,
        "total_reports": total_reports,
    }
    serializer = DashboardStatsSerializer(data)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def project_trend(request, project_id):
    """Get performance trend data for a project (last 30 days by default)."""
    user = request.user
    days = int(request.query_params.get("days", 30))
    strategy = request.query_params.get("strategy", "mobile")

    since = timezone.now() - timedelta(days=days)

    qs = PerformanceReport.objects.filter(project_id=project_id, tested_at__gte=since)
    if not user.is_admin:
        qs = qs.filter(project__owner=user)
    if strategy != "all":
        qs = qs.filter(strategy=strategy)

    qs = qs.order_by("tested_at")
    serializer = PerformanceTrendSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def monthly_averages(request):
    """Monthly average scores across all projects."""
    user = request.user
    if user.is_admin:
        qs = PerformanceReport.objects.all()
    else:
        qs = PerformanceReport.objects.filter(project__owner=user)

    months = (
        qs.annotate(month=TruncMonth("tested_at"))
        .values("month")
        .annotate(
            avg_performance=Avg("performance_score"),
            avg_accessibility=Avg("accessibility_score"),
            avg_seo=Avg("seo_score"),
            avg_best_practices=Avg("best_practices_score"),
        )
        .order_by("month")
    )

    result = [
        {
            "month": item["month"].strftime("%Y-%m"),
            "avg_performance": round(item["avg_performance"] or 0, 1),
            "avg_accessibility": round(item["avg_accessibility"] or 0, 1),
            "avg_seo": round(item["avg_seo"] or 0, 1),
            "avg_best_practices": round(item["avg_best_practices"] or 0, 1),
        }
        for item in months
    ]
    return Response(result)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def history_view(request):
    """Full history of all reports with filters."""
    user = request.user
    if user.is_admin:
        qs = PerformanceReport.objects.select_related("project").all()
    else:
        qs = PerformanceReport.objects.select_related("project").filter(project__owner=user)

    project_id = request.query_params.get("project")
    if project_id:
        qs = qs.filter(project_id=project_id)

    strategy = request.query_params.get("strategy")
    if strategy:
        qs = qs.filter(strategy=strategy)

    qs = qs.order_by("-tested_at")[:200]
    serializer = PerformanceReportSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def export_csv(request, project_id):
    """Export performance reports as CSV."""
    user = request.user
    qs = PerformanceReport.objects.filter(project_id=project_id).order_by("-tested_at")
    if not user.is_admin:
        qs = qs.filter(project__owner=user)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Tested At", "Strategy", "Performance", "Accessibility", "SEO", "Best Practices",
        "LCP (ms)", "CLS", "INP (ms)", "FCP (ms)", "TTFB (ms)", "Speed Index", "TBT (ms)",
    ])
    for r in qs:
        writer.writerow([
            r.tested_at.isoformat(), r.strategy,
            r.performance_score, r.accessibility_score, r.seo_score, r.best_practices_score,
            r.lcp, r.cls, r.inp, r.fcp, r.ttfb, r.speed_index, r.total_blocking_time,
        ])

    response = HttpResponse(output.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="report_{project_id}.csv"'
    return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def compare_reports(request):
    """Compare two reports side by side."""
    report_ids = request.query_params.getlist("ids")
    if len(report_ids) < 2:
        return Response({"error": "Provide at least 2 report IDs via ?ids=<id1>&ids=<id2>"}, status=400)

    user = request.user
    qs = PerformanceReport.objects.filter(id__in=report_ids[:4])
    if not user.is_admin:
        qs = qs.filter(project__owner=user)

    serializer = PerformanceReportSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def network_requests_view(request, report_id):
    """Return all network requests captured during a specific report's Lighthouse scan."""
    user = request.user
    try:
        report = PerformanceReport.objects.select_related("project").get(id=report_id)
    except PerformanceReport.DoesNotExist:
        return Response({"error": "Report not found."}, status=404)

    if not user.is_admin and report.project.owner != user:
        return Response({"error": "Not found."}, status=404)

    qs = report.network_requests.all()

    resource_type = request.query_params.get("resource_type")
    if resource_type:
        qs = qs.filter(resource_type__iexact=resource_type)

    status_filter = request.query_params.get("status")
    if status_filter == "error":
        qs = qs.filter(status_code__gte=400)
    elif status_filter == "success":
        qs = qs.filter(status_code__lt=400)

    serializer = NetworkRequestSerializer(qs, many=True)
    return Response({"report_id": str(report_id), "count": qs.count(), "results": serializer.data})
