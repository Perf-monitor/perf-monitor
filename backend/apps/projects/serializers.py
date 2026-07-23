from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    status = serializers.ReadOnlyField()
    latest_performance = serializers.SerializerMethodField()
    latest_accessibility = serializers.SerializerMethodField()
    latest_seo = serializers.SerializerMethodField()
    latest_best_practices = serializers.SerializerMethodField()
    latest_lcp = serializers.SerializerMethodField()
    latest_cls = serializers.SerializerMethodField()
    latest_inp = serializers.SerializerMethodField()
    latest_speed_index = serializers.SerializerMethodField()
    latest_tbt = serializers.SerializerMethodField()
    last_scan = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "url", "framework", "environment", "owner", "owner_email",
            "organization", "description", "active", "scan_mobile", "scan_desktop",
            "deployment_version", "git_commit_id", "build_time",
            "status", "latest_performance", "latest_accessibility", "latest_seo",
            "latest_best_practices", "latest_lcp", "latest_cls", "latest_inp",
            "latest_speed_index", "latest_tbt", "last_scan", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def _get_latest_report(self, obj):
        if not hasattr(obj, "_latest_report_cache"):
            obj._latest_report_cache = obj.reports.order_by("-tested_at").first()
        return obj._latest_report_cache

    def get_latest_performance(self, obj):
        r = self._get_latest_report(obj)
        return r.performance_score if r else None

    def get_latest_accessibility(self, obj):
        r = self._get_latest_report(obj)
        return r.accessibility_score if r else None

    def get_latest_seo(self, obj):
        r = self._get_latest_report(obj)
        return r.seo_score if r else None

    def get_latest_best_practices(self, obj):
        r = self._get_latest_report(obj)
        return r.best_practices_score if r else None

    def get_latest_lcp(self, obj):
        r = self._get_latest_report(obj)
        return r.lcp if r else None

    def get_latest_cls(self, obj):
        r = self._get_latest_report(obj)
        return r.cls if r else None

    def get_latest_inp(self, obj):
        r = self._get_latest_report(obj)
        return r.inp if r else None

    def get_latest_speed_index(self, obj):
        r = self._get_latest_report(obj)
        return r.speed_index if r else None

    def get_latest_tbt(self, obj):
        r = self._get_latest_report(obj)
        return r.total_blocking_time if r else None

    def get_last_scan(self, obj):
        r = self._get_latest_report(obj)
        return r.tested_at if r else None

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "name", "url", "framework", "environment", "organization", "description",
            "active", "scan_mobile", "scan_desktop", "deployment_version", "git_commit_id", "build_time",
        ]

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)
