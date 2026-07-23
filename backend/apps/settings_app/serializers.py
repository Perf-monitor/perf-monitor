from rest_framework import serializers
from .models import AppSettings


class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = [
            "id", "google_api_key", "scan_interval_hours",
            "alert_performance_threshold", "alert_lcp_threshold",
            "alert_cls_threshold", "alert_inp_threshold",
            "email_alerts_enabled", "slack_alerts_enabled",
            "slack_webhook_url", "email_recipients",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "google_api_key": {"write_only": True},
        }
