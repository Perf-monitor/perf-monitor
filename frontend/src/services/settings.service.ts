import apiClient from "@/lib/axios";
import type { AppSettings } from "@/types";

export const settingsService = {
  async get(): Promise<AppSettings> {
    const { data } = await apiClient.get<AppSettings>("/settings/");
    return data;
  },

  async update(payload: Partial<AppSettings> & { google_api_key?: string }): Promise<AppSettings> {
    const { data } = await apiClient.patch<AppSettings>("/settings/", payload);
    return data;
  },
};
