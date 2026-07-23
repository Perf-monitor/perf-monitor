import django_filters
from .models import Project


class ProjectFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr="icontains")
    framework = django_filters.MultipleChoiceFilter(choices=Project.Framework.choices)
    environment = django_filters.MultipleChoiceFilter(choices=Project.Environment.choices)
    active = django_filters.BooleanFilter()
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Project
        fields = ["name", "framework", "environment", "active"]
