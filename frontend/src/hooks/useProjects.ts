import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsService } from "@/services/projects.service";
import type { FilterParams, ProjectFormData } from "@/types";

export const PROJECT_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECT_KEYS.all, "list"] as const,
  list: (params?: FilterParams) => [...PROJECT_KEYS.lists(), params] as const,
  detail: (id: string) => [...PROJECT_KEYS.all, "detail", id] as const,
};

export function useProjects(params?: FilterParams) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(params),
    queryFn: () => projectsService.list(params),
    staleTime: 60_000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => projectsService.get(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectFormData) => projectsService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.lists() }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProjectFormData>) => projectsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.lists() }),
  });
}

export function useTriggerScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, strategy }: { projectId: string; strategy?: string }) =>
      projectsService.triggerScan(projectId, strategy),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
