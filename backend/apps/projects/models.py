import uuid
from django.db import models
from django.conf import settings


class Project(models.Model):
    class Framework(models.TextChoices):
        REACT = "react", "React.js"
        NEXTJS = "nextjs", "Next.js"
        VUE = "vue", "Vue.js"
        NUXT = "nuxt", "Nuxt.js"
        ANGULAR = "angular", "Angular"
        SVELTE = "svelte", "Svelte"
        OTHER = "other", "Other"

    class Environment(models.TextChoices):
        PRODUCTION = "production", "Production"
        STAGING = "staging", "Staging"
        DEVELOPMENT = "development", "Development"
        PREVIEW = "preview", "Preview"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    url = models.URLField(max_length=500)
    framework = models.CharField(max_length=50, choices=Framework.choices, default=Framework.NEXTJS)
    environment = models.CharField(max_length=50, choices=Environment.choices, default=Environment.PRODUCTION)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    organization = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    scan_mobile = models.BooleanField(default=True)
    scan_desktop = models.BooleanField(default=True)
    # Bonus fields
    deployment_version = models.CharField(max_length=100, blank=True)
    git_commit_id = models.CharField(max_length=100, blank=True)
    build_time = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Project"
        verbose_name_plural = "Projects"
        ordering = ["-created_at"]
        unique_together = [["name", "owner"]]

    def __str__(self):
        return f"{self.name} ({self.environment})"

    @property
    def latest_report(self):
        return self.reports.order_by("-tested_at").first()

    @property
    def status(self):
        report = self.latest_report
        if not report:
            return "unknown"
        score = report.performance_score
        if score >= 90:
            return "healthy"
        elif score >= 80:
            return "warning"
        return "critical"
