import apiClient from "@/lib/axios";
import type { RumApplication, RumDashboard, RumApiStat, RumEvent } from "@/types";

export const rumService = {
  async listApps(): Promise<RumApplication[]> {
    const { data } = await apiClient.get<RumApplication[]>("/rum/apps/");
    return data;
  },

  async createApp(payload: { name: string; environment: string; version?: string; allowed_origins?: string }): Promise<RumApplication> {
    const { data } = await apiClient.post<RumApplication>("/rum/apps/", payload);
    return data;
  },

  async deleteApp(id: string): Promise<void> {
    await apiClient.delete(`/rum/apps/${id}/`);
  },

  async getDashboard(params?: { app_id?: string; hours?: number }): Promise<RumDashboard> {
    const { data } = await apiClient.get<RumDashboard>("/rum/dashboard/", { params });
    return data;
  },

  async getApis(params?: { app_id?: string; hours?: number }): Promise<{ results: RumApiStat[]; count: number }> {
    const { data } = await apiClient.get("/rum/apis/", { params });
    return data;
  },

  async getErrors(params?: { app_id?: string; hours?: number }): Promise<{ count: number; results: RumEvent[] }> {
    const { data } = await apiClient.get("/rum/errors/", { params });
    return data;
  },

  async getSlow(params?: { app_id?: string; hours?: number; threshold?: number }): Promise<{ count: number; threshold_ms: number; results: RumEvent[] }> {
    const { data } = await apiClient.get("/rum/slow/", { params });
    return data;
  },

  async getLive(): Promise<{ results: RumEvent[] }> {
    const { data } = await apiClient.get("/rum/live/");
    return data;
  },

  async getActiveUsers(params?: { app_id?: string }): Promise<{ count: number; results: object[] }> {
    const { data } = await apiClient.get("/rum/users/", { params });
    return data;
  },
};
