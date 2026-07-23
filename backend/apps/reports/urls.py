from django.urls import path
from . import views

urlpatterns = [
    path("reports/", views.ReportListView.as_view(), name="report_list"),
    path("reports/<uuid:pk>/", views.ReportDetailView.as_view(), name="report_detail"),
    path("reports/project/<uuid:project_id>/", views.ProjectReportListView.as_view(), name="project_reports"),
    path("reports/project/<uuid:project_id>/export/csv/", views.export_csv, name="export_csv"),
    path("reports/compare/", views.compare_reports, name="compare_reports"),
    path("dashboard/", views.dashboard_stats, name="dashboard_stats"),
    path("history/", views.history_view, name="history"),
    path("trends/<uuid:project_id>/", views.project_trend, name="project_trend"),
    path("analytics/monthly/", views.monthly_averages, name="monthly_averages"),
]
