from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id", "project", "project_name", "report", "alert_type", "alert_type_display",
            "severity", "severity_display", "message", "value", "threshold", "channel",
            "sent", "sent_at", "acknowledged", "acknowledged_at", "created_at",
        ]
        read_only_fields = ["id", "sent", "sent_at", "created_at"]
