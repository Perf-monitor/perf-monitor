import apiClient from "@/lib/axios";
import type {
  MonitoredWebsite,
  MonitoredWebsiteFormData,
  MonitoringCheck,
  Incident,
  SSLCheck,
  SSLAlert,
  NotificationProvider,
  UptimeDashboardStats,
  PaginatedResponse,
  UptimeFilterParams,
} from "@/types";

export const uptimeService = {
  // Dashboard
  async getDashboard(): Promise<UptimeDashboardStats> {
    const { data } = await apiClient.get<UptimeDashboardStats>("/uptime/dashboard/");
    return data;
  },

  // Websites
  async listWebsites(params?: UptimeFilterParams): Promise<PaginatedResponse<MonitoredWebsite>> {
    const { data } = await apiClient.get<PaginatedResponse<MonitoredWebsite>>("/uptime/websites/", { params });
    return data;
  },

  async getWebsite(id: string): Promise<MonitoredWebsite> {
    const { data } = await apiClient.get<MonitoredWebsite>(`/uptime/websites/${id}/`);
    return data;
  },

  async createWebsite(payload: MonitoredWebsiteFormData): Promise<MonitoredWebsite> {
    const { data } = await apiClient.post<MonitoredWebsite>("/uptime/websites/", payload);
    return data;
  },

  async updateWebsite(id: string, payload: Partial<MonitoredWebsiteFormData>): Promise<MonitoredWebsite> {
    const { data } = await apiClient.patch<MonitoredWebsite>(`/uptime/websites/${id}/`, payload);
    return data;
  },

  async deleteWebsite(id: string): Promise<void> {
    await apiClient.delete(`/uptime/websites/${id}/`);
  },

  async runCheck(id: string): Promise<{ check: MonitoringCheck; ssl_check: SSLCheck | null }> {
    const { data } = await apiClient.post(`/uptime/websites/${id}/check/`);
    return data;
  },

  async toggleWebsite(id: string): Promise<{ active: boolean }> {
    const { data } = await apiClient.post(`/uptime/websites/${id}/toggle/`);
    return data;
  },

  async bulkAction(action: string, ids: string[]): Promise<unknown> {
    const { data } = await apiClient.post("/uptime/websites/bulk/", { action, ids });
    return data;
  },

  async getUptimeTrend(id: string, days = 30): Promise<{ checks: { checked_at: string; status: string; response_time_ms: number | null }[] }> {
    const { data } = await apiClient.get(`/uptime/websites/${id}/uptime-trend/`, { params: { days } });
    return data;
  },

  // History
  async listHistory(params?: UptimeFilterParams): Promise<PaginatedResponse<MonitoringCheck & { website_name?: string; website_url?: string }>> {
    const { data } = await apiClient.get("/uptime/history/", { params });
    return data;
  },

  // Incidents
  async listIncidents(params?: UptimeFilterParams): Promise<PaginatedResponse<Incident>> {
    const { data } = await apiClient.get<PaginatedResponse<Incident>>("/uptime/incidents/", { params });
    return data;
  },

  // SSL
  async listSSL(): Promise<{ count: number; results: SSLCheck[] }> {
    const { data } = await apiClient.get("/uptime/ssl/");
    return data;
  },

  async listSSLHistory(params?: UptimeFilterParams): Promise<PaginatedResponse<SSLCheck>> {
    const { data } = await apiClient.get<PaginatedResponse<SSLCheck>>("/uptime/ssl/history/", { params });
    return data;
  },

  async runSSLCheck(id: string): Promise<SSLCheck> {
    const { data } = await apiClient.post<SSLCheck>(`/uptime/websites/${id}/ssl-check/`);
    return data;
  },

  // SSL Alerts
  async listSSLAlerts(params?: UptimeFilterParams): Promise<PaginatedResponse<SSLAlert>> {
    const { data } = await apiClient.get<PaginatedResponse<SSLAlert>>("/uptime/ssl-alerts/", { params });
    return data;
  },

  async acknowledgeSSLAlert(id: string): Promise<SSLAlert> {
    const { data } = await apiClient.patch<SSLAlert>(`/uptime/ssl-alerts/${id}/acknowledge/`);
    return data;
  },

  // Notification Providers
  async listProviders(): Promise<NotificationProvider[]> {
    const { data } = await apiClient.get<NotificationProvider[]>("/uptime/notifications/");
    return data;
  },

  async createProvider(payload: Partial<NotificationProvider>): Promise<NotificationProvider> {
    const { data } = await apiClient.post<NotificationProvider>("/uptime/notifications/", payload);
    return data;
  },

  async updateProvider(id: string, payload: Partial<NotificationProvider>): Promise<NotificationProvider> {
    const { data } = await apiClient.patch<NotificationProvider>(`/uptime/notifications/${id}/`, payload);
    return data;
  },

  async deleteProvider(id: string): Promise<void> {
    await apiClient.delete(`/uptime/notifications/${id}/`);
  },

  async testProvider(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post(`/uptime/notifications/${id}/test/`);
    return data;
  },
};
