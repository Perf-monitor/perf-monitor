from rest_framework import serializers
from .models import PerformanceReport


class PerformanceReportSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_url = serializers.CharField(source="project.url", read_only=True)
    status = serializers.ReadOnlyField()
    lcp_status = serializers.ReadOnlyField()
    cls_status = serializers.ReadOnlyField()
    inp_status = serializers.ReadOnlyField()

    class Meta:
        model = PerformanceReport
        fields = [
            "id", "project", "project_name", "project_url",
            "performance_score", "accessibility_score", "seo_score", "best_practices_score",
            "lcp", "cls", "inp", "fcp", "ttfb", "speed_index", "total_blocking_time",
            "strategy", "status", "lcp_status", "cls_status", "inp_status",
            "bundle_size", "largest_js_bundle", "image_optimization_score",
            "unused_javascript", "unused_css", "compression_enabled", "caching_enabled", "cdn_detected",
            "tested_at",
        ]
        read_only_fields = ["id", "tested_at"]


class PerformanceTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceReport
        fields = [
            "id", "performance_score", "accessibility_score", "seo_score", "best_practices_score",
            "lcp", "cls", "inp", "fcp", "ttfb", "speed_index", "total_blocking_time",
            "strategy", "tested_at",
        ]


class DashboardStatsSerializer(serializers.Serializer):
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    average_performance = serializers.FloatField()
    projects_healthy = serializers.IntegerField()
    projects_warning = serializers.IntegerField()
    projects_critical = serializers.IntegerField()
    latest_scan_time = serializers.DateTimeField(allow_null=True)
    total_reports = serializers.IntegerField()


class MonthlyAverageSerializer(serializers.Serializer):
    month = serializers.CharField()
    avg_performance = serializers.FloatField()
    avg_accessibility = serializers.FloatField()
    avg_seo = serializers.FloatField()
    avg_best_practices = serializers.FloatField()
