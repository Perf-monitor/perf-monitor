from django.urls import path
from . import views

urlpatterns = [
    path("projects/", views.ProjectListCreateView.as_view(), name="project_list_create"),
    path("projects/<uuid:pk>/", views.ProjectDetailView.as_view(), name="project_detail"),
    path("scan/<uuid:project_id>/", views.trigger_scan, name="trigger_scan"),
]
