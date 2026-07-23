from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters import rest_framework as filters
from .models import Alert
from .serializers import AlertSerializer


class AlertFilter(filters.FilterSet):
    project = filters.UUIDFilter()
    alert_type = filters.ChoiceFilter(choices=Alert.AlertType.choices)
    severity = filters.ChoiceFilter(choices=Alert.Severity.choices)
    sent = filters.BooleanFilter()
    acknowledged = filters.BooleanFilter()
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Alert
        fields = ["project", "alert_type", "severity", "sent", "acknowledged"]


class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = AlertFilter
    ordering_fields = ["created_at", "severity"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Alert.objects.select_related("project").all()
        return Alert.objects.select_related("project").filter(project__owner=user)


class AlertDetailView(generics.RetrieveAPIView):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Alert.objects.all()
        return Alert.objects.filter(project__owner=user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def acknowledge_alert(request, pk):
    try:
        user = request.user
        if user.is_admin:
            alert = Alert.objects.get(id=pk)
        else:
            alert = Alert.objects.get(id=pk, project__owner=user)
    except Alert.DoesNotExist:
        return Response({"error": "Alert not found."}, status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    alert.acknowledged = True
    alert.acknowledged_at = timezone.now()
    alert.save(update_fields=["acknowledged", "acknowledged_at"])
    return Response(AlertSerializer(alert).data)
