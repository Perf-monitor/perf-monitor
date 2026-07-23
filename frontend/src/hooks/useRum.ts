import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rumService } from "@/services/rum.service";

const RUM_KEYS = {
  apps: () => ["rum", "apps"] as const,
  dashboard: (appId?: string, hours?: number) => ["rum", "dashboard", appId, hours] as const,
  apis: (appId?: string, hours?: number) => ["rum", "apis", appId, hours] as const,
  errors: (appId?: string, hours?: number) => ["rum", "errors", appId, hours] as const,
  slow: (appId?: string, hours?: number, threshold?: number) => ["rum", "slow", appId, hours, threshold] as const,
  live: () => ["rum", "live"] as const,
  users: (appId?: string) => ["rum", "users", appId] as const,
};

export function useRumApps() {
  return useQuery({ queryKey: RUM_KEYS.apps(), queryFn: rumService.listApps, staleTime: 30_000 });
}

export function useCreateRumApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rumService.createApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: RUM_KEYS.apps() }),
  });
}

export function useDeleteRumApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rumService.deleteApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: RUM_KEYS.apps() }),
  });
}

export function useRumDashboard(appId?: string, hours = 24) {
  return useQuery({
    queryKey: RUM_KEYS.dashboard(appId, hours),
    queryFn: () => rumService.getDashboard({ app_id: appId, hours }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useRumApis(appId?: string, hours = 24) {
  return useQuery({
    queryKey: RUM_KEYS.apis(appId, hours),
    queryFn: () => rumService.getApis({ app_id: appId, hours }),
    staleTime: 15_000,
  });
}

export function useRumErrors(appId?: string, hours = 24) {
  return useQuery({
    queryKey: RUM_KEYS.errors(appId, hours),
    queryFn: () => rumService.getErrors({ app_id: appId, hours }),
    staleTime: 15_000,
  });
}

export function useRumSlow(appId?: string, hours = 24, threshold = 1000) {
  return useQuery({
    queryKey: RUM_KEYS.slow(appId, hours, threshold),
    queryFn: () => rumService.getSlow({ app_id: appId, hours, threshold }),
    staleTime: 15_000,
  });
}

export function useRumLive() {
  return useQuery({
    queryKey: RUM_KEYS.live(),
    queryFn: rumService.getLive,
    staleTime: 0,
    refetchInterval: 5_000,
  });
}

export function useRumActiveUsers(appId?: string) {
  return useQuery({
    queryKey: RUM_KEYS.users(appId),
    queryFn: () => rumService.getActiveUsers({ app_id: appId }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
