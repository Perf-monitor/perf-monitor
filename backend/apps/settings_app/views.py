from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import AppSettings
from .serializers import AppSettingsSerializer
from apps.accounts.permissions import IsAdminUser


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAdminUser])
def settings_view(request):
    """Get or update global application settings."""
    settings_obj, _ = AppSettings.objects.get_or_create(user=None)

    if request.method == "GET":
        serializer = AppSettingsSerializer(settings_obj)
        return Response(serializer.data)

    serializer = AppSettingsSerializer(
        settings_obj, data=request.data, partial=request.method == "PATCH"
    )
    if serializer.is_valid():
        instance = serializer.save()

        # If scan interval changed, update Celery Beat schedule
        if "scan_interval_hours" in request.data:
            _update_celery_beat_schedule(instance.scan_interval_hours)

        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _update_celery_beat_schedule(interval_hours: int):
    """Dynamically update the Celery Beat periodic task schedule."""
    try:
        from django_celery_beat.models import PeriodicTask, IntervalSchedule
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=interval_hours,
            period=IntervalSchedule.HOURS,
        )
        PeriodicTask.objects.update_or_create(
            name="run-scheduled-lighthouse-scans",
            defaults={
                "interval": schedule,
                "task": "apps.reports.tasks.run_scheduled_scans",
                "enabled": True,
            },
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to update Celery Beat schedule: {e}")
