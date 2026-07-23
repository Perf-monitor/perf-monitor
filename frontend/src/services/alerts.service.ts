import apiClient from "@/lib/axios";
import type { Alert, PaginatedResponse } from "@/types";

export const alertsService = {
  async list(params?: Record<string, unknown>): Promise<PaginatedResponse<Alert>> {
    const { data } = await apiClient.get<PaginatedResponse<Alert>>("/alerts/", { params });
    return data;
  },

  async get(id: string): Promise<Alert> {
    const { data } = await apiClient.get<Alert>(`/alerts/${id}/`);
    return data;
  },

  async acknowledge(id: string): Promise<Alert> {
    const { data } = await apiClient.post<Alert>(`/alerts/${id}/acknowledge/`);
    return data;
  },
};
