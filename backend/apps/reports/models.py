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
