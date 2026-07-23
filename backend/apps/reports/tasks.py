import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_lighthouse_scan(self, project_id: str, strategy: str = "both"):
    """Run Lighthouse scan for a single project."""
    from apps.projects.models import Project
    from .services import run_scan_for_project
    from apps.alerts.services import check_and_send_alerts

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        logger.error(f"Project {project_id} not found")
        return

    logger.info(f"Starting Lighthouse scan for {project.name} (strategy={strategy})")

    try:
        if strategy == "mobile":
            project.scan_mobile = True
            project.scan_desktop = False
        elif strategy == "desktop":
            project.scan_mobile = False
            project.scan_desktop = True

        reports = run_scan_for_project(project)

        for report in reports:
            check_and_send_alerts.delay(str(report.id))

        logger.info(f"Completed scan for {project.name}: {len(reports)} reports saved")
        return {"project": str(project_id), "reports": len(reports)}

    except Exception as exc:
        logger.error(f"Scan failed for {project_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def run_scheduled_scans():
    """Celery Beat task: scan all active projects every N hours."""
    from apps.projects.models import Project

    projects = Project.objects.filter(active=True)
    logger.info(f"Scheduled scan: processing {projects.count()} active projects")

    for project in projects:
        run_lighthouse_scan.delay(str(project.id))

    return {"triggered": projects.count(), "at": timezone.now().isoformat()}


@shared_task
def run_scan_for_all_projects():
    """Alias for scheduled scans (used by Celery Beat)."""
    return run_scheduled_scans()
