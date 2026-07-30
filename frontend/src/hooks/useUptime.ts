import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uptimeService } from "@/services/uptime.service";
import type { MonitoredWebsiteFormData, NotificationProvider, UptimeFilterParams } from "@/types";

export const UPTIME_KEYS = {
  all: ["uptime"] as const,
  dashboard: () => [...UPTIME_KEYS.all, "dashboard"] as const,
  websites: () => [...UPTIME_KEYS.all, "websites"] as const,
  websiteList: (params?: UptimeFilterParams) => [...UPTIME_KEYS.websites(), "list", params] as const,
  websiteDetail: (id: string) => [...UPTIME_KEYS.websites(), "detail", id] as const,
  uptimeTrend: (id: string, days: number) => [...UPTIME_KEYS.websites(), "trend", id, days] as const,
  history: (params?: UptimeFilterParams) => [...UPTIME_KEYS.all, "history", params] as const,
  incidents: (params?: UptimeFilterParams) => [...UPTIME_KEYS.all, "incidents", params] as const,
  ssl: () => [...UPTIME_KEYS.all, "ssl"] as const,
  sslHistory: (params?: UptimeFilterParams) => [...UPTIME_KEYS.all, "sslHistory", params] as const,
  sslAlerts: (params?: UptimeFilterParams) => [...UPTIME_KEYS.all, "sslAlerts", params] as const,
  providers: () => [...UPTIME_KEYS.all, "providers"] as const,
};

export function useUptimeDashboard() {
  return useQuery({
    queryKey: UPTIME_KEYS.dashboard(),
    queryFn: uptimeService.getDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMonitoredWebsites(params?: UptimeFilterParams) {
  return useQuery({
    queryKey: UPTIME_KEYS.websiteList(params),
    queryFn: () => uptimeService.listWebsites(params),
    staleTime: 30_000,
  });
}

export function useMonitoredWebsite(id: string) {
  return useQuery({
    queryKey: UPTIME_KEYS.websiteDetail(id),
    queryFn: () => uptimeService.getWebsite(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MonitoredWebsiteFormData) => uptimeService.createWebsite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websites() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.dashboard() });
    },
  });
}

export function useUpdateWebsite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<MonitoredWebsiteFormData>) => uptimeService.updateWebsite(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websites() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websiteDetail(id) });
    },
  });
}

export function useDeleteWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uptimeService.deleteWebsite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websites() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.dashboard() });
    },
  });
}

export function useRunCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uptimeService.runCheck(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websiteDetail(id) });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websites() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.dashboard() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.history() });
    },
  });
}

export function useToggleWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uptimeService.toggleWebsite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.websites() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.dashboard() });
    },
  });
}

export function useBulkAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: string[] }) =>
      uptimeService.bulkAction(action, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.all });
    },
  });
}

export function useUptimeTrend(id: string, days = 30) {
  return useQuery({
    queryKey: UPTIME_KEYS.uptimeTrend(id, days),
    queryFn: () => uptimeService.getUptimeTrend(id, days),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useMonitoringHistory(params?: UptimeFilterParams) {
  return useQuery({
    queryKey: UPTIME_KEYS.history(params),
    queryFn: () => uptimeService.listHistory(params),
    staleTime: 30_000,
  });
}

export function useIncidents(params?: UptimeFilterParams) {
  return useQuery({
    queryKey: UPTIME_KEYS.incidents(params),
    queryFn: () => uptimeService.listIncidents(params),
    staleTime: 30_000,
  });
}

export function useSSLMonitoring() {
  return useQuery({
    queryKey: UPTIME_KEYS.ssl(),
    queryFn: uptimeService.listSSL,
    staleTime: 60_000,
  });
}

export function useSSLHistory(params?: UptimeFilterParams) {
  return useQuery({
    queryKey: UPTIME_KEYS.sslHistory(params),
    queryFn: () => uptimeService.listSSLHistory(params),
    staleTime: 60_000,
  });
}

export function useRunSSLCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uptimeService.runSSLCheck(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.ssl() });
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.sslAlerts() });
    },
  });
}

export function useSSLAlerts(params?: UptimeFilterParams) {
  return useQuery({
    queryKey: UPTIME_KEYS.sslAlerts(params),
    queryFn: () => uptimeService.listSSLAlerts(params),
    staleTime: 30_000,
  });
}

export function useAcknowledgeSSLAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uptimeService.acknowledgeSSLAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UPTIME_KEYS.sslAlerts() });
    },
  });
}

export function useNotificationProviders() {
  return useQuery({
    queryKey: UPTIME_KEYS.providers(),
    queryFn: uptimeService.listProviders,
    staleTime: 60_000,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<NotificationProvider>) => uptimeService.createProvider(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: UPTIME_KEYS.providers() }),
  });
}

export function useUpdateProvider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<NotificationProvider>) => uptimeService.updateProvider(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: UPTIME_KEYS.providers() }),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uptimeService.deleteProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: UPTIME_KEYS.providers() }),
  });
}

export function useTestProvider() {
  return useMutation({
    mutationFn: (id: string) => uptimeService.testProvider(id),
  });
}
