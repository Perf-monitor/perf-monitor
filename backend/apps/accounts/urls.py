from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("login/", views.CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("change-password/", views.change_password, name="change_password"),
    path("users/", views.UserListView.as_view(), name="user_list"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user_detail"),
]
