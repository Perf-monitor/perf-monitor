from rest_framework import serializers
from .models import (
    MonitoredWebsite, MonitoringCheck, Incident,
    SSLCheck, SSLAlert, NotificationProvider,
)


class MonitoringCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitoringCheck
        fields = [
            "id", "website", "status", "response_time_ms",
            "http_status_code", "error_message", "checked_at",
        ]
        read_only_fields = ["id", "checked_at"]


class SSLCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = SSLCheck
        fields = [
            "id", "website", "cert_status", "issuer", "common_name",
            "valid_from", "valid_to", "days_remaining", "error_message", "checked_at",
        ]
        read_only_fields = ["id", "checked_at"]


class IncidentSerializer(serializers.ModelSerializer):
    website_name = serializers.CharField(source="website.name", read_only=True)
    website_url = serializers.CharField(source="website.url", read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    is_ongoing = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id", "website", "website_name", "website_url",
            "started_at", "ended_at", "root_cause", "acknowledged",
            "duration_seconds", "is_ongoing",
        ]
        read_only_fields = ["id"]

    def get_duration_seconds(self, obj):
        return obj.duration_seconds

    def get_is_ongoing(self, obj):
        return obj.is_ongoing


class SSLAlertSerializer(serializers.ModelSerializer):
    website_name = serializers.CharField(source="website.name", read_only=True)
    website_url = serializers.CharField(source="website.url", read_only=True)

    class Meta:
        model = SSLAlert
        fields = [
            "id", "website", "website_name", "website_url",
            "ssl_check", "alert_type", "severity", "days_remaining",
            "status", "generated_at",
        ]
        read_only_fields = ["id", "generated_at"]


class MonitoredWebsiteSerializer(serializers.ModelSerializer):
    current_status = serializers.SerializerMethodField()
    last_checked = serializers.SerializerMethodField()
    uptime_percentage = serializers.SerializerMethodField()
    active_incident = serializers.SerializerMethodField()
    ssl_status = serializers.SerializerMethodField()
    latest_response_time = serializers.SerializerMethodField()

    class Meta:
        model = MonitoredWebsite
        fields = [
            "id", "name", "url", "protocol", "check_interval", "active",
            "ssl_monitoring", "ssl_expiry_alert_days", "timeout_seconds",
            "expected_status_code", "keyword_check", "verify_ssl", "notes",
            "created_at", "updated_at",
            "current_status", "last_checked", "uptime_percentage",
            "active_incident", "ssl_status", "latest_response_time",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_current_status(self, obj):
        return obj.current_status

    def get_last_checked(self, obj):
        return obj.last_checked

    def get_uptime_percentage(self, obj):
        return obj.uptime_percentage

    def get_active_incident(self, obj):
        incident = obj.active_incident
        if not incident:
            return None
        return {"id": str(incident.id), "started_at": incident.started_at}

    def get_ssl_status(self, obj):
        if not obj.ssl_monitoring:
            return "disabled"
        ssl = obj.latest_ssl
        return ssl.cert_status if ssl else "unknown"

    def get_latest_response_time(self, obj):
        last = obj.checks.order_by("-checked_at").first()
        return last.response_time_ms if last else None


class MonitoredWebsiteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitoredWebsite
        fields = [
            "name", "url", "protocol", "check_interval", "active",
            "ssl_monitoring", "ssl_expiry_alert_days", "timeout_seconds",
            "expected_status_code", "keyword_check", "verify_ssl", "notes",
        ]


class NotificationProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationProvider
        fields = [
            "id", "name", "provider_type", "enabled", "config",
            "notify_on_down", "notify_on_recovery",
            "notify_on_ssl_expiring", "notify_on_ssl_expired", "notify_on_ssl_invalid",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UptimeDashboardSerializer(serializers.Serializer):
    total_websites = serializers.IntegerField()
    websites_up = serializers.IntegerField()
    websites_down = serializers.IntegerField()
    active_incidents = serializers.IntegerField()
    overall_uptime_pct = serializers.FloatField()
    avg_response_time_ms = serializers.FloatField()
    ssl_expiring_soon = serializers.IntegerField()
    ssl_expired = serializers.IntegerField()
    ssl_invalid = serializers.IntegerField()
