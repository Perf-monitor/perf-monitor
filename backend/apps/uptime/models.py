import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class MonitoredWebsite(models.Model):
    class CheckInterval(models.IntegerChoices):
        ONE_MIN = 1, "Every 1 minute"
        FIVE_MIN = 5, "Every 5 minutes"
        TEN_MIN = 10, "Every 10 minutes"
        THIRTY_MIN = 30, "Every 30 minutes"
        ONE_HOUR = 60, "Every 1 hour"

    class Protocol(models.TextChoices):
        HTTP = "http", "HTTP"
        HTTPS = "https", "HTTPS"
        TCP = "tcp", "TCP"
        PING = "ping", "PING"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="monitored_websites")
    name = models.CharField(max_length=255)
    url = models.URLField(max_length=2048)
    protocol = models.CharField(max_length=10, choices=Protocol.choices, default=Protocol.HTTPS)
    check_interval = models.IntegerField(choices=CheckInterval.choices, default=CheckInterval.FIVE_MIN)
    active = models.BooleanField(default=True)
    ssl_monitoring = models.BooleanField(default=True)
    ssl_expiry_alert_days = models.IntegerField(default=30)
    timeout_seconds = models.IntegerField(default=30)
    expected_status_code = models.IntegerField(default=200)
    keyword_check = models.CharField(max_length=500, blank=True, help_text="Check that this keyword appears in the response")
    verify_ssl = models.BooleanField(default=True, help_text="Verify SSL certificate chain. Disable for self-signed certificates.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Monitored Website"
        verbose_name_plural = "Monitored Websites"

    def __str__(self):
        return f"{self.name} ({self.url})"

    @property
    def current_status(self):
        last = self.checks.order_by("-checked_at").first()
        return last.status if last else "unknown"

    @property
    def last_checked(self):
        last = self.checks.order_by("-checked_at").first()
        return last.checked_at if last else None

    @property
    def uptime_percentage(self):
        total = self.checks.count()
        if not total:
            return None
        up = self.checks.filter(status="up").count()
        return round(up / total * 100, 2)

    @property
    def active_incident(self):
        return self.incidents.filter(ended_at__isnull=True).first()

    @property
    def latest_ssl(self):
        return self.ssl_checks.order_by("-checked_at").first()


class MonitoringCheck(models.Model):
    class Status(models.TextChoices):
        UP = "up", "Up"
        DOWN = "down", "Down"
        TIMEOUT = "timeout", "Timeout"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website = models.ForeignKey(MonitoredWebsite, on_delete=models.CASCADE, related_name="checks")
    status = models.CharField(max_length=10, choices=Status.choices)
    response_time_ms = models.FloatField(null=True, blank=True)
    http_status_code = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-checked_at"]
        indexes = [
            models.Index(fields=["website", "-checked_at"]),
            models.Index(fields=["website", "status"]),
        ]

    def __str__(self):
        return f"{self.website.name} — {self.status} @ {self.checked_at}"


class Incident(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website = models.ForeignKey(MonitoredWebsite, on_delete=models.CASCADE, related_name="incidents")
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    root_cause = models.TextField(blank=True)
    acknowledged = models.BooleanField(default=False)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        status = "ongoing" if not self.ended_at else "resolved"
        return f"{self.website.name} incident ({status}) @ {self.started_at}"

    @property
    def duration_seconds(self):
        if not self.ended_at:
            return None
        return (self.ended_at - self.started_at).total_seconds()

    @property
    def is_ongoing(self):
        return self.ended_at is None


class SSLCheck(models.Model):
    class CertStatus(models.TextChoices):
        HEALTHY = "healthy", "Healthy"
        EXPIRING_SOON = "expiring_soon", "Expiring Soon"
        EXPIRED = "expired", "Expired"
        INVALID = "invalid", "Invalid"
        HOSTNAME_MISMATCH = "hostname_mismatch", "Hostname Mismatch"
        HANDSHAKE_FAILED = "handshake_failed", "Handshake Failed"
        DISABLED = "disabled", "SSL Disabled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website = models.ForeignKey(MonitoredWebsite, on_delete=models.CASCADE, related_name="ssl_checks")
    cert_status = models.CharField(max_length=20, choices=CertStatus.choices)
    issuer = models.CharField(max_length=500, blank=True)
    common_name = models.CharField(max_length=500, blank=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    days_remaining = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-checked_at"]
        indexes = [models.Index(fields=["website", "-checked_at"])]

    def __str__(self):
        return f"{self.website.name} SSL — {self.cert_status} @ {self.checked_at}"


class SSLAlert(models.Model):
    class AlertType(models.TextChoices):
        EXPIRING_SOON = "expiring_soon", "Expiring Soon"
        EXPIRED = "expired", "Expired"
        INVALID = "invalid", "Invalid Certificate"
        HOSTNAME_MISMATCH = "hostname_mismatch", "Hostname Mismatch"
        HANDSHAKE_FAILED = "handshake_failed", "SSL Handshake Failed"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    class AlertStatus(models.TextChoices):
        OPEN = "open", "Open"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        RESOLVED = "resolved", "Resolved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    website = models.ForeignKey(MonitoredWebsite, on_delete=models.CASCADE, related_name="ssl_alerts")
    ssl_check = models.ForeignKey(SSLCheck, on_delete=models.SET_NULL, null=True, blank=True)
    alert_type = models.CharField(max_length=25, choices=AlertType.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    days_remaining = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=AlertStatus.choices, default=AlertStatus.OPEN)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.website.name} — {self.alert_type} ({self.severity})"


class NotificationProvider(models.Model):
    class ProviderType(models.TextChoices):
        EMAIL = "email", "Email"
        SLACK = "slack", "Slack"
        TEAMS = "teams", "Microsoft Teams"
        DISCORD = "discord", "Discord"
        TELEGRAM = "telegram", "Telegram"
        WEBHOOK = "webhook", "Generic Webhook"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notification_providers")
    name = models.CharField(max_length=255)
    provider_type = models.CharField(max_length=15, choices=ProviderType.choices)
    enabled = models.BooleanField(default=True)
    config = models.JSONField(default=dict, help_text="Provider-specific configuration (webhook_url, bot_token, chat_id, etc.)")

    notify_on_down = models.BooleanField(default=True)
    notify_on_recovery = models.BooleanField(default=True)
    notify_on_ssl_expiring = models.BooleanField(default=True)
    notify_on_ssl_expired = models.BooleanField(default=True)
    notify_on_ssl_invalid = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.provider_type})"
