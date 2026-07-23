from django.db import models
from django.conf import settings


class AppSettings(models.Model):
    """Global application settings stored in DB (overrides env vars for runtime config)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="app_settings",
        null=True,
        blank=True,
        help_text="Null = global settings",
    )
    google_api_key = models.CharField(max_length=500, blank=True)
    scan_interval_hours = models.PositiveIntegerField(default=6)
    alert_performance_threshold = models.FloatField(default=80)
    alert_lcp_threshold = models.FloatField(default=2500)
    alert_cls_threshold = models.FloatField(default=0.1)
    alert_inp_threshold = models.FloatField(default=200)
    email_alerts_enabled = models.BooleanField(default=True)
    slack_alerts_enabled = models.BooleanField(default=False)
    slack_webhook_url = models.URLField(blank=True)
    email_recipients = models.TextField(blank=True, help_text="Comma-separated emails")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "App Settings"
        verbose_name_plural = "App Settings"

    def __str__(self):
        return f"Settings for {self.user.email if self.user else 'Global'}"
