from django.urls import path
from . import views

urlpatterns = [
    # Applications CRUD
    path("rum/apps/", views.RumApplicationListCreateView.as_view(), name="rum_app_list"),
    path("rum/apps/<uuid:pk>/", views.RumApplicationDetailView.as_view(), name="rum_app_detail"),

    # SDK ingest (public)
    path("rum/events/", views.ingest_events, name="rum_ingest"),

    # Dashboard APIs
    path("rum/dashboard/", views.rum_dashboard, name="rum_dashboard"),
    path("rum/apis/", views.rum_apis, name="rum_apis"),
    path("rum/errors/", views.rum_errors, name="rum_errors"),
    path("rum/slow/", views.rum_slow, name="rum_slow"),
    path("rum/live/", views.rum_live, name="rum_live"),
    path("rum/users/", views.rum_active_users, name="rum_users"),
]
