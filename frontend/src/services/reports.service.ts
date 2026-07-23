import apiClient from "@/lib/axios";
import type {
  PerformanceReport,
  DashboardStats,
  TrendDataPoint,
  MonthlyAverage,
  PaginatedResponse,
  FilterParams,
} from "@/types";

export const reportsService = {
  async list(params?: FilterParams): Promise<PaginatedResponse<PerformanceReport>> {
    const { data } = await apiClient.get<PaginatedResponse<PerformanceReport>>("/reports/", { params });
    return data;
  },

  async get(id: string): Promise<PerformanceReport> {
    const { data } = await apiClient.get<PerformanceReport>(`/reports/${id}/`);
    return data;
  },

  async listByProject(projectId: string, params?: FilterParams): Promise<PaginatedResponse<PerformanceReport>> {
    const { data } = await apiClient.get<PaginatedResponse<PerformanceReport>>(
      `/reports/project/${projectId}/`,
      { params }
    );
    return data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>("/dashboard/");
    return data;
  },

  async getTrend(projectId: string, days = 30, strategy = "mobile"): Promise<TrendDataPoint[]> {
    const { data } = await apiClient.get<TrendDataPoint[]>(`/trends/${projectId}/`, {
      params: { days, strategy },
    });
    return data;
  },

  async getMonthlyAverages(): Promise<MonthlyAverage[]> {
    const { data } = await apiClient.get<MonthlyAverage[]>("/analytics/monthly/");
    return data;
  },

  async getHistory(params?: FilterParams): Promise<PerformanceReport[]> {
    const { data } = await apiClient.get<PerformanceReport[]>("/history/", { params });
    return data;
  },

  async compareReports(ids: string[]): Promise<PerformanceReport[]> {
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", id));
    const { data } = await apiClient.get<PerformanceReport[]>(`/reports/compare/?${params}`);
    return data;
  },

  getExportCsvUrl(projectId: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}/api/v1/reports/project/${projectId}/export/csv/`;
  },
};
