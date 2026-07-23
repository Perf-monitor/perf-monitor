from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.projects.models import Project
from apps.reports.models import PerformanceReport
from apps.reports.services import parse_pagespeed_response


MOCK_PAGESPEED_RESPONSE = {
    "lighthouseResult": {
        "categories": {
            "performance": {"score": 0.85},
            "accessibility": {"score": 0.92},
            "seo": {"score": 0.97},
            "best-practices": {"score": 0.83},
        },
        "audits": {
            "largest-contentful-paint": {"numericValue": 2100},
            "cumulative-layout-shift": {"numericValue": 0.05},
            "interaction-to-next-paint": {"numericValue": 150},
            "first-contentful-paint": {"numericValue": 1200},
            "server-response-time": {"numericValue": 180},
            "speed-index": {"numericValue": 3200},
            "total-blocking-time": {"numericValue": 120},
            "uses-optimized-images": {"score": 1.0},
            "uses-text-compression": {"score": 1.0},
        },
    }
}


class ReportParsingTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="user@test.com", username="user", password="testpass123"
        )
        self.project = Project.objects.create(
            name="Test Project",
            url="https://example.com",
            owner=self.user,
        )

    def test_parse_pagespeed_response(self):
        report = parse_pagespeed_response(MOCK_PAGESPEED_RESPONSE, self.project, "mobile")
        self.assertEqual(report.performance_score, 85.0)
        self.assertEqual(report.accessibility_score, 92.0)
        self.assertEqual(report.seo_score, 97.0)
        self.assertEqual(report.best_practices_score, 83.0)
        self.assertEqual(report.lcp, 2100)
        self.assertEqual(report.cls, 0.05)
        self.assertEqual(report.strategy, "mobile")

    def test_report_status_healthy(self):
        report = PerformanceReport.objects.create(
            project=self.project, performance_score=95, strategy="mobile"
        )
        self.assertEqual(report.status, "healthy")

    def test_report_status_warning(self):
        report = PerformanceReport.objects.create(
            project=self.project, performance_score=85, strategy="mobile"
        )
        self.assertEqual(report.status, "warning")

    def test_report_status_critical(self):
        report = PerformanceReport.objects.create(
            project=self.project, performance_score=75, strategy="mobile"
        )
        self.assertEqual(report.status, "critical")

    def test_lcp_status(self):
        report = PerformanceReport.objects.create(
            project=self.project, performance_score=85, lcp=2000, strategy="mobile"
        )
        self.assertEqual(report.lcp_status, "good")

    def test_cls_status_poor(self):
        report = PerformanceReport.objects.create(
            project=self.project, performance_score=85, cls=0.3, strategy="mobile"
        )
        self.assertEqual(report.cls_status, "poor")


class ReportAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="user@test.com", username="user", password="testpass123"
        )
        self.project = Project.objects.create(
            name="Test Project", url="https://example.com", owner=self.user
        )
        self.report = PerformanceReport.objects.create(
            project=self.project,
            performance_score=88,
            accessibility_score=92,
            seo_score=95,
            best_practices_score=83,
            lcp=2100,
            cls=0.05,
            strategy="mobile",
        )
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "user@test.com", "password": "testpass123"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_list_reports(self):
        response = self.client.get(reverse("report_list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_stats(self):
        response = self.client.get(reverse("dashboard_stats"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_projects", response.data)
        self.assertIn("average_performance", response.data)

    def test_project_trend(self):
        response = self.client.get(
            reverse("project_trend", kwargs={"project_id": self.project.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_export_csv(self):
        response = self.client.get(
            reverse("export_csv", kwargs={"project_id": self.project.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
