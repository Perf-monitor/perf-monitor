from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="NetworkRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="network_requests", to="reports.performancereport")),
                ("url", models.TextField()),
                ("resource_type", models.CharField(max_length=50)),
                ("status_code", models.IntegerField(null=True, blank=True)),
                ("mime_type", models.CharField(max_length=100, blank=True)),
                ("transfer_size", models.IntegerField(null=True, blank=True)),
                ("resource_size", models.IntegerField(null=True, blank=True)),
                ("duration_ms", models.FloatField(null=True, blank=True)),
                ("start_time_ms", models.FloatField(null=True, blank=True)),
                ("protocol", models.CharField(max_length=20, blank=True)),
                ("priority", models.CharField(max_length=20, blank=True)),
                ("cache", models.CharField(max_length=50, blank=True)),
                ("entity", models.CharField(max_length=255, blank=True)),
                ("finished", models.BooleanField(default=True)),
            ],
            options={"ordering": ["start_time_ms"]},
        ),
    ]
