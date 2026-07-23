from django.contrib import admin
from .models import AppSettings


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = ["user", "scan_interval_hours", "email_alerts_enabled", "slack_alerts_enabled", "updated_at"]
    readonly_fields = ["created_at", "updated_at"]
