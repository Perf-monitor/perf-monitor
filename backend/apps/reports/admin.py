from django.contrib import admin
from .models import PerformanceReport


@admin.register(PerformanceReport)
class PerformanceReportAdmin(admin.ModelAdmin):
    list_display = [
        "project", "strategy", "performance_score", "accessibility_score",
        "seo_score", "best_practices_score", "lcp", "cls", "inp", "tested_at",
    ]
    list_filter = ["strategy", "project__framework", "project__environment"]
    search_fields = ["project__name", "project__url"]
    ordering = ["-tested_at"]
    readonly_fields = ["id", "tested_at"]
    date_hierarchy = "tested_at"
