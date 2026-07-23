import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class RumApplication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rum_apps")
    name = models.CharField(max_length=200)
    api_key = models.CharField(max_length=64, unique=True, db_index=True)
    environment = models.CharField(max_length=50, default="production")
    version = models.CharField(max_length=50, blank=True)
    allowed_origins = models.TextField(blank=True, help_text="Comma-separated allowed origins")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.environment})"

    def save(self, *args, **kwargs):
        if not self.api_key:
            import secrets
            self.api_key = secrets.token_hex(32)
        super().save(*args, **kwargs)


class RumSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(RumApplication, on_delete=models.CASCADE, related_name="sessions")
    session_id = models.CharField(max_length=100, db_index=True)
    user_id = models.CharField(max_length=255, blank=True)
    anonymous_id = models.CharField(max_length=100, blank=True)
    browser_name = models.CharField(max_length=100, blank=True)
    browser_version = models.CharField(max_length=50, blank=True)
    os_name = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    screen_resolution = models.CharField(max_length=20, blank=True)
    network_type = models.CharField(max_length=50, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("application", "session_id")]
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.session_id} — {self.application.name}"


class RumEvent(models.Model):
    class Method(models.TextChoices):
        GET = "GET"
        POST = "POST"
        PUT = "PUT"
        PATCH = "PATCH"
        DELETE = "DELETE"
        OPTIONS = "OPTIONS"
        HEAD = "HEAD"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(RumApplication, on_delete=models.CASCADE, related_name="events")
    session = models.ForeignKey(RumSession, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")

    # Request info
    api_url = models.TextField()
    api_name = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, choices=Method.choices, default="GET")
    status_code = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    request_headers = models.JSONField(null=True, blank=True)
    response_headers = models.JSONField(null=True, blank=True)

    # Performance
    start_time = models.FloatField(null=True, blank=True)
    end_time = models.FloatField(null=True, blank=True)
    response_time_ms = models.FloatField(null=True, blank=True)
    dns_time_ms = models.FloatField(null=True, blank=True)
    tcp_time_ms = models.FloatField(null=True, blank=True)
    tls_time_ms = models.FloatField(null=True, blank=True)
    ttfb_ms = models.FloatField(null=True, blank=True)
    download_time_ms = models.FloatField(null=True, blank=True)

    # Page context
    page_url = models.TextField(blank=True)
    previous_url = models.TextField(blank=True)
    route_name = models.CharField(max_length=500, blank=True)
    referrer = models.TextField(blank=True)

    # App context
    environment = models.CharField(max_length=50, blank=True)
    app_version = models.CharField(max_length=50, blank=True)

    # Timestamp
    timestamp = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["application", "timestamp"]),
            models.Index(fields=["application", "success"]),
            models.Index(fields=["application", "status_code"]),
            models.Index(fields=["api_url"]),
        ]

    def __str__(self):
        return f"{self.method} {self.api_url[:60]} → {self.status_code}"
