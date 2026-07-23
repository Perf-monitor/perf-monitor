import apiClient from "@/lib/axios";
import type { Project, ProjectFormData, PaginatedResponse, FilterParams } from "@/types";

export const projectsService = {
  async list(params?: FilterParams): Promise<PaginatedResponse<Project>> {
    const { data } = await apiClient.get<PaginatedResponse<Project>>("/projects/", { params });
    return data;
  },

  async get(id: string): Promise<Project> {
    const { data } = await apiClient.get<Project>(`/projects/${id}/`);
    return data;
  },

  async create(payload: ProjectFormData): Promise<Project> {
    const { data } = await apiClient.post<Project>("/projects/", payload);
    return data;
  },

  async update(id: string, payload: Partial<ProjectFormData>): Promise<Project> {
    const { data } = await apiClient.patch<Project>(`/projects/${id}/`, payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}/`);
  },

  async triggerScan(
    projectId: string,
    strategy = "both"
  ): Promise<{ message: string; project_id: string; reports_saved: number; reports: unknown[] }> {
    const { data } = await apiClient.post(`/scan/${projectId}/`, { strategy }, { timeout: 120000 });
    return data;
  },
};
