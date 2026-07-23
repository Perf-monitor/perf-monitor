import logging
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import Project
from .serializers import ProjectSerializer, ProjectCreateUpdateSerializer
from .filters import ProjectFilter
from apps.accounts.permissions import IsOwnerOrAdmin

logger = logging.getLogger(__name__)


class ProjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = ProjectFilter
    search_fields = ["name", "url", "organization"]
    ordering_fields = ["name", "created_at", "environment", "framework"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Project.objects.all().prefetch_related("reports")
        return Project.objects.filter(owner=user).prefetch_related("reports")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateUpdateSerializer
        return ProjectSerializer


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Project.objects.all().prefetch_related("reports")
        return Project.objects.filter(owner=user).prefetch_related("reports")

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return ProjectCreateUpdateSerializer
        return ProjectSerializer


@extend_schema(
    responses={202: {"description": "Scan triggered"}},
    description="Manually trigger a performance scan for a project",
)
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def trigger_scan(request, project_id):
    try:
        user = request.user
        if user.is_admin:
            project = Project.objects.get(id=project_id)
        else:
            project = Project.objects.get(id=project_id, owner=user)
    except Project.DoesNotExist:
        return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

    from apps.reports.services import run_scan_for_project
    from apps.reports.serializers import PerformanceReportSerializer

    strategy = request.data.get("strategy", "both")

    if strategy == "mobile":
        project.scan_mobile = True
        project.scan_desktop = False
    elif strategy == "desktop":
        project.scan_mobile = False
        project.scan_desktop = True
    else:
        project.scan_mobile = True
        project.scan_desktop = True

    logger.info(f"Running synchronous scan for project {project.id} (strategy={strategy}) by {user.email}")

    try:
        reports = run_scan_for_project(project)
    except Exception as exc:
        logger.error(f"Scan failed for {project.id}: {exc}")
        return Response(
            {"error": f"Scan failed: {str(exc)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not reports:
        return Response(
            {"error": "Scan completed but returned no data. Check the URL is publicly accessible and the Google PageSpeed API key is set."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Queue alert checks asynchronously (best-effort — no-op if Celery is down)
    try:
        from apps.alerts.services import check_and_send_alerts
        for report in reports:
            check_and_send_alerts.delay(str(report.id))
    except Exception:
        pass

    logger.info(f"Scan complete for {project.name}: {len(reports)} report(s) saved")
    serializer = PerformanceReportSerializer(reports, many=True)
    return Response(
        {
            "message": f"Scan complete for {project.name}.",
            "project_id": str(project.id),
            "reports_saved": len(reports),
            "reports": serializer.data,
        },
        status=status.HTTP_200_OK,
    )
