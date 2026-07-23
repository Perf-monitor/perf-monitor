from rest_framework import serializers
from .models import RumApplication, RumSession, RumEvent


class RumApplicationSerializer(serializers.ModelSerializer):
    total_events = serializers.SerializerMethodField()
    error_rate = serializers.SerializerMethodField()

    class Meta:
        model = RumApplication
        fields = [
            "id", "name", "api_key", "environment", "version",
            "allowed_origins", "active", "created_at", "updated_at",
            "total_events", "error_rate",
        ]
        read_only_fields = ["id", "api_key", "created_at", "updated_at"]

    def get_total_events(self, obj):
        return obj.events.count()

    def get_error_rate(self, obj):
        total = obj.events.count()
        if not total:
            return 0.0
        errors = obj.events.filter(success=False).count()
        return round(errors / total * 100, 2)


class RumEventIngestSerializer(serializers.Serializer):
    """Used for the ingest endpoint — accepts batch events."""
    api_key = serializers.CharField()
    events = serializers.ListField(child=serializers.DictField(), min_length=1, max_length=200)


class RumEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = RumEvent
        fields = [
            "id", "api_url", "api_name", "method", "status_code", "success",
            "error_message", "response_time_ms", "dns_time_ms", "tcp_time_ms",
            "tls_time_ms", "ttfb_ms", "download_time_ms",
            "page_url", "route_name", "environment", "app_version", "timestamp",
        ]
