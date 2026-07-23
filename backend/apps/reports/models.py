import uuid
from django.db import models
from apps.projects.models import Project


class PerformanceReport(models.Model):
    class Strategy(models.TextChoices):
        MOBILE = "mobile", "Mobile"
        DESKTOP = "desktop", "Desktop"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="reports")

    # Lighthouse Scores (0-100)
    performance_score = models.FloatField(default=0)
    accessibility_score = models.FloatField(default=0)
    seo_score = models.FloatField(default=0)
    best_practices_score = models.FloatField(default=0)

    # Core Web Vitals
    lcp = models.FloatField(null=True, blank=True, help_text="Largest Contentful Paint (ms)")
    cls = models.FloatField(null=True, blank=True, help_text="Cumulative Layout Shift")
    inp = models.FloatField(null=True, blank=True, help_text="Interaction to Next Paint (ms)")
    fcp = models.FloatField(null=True, blank=True, help_text="First Contentful Paint (ms)")
    ttfb = models.FloatField(null=True, blank=True, help_text="Time to First Byte (ms)")
    speed_index = models.FloatField(null=True, blank=True, help_text="Speed Index (ms)")
    total_blocking_time = models.FloatField(null=True, blank=True, help_text="Total Blocking Time (ms)")

    # Strategy
    strategy = models.CharField(max_length=10, choices=Strategy.choices, default=Strategy.MOBILE)

    # Bonus fields
    bundle_size = models.FloatField(null=True, blank=True, help_text="Bundle size in KB")
    largest_js_bundle = models.FloatField(null=True, blank=True, help_text="Largest JS bundle in KB")
    image_optimization_score = models.FloatField(null=True, blank=True)
    unused_javascript = models.FloatField(null=True, blank=True, help_text="Unused JS in KB")
    unused_css = models.FloatField(null=True, blank=True, help_text="Unused CSS in KB")
    compression_enabled = models.BooleanField(null=True, blank=True)
    caching_enabled = models.BooleanField(null=True, blank=True)
    cdn_detected = models.BooleanField(null=True, blank=True)

    # Raw response
    raw_response = models.JSONField(null=True, blank=True)

    tested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Performance Report"
        verbose_name_plural = "Performance Reports"
        ordering = ["-tested_at"]
        indexes = [
            models.Index(fields=["project", "-tested_at"]),
            models.Index(fields=["strategy"]),
            models.Index(fields=["-tested_at"]),
        ]

    def __str__(self):
        return f"{self.project.name} - {self.strategy} - {self.tested_at}"

    @property
    def status(self):
        if self.performance_score >= 90:
            return "healthy"
        elif self.performance_score >= 80:
            return "warning"
        return "critical"

    @property
    def lcp_status(self):
        if self.lcp is None:
            return "unknown"
        if self.lcp <= 2500:
            return "good"
        elif self.lcp <= 4000:
            return "needs-improvement"
        return "poor"

    @property
    def cls_status(self):
        if self.cls is None:
            return "unknown"
        if self.cls <= 0.1:
            return "good"
        elif self.cls <= 0.25:
            return "needs-improvement"
        return "poor"

    @property
    def inp_status(self):
        if self.inp is None:
            return "unknown"
        if self.inp <= 200:
            return "good"
        elif self.inp <= 500:
            return "needs-improvement"
        return "poor"


class NetworkRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(PerformanceReport, on_delete=models.CASCADE, related_name="network_requests")
    url = models.TextField()
    resource_type = models.CharField(max_length=50)
    status_code = models.IntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    transfer_size = models.IntegerField(null=True, blank=True)
    resource_size = models.IntegerField(null=True, blank=True)
    duration_ms = models.FloatField(null=True, blank=True)
    start_time_ms = models.FloatField(null=True, blank=True)
    protocol = models.CharField(max_length=20, blank=True)
    priority = models.CharField(max_length=20, blank=True)
    cache = models.CharField(max_length=50, blank=True)
    entity = models.CharField(max_length=255, blank=True)
    finished = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_time_ms"]

    def __str__(self):
        return f"{self.status_code} {self.resource_type} {self.url[:60]}"
