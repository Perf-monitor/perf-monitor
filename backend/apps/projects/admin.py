from django.contrib import admin
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "url", "framework", "environment", "owner", "active", "created_at"]
    list_filter = ["framework", "environment", "active"]
    search_fields = ["name", "url", "owner__email"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]
