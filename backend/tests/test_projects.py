from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.projects.models import Project


class ProjectAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@test.com", username="admin", password="testpass123", role=User.Role.ADMIN
        )
        self.user = User.objects.create_user(
            email="user@test.com", username="user", password="testpass123", role=User.Role.USER
        )
        self.project = Project.objects.create(
            name="Test Project",
            url="https://example.com",
            framework=Project.Framework.NEXTJS,
            environment=Project.Environment.PRODUCTION,
            owner=self.user,
        )

    def _auth(self, user):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": "testpass123"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_list_projects_authenticated(self):
        self._auth(self.user)
        response = self.client.get(reverse("project_list_create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_projects_unauthenticated(self):
        response = self.client.get(reverse("project_list_create"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_project(self):
        self._auth(self.user)
        data = {
            "name": "New Project",
            "url": "https://newproject.com",
            "framework": "react",
            "environment": "production",
        }
        response = self.client.post(reverse("project_list_create"), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Project")

    def test_get_project_detail(self):
        self._auth(self.user)
        response = self.client.get(reverse("project_detail", kwargs={"pk": self.project.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Project")

    def test_admin_can_see_all_projects(self):
        self._auth(self.admin)
        response = self.client.get(reverse("project_list_create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_user_cannot_see_other_users_projects(self):
        other_user = User.objects.create_user(
            email="other@test.com", username="other", password="testpass123"
        )
        self._auth(other_user)
        response = self.client.get(reverse("project_list_create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_delete_project(self):
        self._auth(self.user)
        response = self.client.delete(reverse("project_detail", kwargs={"pk": self.project.id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_project_status_property(self):
        self.assertEqual(self.project.status, "unknown")
