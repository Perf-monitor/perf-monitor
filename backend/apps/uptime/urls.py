from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path("uptime/dashboard/", views.uptime_dashboard, name="uptime_dashboard"),

    # Websites CRUD
    path("uptime/websites/", views.MonitoredWebsiteListCreateView.as_view(), name="uptime_website_list"),
    path("uptime/websites/<uuid:pk>/", views.MonitoredWebsiteDetailView.as_view(), name="uptime_website_detail"),
    path("uptime/websites/<uuid:pk>/check/", views.run_check, name="uptime_run_check"),
    path("uptime/websites/<uuid:pk>/toggle/", views.toggle_website, name="uptime_toggle"),
    path("uptime/websites/<uuid:pk>/uptime-trend/", views.website_uptime_trend, name="uptime_trend"),
    path("uptime/websites/bulk/", views.bulk_action, name="uptime_bulk"),

    # Monitoring history
    path("uptime/history/", views.MonitoringHistoryListView.as_view(), name="uptime_history"),

    # Incidents
    path("uptime/incidents/", views.IncidentListView.as_view(), name="uptime_incidents"),

    # SSL
    path("uptime/ssl/", views.latest_ssl_per_website, name="uptime_ssl_latest"),
    path("uptime/ssl/history/", views.SSLCheckListView.as_view(), name="uptime_ssl_history"),
    path("uptime/websites/<uuid:pk>/ssl-check/", views.run_ssl_check, name="uptime_run_ssl_check"),

    # SSL Alerts
    path("uptime/ssl-alerts/", views.SSLAlertListView.as_view(), name="uptime_ssl_alerts"),
    path("uptime/ssl-alerts/<uuid:pk>/acknowledge/", views.acknowledge_ssl_alert, name="uptime_ssl_alert_ack"),

    # Notifications
    path("uptime/notifications/", views.NotificationProviderListCreateView.as_view(), name="uptime_notifications"),
    path("uptime/notifications/<uuid:pk>/", views.NotificationProviderDetailView.as_view(), name="uptime_notification_detail"),
    path("uptime/notifications/<uuid:pk>/test/", views.test_notification, name="uptime_notification_test"),
]
