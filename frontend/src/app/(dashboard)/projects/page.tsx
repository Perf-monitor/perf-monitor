"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Play, Loader2 } from "lucide-react";
import { useProjects, useDeleteProject, useTriggerScan } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { toast } from "@/components/ui/Toaster";
import {
  formatScore, formatMs, formatCLS, formatRelative,
  getScoreStatus, getFrameworkLabel, getEnvironmentLabel,
  getLcpStatus, getClsStatus, getInpStatus, getSpeedIndexStatus, getTbtStatus, metricStatusColor,
} from "@/lib/utils";
import type { Project, FilterParams } from "@/types";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState("");
  const [environment, setEnvironment] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const params: FilterParams = {
    page,
    search: search || undefined,
    framework: framework || undefined,
    environment: environment || undefined,
  };

  const { data, isLoading, refetch } = useProjects(params);
  const deleteMutation = useDeleteProject();
  const scanMutation = useTriggerScan();

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeletingId(project.id);
    try {
      await deleteMutation.mutateAsync(project.id);
      toast({ title: "Project deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete project", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleScan = async (project: Project) => {
    setScanningId(project.id);
    try {
      const result = await scanMutation.mutateAsync({ projectId: project.id });
      const count = (result as { reports_saved?: number })?.reports_saved ?? 0;
      toast({ title: `Scan complete for ${project.name}`, description: `${count} report${count !== 1 ? "s" : ""} saved.`, variant: "success" });
    } catch {
      toast({ title: "Failed to trigger scan", variant: "destructive" });
    } finally {
      setScanningId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm">{data?.count ?? 0} projects total</p>
        </div>
        <Button onClick={() => { setEditProject(null); setShowModal(true); }} leftIcon={<Plus className="h-4 w-4" />}>
          Add Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search projects…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <select
          value={framework}
          onChange={(e) => { setFramework(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Frameworks</option>
          {["react", "nextjs", "vue", "nuxt", "angular", "svelte", "other"].map((f) => (
            <option key={f} value={f}>{getFrameworkLabel(f)}</option>
          ))}
        </select>
        <select
          value={environment}
          onChange={(e) => { setEnvironment(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Environments</option>
          {["production", "staging", "development", "preview"].map((e) => (
            <option key={e} value={e}>{getEnvironmentLabel(e)}</option>
          ))}
        </select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh" loading={isLoading}>
          {!isLoading && <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Project", "Framework", "Environment", "Perf", "BP", "LCP", "CLS", "INP / TBT", "Load Time", "Status", "Last Scan", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={13} />)  
                : data?.results.map((project) => (
                    <tr key={project.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${project.id}`} className="font-medium hover:text-primary transition-colors">
                          {project.name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{project.url}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{getFrameworkLabel(project.framework)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{project.environment}</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums" style={{ color: project.latest_performance !== null ? (project.latest_performance >= 90 ? "#22c55e" : project.latest_performance >= 80 ? "#f59e0b" : "#ef4444") : undefined }}>
                        {formatScore(project.latest_performance)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatScore(project.latest_best_practices)}</td>
                      <td className="px-4 py-3 tabular-nums text-xs font-medium" style={{ color: metricStatusColor(getLcpStatus(project.latest_lcp)) }}>
                        {formatMs(project.latest_lcp)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs font-medium" style={{ color: metricStatusColor(getClsStatus(project.latest_cls)) }}>
                        {formatCLS(project.latest_cls)}
                      </td>
                      <td
                        className="px-4 py-3 tabular-nums text-xs font-medium"
                        style={{ color: project.latest_inp !== null ? metricStatusColor(getInpStatus(project.latest_inp)) : metricStatusColor(getTbtStatus(project.latest_tbt)) }}
                        title={project.latest_inp !== null ? "INP (real-user field data)" : "TBT shown as INP proxy — real-user INP unavailable for this site"}
                      >
                        {project.latest_inp !== null
                          ? formatMs(project.latest_inp)
                          : project.latest_tbt !== null
                            ? <>{formatMs(project.latest_tbt)}<span className="ml-0.5 text-[10px] opacity-60">TBT</span></>
                            : "—"
                        }
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs font-medium" style={{ color: metricStatusColor(getSpeedIndexStatus(project.latest_speed_index)) }}>
                        {formatMs(project.latest_speed_index)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" status={getScoreStatus(project.latest_performance)}>
                          {project.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelative(project.last_scan)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleScan(project)}
                            disabled={scanningId === project.id || deletingId === project.id}
                            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                            title={scanningId === project.id ? "Scanning…" : "Run scan"}
                          >
                            {scanningId === project.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Play className="h-3.5 w-3.5" />
                            }
                          </button>
                          <Link
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                            title="Open URL"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(project)}
                            disabled={deletingId === project.id || scanningId === project.id}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:pointer-events-none"
                            title={deletingId === project.id ? "Deleting…" : "Delete"}
                          >
                            {deletingId === project.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                    No projects found.{" "}
                    <button onClick={() => setShowModal(true)} className="text-primary hover:underline">
                      Add your first project
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {data.current_page} of {data.total_pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={() => { setShowModal(false); setEditProject(null); }}
        />
      )}
    </div>
  );
}
