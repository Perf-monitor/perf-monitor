from django.urls import path
from . import views

urlpatterns = [
    path("alerts/", views.AlertListView.as_view(), name="alert_list"),
    path("alerts/<uuid:pk>/", views.AlertDetailView.as_view(), name="alert_detail"),
    path("alerts/<uuid:pk>/acknowledge/", views.acknowledge_alert, name="acknowledge_alert"),
]
