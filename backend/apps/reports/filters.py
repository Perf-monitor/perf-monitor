import django_filters
from .models import PerformanceReport


class ReportFilter(django_filters.FilterSet):
    strategy = django_filters.ChoiceFilter(choices=PerformanceReport.Strategy.choices)
    project = django_filters.UUIDFilter()
    tested_after = django_filters.DateTimeFilter(field_name="tested_at", lookup_expr="gte")
    tested_before = django_filters.DateTimeFilter(field_name="tested_at", lookup_expr="lte")
    min_performance = django_filters.NumberFilter(field_name="performance_score", lookup_expr="gte")
    max_performance = django_filters.NumberFilter(field_name="performance_score", lookup_expr="lte")
    environment = django_filters.CharFilter(field_name="project__environment")
    framework = django_filters.CharFilter(field_name="project__framework")

    class Meta:
        model = PerformanceReport
        fields = ["strategy", "project", "tested_after", "tested_before"]
