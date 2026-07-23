import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import type { FilterParams } from "@/types";

export const REPORT_KEYS = {
  all: ["reports"] as const,
  dashboard: () => ["dashboard"] as const,
  list: (params?: FilterParams) => [...REPORT_KEYS.all, "list", params] as const,
  byProject: (projectId: string, params?: FilterParams) =>
    [...REPORT_KEYS.all, "project", projectId, params] as const,
  detail: (id: string) => [...REPORT_KEYS.all, "detail", id] as const,
  trend: (projectId: string, days: number, strategy: string) =>
    [...REPORT_KEYS.all, "trend", projectId, days, strategy] as const,
  monthly: () => [...REPORT_KEYS.all, "monthly"] as const,
  history: (params?: FilterParams) => [...REPORT_KEYS.all, "history", params] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: REPORT_KEYS.dashboard(),
    queryFn: reportsService.getDashboardStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useReports(params?: FilterParams) {
  return useQuery({
    queryKey: REPORT_KEYS.list(params),
    queryFn: () => reportsService.list(params),
    staleTime: 30_000,
  });
}

export function useProjectReports(projectId: string, params?: FilterParams) {
  return useQuery({
    queryKey: REPORT_KEYS.byProject(projectId, params),
    queryFn: () => reportsService.listByProject(projectId, params),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: REPORT_KEYS.detail(id),
    queryFn: () => reportsService.get(id),
    enabled: !!id,
  });
}

export function useProjectTrend(projectId: string, days = 30, strategy = "mobile") {
  return useQuery({
    queryKey: REPORT_KEYS.trend(projectId, days, strategy),
    queryFn: () => reportsService.getTrend(projectId, days, strategy),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useMonthlyAverages() {
  return useQuery({
    queryKey: REPORT_KEYS.monthly(),
    queryFn: reportsService.getMonthlyAverages,
    staleTime: 300_000,
  });
}

export function useHistory(params?: FilterParams) {
  return useQuery({
    queryKey: REPORT_KEYS.history(params),
    queryFn: () => reportsService.getHistory(params),
    staleTime: 30_000,
  });
}
