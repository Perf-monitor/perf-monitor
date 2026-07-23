from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ["project", "alert_type", "severity", "value", "threshold", "sent", "acknowledged", "created_at"]
    list_filter = ["alert_type", "severity", "sent", "acknowledged", "channel"]
    search_fields = ["project__name", "message"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "sent_at", "acknowledged_at"]
    actions = ["mark_acknowledged"]

    def mark_acknowledged(self, request, queryset):
        from django.utils import timezone
        queryset.update(acknowledged=True, acknowledged_at=timezone.now())
    mark_acknowledged.short_description = "Mark selected alerts as acknowledged"
