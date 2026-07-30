from django.contrib import admin
from .models import MonitoredWebsite, MonitoringCheck, Incident, SSLCheck, SSLAlert, NotificationProvider

admin.site.register(MonitoredWebsite)
admin.site.register(MonitoringCheck)
admin.site.register(Incident)
admin.site.register(SSLCheck)
admin.site.register(SSLAlert)
admin.site.register(NotificationProvider)
