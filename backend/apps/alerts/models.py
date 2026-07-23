import uuid
from django.db import models
from apps.projects.models import Project
from apps.reports.models import PerformanceReport


class Alert(models.Model):
    class AlertType(models.TextChoices):
        PERFORMANCE = "performance", "Low Performance Score"
        LCP = "lcp", "High LCP"
        CLS = "cls", "High CLS"
        INP = "inp", "High INP"

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        SLACK = "slack", "Slack"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="alerts")
    report = models.ForeignKey(PerformanceReport, on_delete=models.CASCADE, related_name="alerts", null=True)
    alert_type = models.CharField(max_length=20, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    message = models.TextField()
    value = models.FloatField(help_text="The actual metric value that triggered the alert")
    threshold = models.FloatField(help_text="The threshold that was exceeded")
    channel = models.CharField(max_length=10, choices=Channel.choices, default=Channel.EMAIL)
    sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project", "-created_at"])]

    def __str__(self):
        return f"{self.project.name} - {self.alert_type} - {self.created_at}"
