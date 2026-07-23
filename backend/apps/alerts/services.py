import logging
import requests
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from .models import Alert

logger = logging.getLogger(__name__)


def _send_email_alert(alert: Alert):
    """Send an email notification for an alert."""
    try:
        send_mail(
            subject=f"[PerfMonitor Alert] {alert.project.name} - {alert.get_alert_type_display()}",
            message=alert.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[alert.project.owner.email],
            fail_silently=False,
        )
        logger.info(f"Email alert sent for {alert.project.name}: {alert.alert_type}")
    except Exception as e:
        logger.error(f"Failed to send email alert: {e}")
        raise


def _send_slack_alert(alert: Alert, webhook_url: str):
    """Send a Slack notification for an alert."""
    color_map = {"low": "#36a64f", "medium": "#f0ad4e", "high": "#d9534f", "critical": "#721c24"}
    payload = {
        "attachments": [
            {
                "color": color_map.get(alert.severity, "#cccccc"),
                "title": f":warning: PerfMonitor Alert: {alert.project.name}",
                "text": alert.message,
                "fields": [
                    {"title": "Project", "value": alert.project.name, "short": True},
                    {"title": "Severity", "value": alert.severity.upper(), "short": True},
                    {"title": "Metric", "value": alert.get_alert_type_display(), "short": True},
                    {"title": "Value", "value": str(alert.value), "short": True},
                    {"title": "Threshold", "value": str(alert.threshold), "short": True},
                    {"title": "URL", "value": alert.project.url, "short": False},
                ],
                "footer": "Performance Monitor",
                "ts": int(alert.created_at.timestamp()),
            }
        ]
    }
    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Slack alert sent for {alert.project.name}")
    except Exception as e:
        logger.error(f"Failed to send Slack alert: {e}")
        raise


@shared_task
def check_and_send_alerts(report_id: str):
    """Check a report against thresholds and create/send alerts."""
    from apps.reports.models import PerformanceReport

    try:
        report = PerformanceReport.objects.select_related("project", "project__owner").get(id=report_id)
    except PerformanceReport.DoesNotExist:
        return

    project = report.project
    alerts_created = []

    perf_threshold = settings.ALERT_PERFORMANCE_THRESHOLD
    lcp_threshold = settings.ALERT_LCP_THRESHOLD
    cls_threshold = settings.ALERT_CLS_THRESHOLD
    inp_threshold = settings.ALERT_INP_THRESHOLD

    checks = [
        (
            report.performance_score < perf_threshold,
            Alert.AlertType.PERFORMANCE,
            report.performance_score,
            perf_threshold,
            f"Performance score {report.performance_score} is below threshold {perf_threshold} for {project.name}",
            Alert.Severity.CRITICAL if report.performance_score < 60 else Alert.Severity.HIGH,
        ),
        (
            report.lcp is not None and report.lcp > lcp_threshold,
            Alert.AlertType.LCP,
            report.lcp or 0,
            lcp_threshold,
            f"LCP {report.lcp}ms exceeds threshold {lcp_threshold}ms for {project.name}",
            Alert.Severity.HIGH,
        ),
        (
            report.cls is not None and report.cls > cls_threshold,
            Alert.AlertType.CLS,
            report.cls or 0,
            cls_threshold,
            f"CLS {report.cls} exceeds threshold {cls_threshold} for {project.name}",
            Alert.Severity.MEDIUM,
        ),
        (
            report.inp is not None and report.inp > inp_threshold,
            Alert.AlertType.INP,
            report.inp or 0,
            inp_threshold,
            f"INP {report.inp}ms exceeds threshold {inp_threshold}ms for {project.name}",
            Alert.Severity.MEDIUM,
        ),
    ]

    for condition, alert_type, value, threshold, message, severity in checks:
        if condition:
            alert = Alert.objects.create(
                project=project,
                report=report,
                alert_type=alert_type,
                severity=severity,
                message=message,
                value=value,
                threshold=threshold,
                channel=Alert.Channel.EMAIL,
            )
            alerts_created.append(alert)

            # Send email
            try:
                _send_email_alert(alert)
                alert.sent = True
                alert.sent_at = timezone.now()
                alert.save(update_fields=["sent", "sent_at"])
            except Exception:
                pass

            # Send Slack
            slack_webhook = settings.SLACK_WEBHOOK_URL
            if slack_webhook:
                try:
                    slack_alert = Alert.objects.create(
                        project=project,
                        report=report,
                        alert_type=alert_type,
                        severity=severity,
                        message=message,
                        value=value,
                        threshold=threshold,
                        channel=Alert.Channel.SLACK,
                    )
                    _send_slack_alert(slack_alert, slack_webhook)
                    slack_alert.sent = True
                    slack_alert.sent_at = timezone.now()
                    slack_alert.save(update_fields=["sent", "sent_at"])
                except Exception:
                    pass

    logger.info(f"Alerts processed for report {report_id}: {len(alerts_created)} alerts created")
    return len(alerts_created)
