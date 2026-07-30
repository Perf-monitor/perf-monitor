"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, RefreshCw, Eye, Power, Globe,
  AlertTriangle, MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import {
  useMonitoredWebsites, useCreateWebsite, useUpdateWebsite,
  useDeleteWebsite, useRunCheck, useToggleWebsite, useBulkAction,
} from "@/hooks/useUptime";
import type { MonitoredWebsite, MonitoredWebsiteFormData, UptimeFilterParams } from "@/types";
import { formatRelative } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  up: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  down: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  timeout: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  unknown: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const SSL_COLORS: Record<string, string> = {
  healthy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  expiring_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  invalid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  hostname_mismatch: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  handshake_failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  disabled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

function WebsiteFormModal({
  initial,
  onClose,
  onSave,
  loading,
}: {
  initial?: Partial<MonitoredWebsite>;
  onClose: () => void;
  onSave: (data: MonitoredWebsiteFormData) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<MonitoredWebsiteFormData>({
    name: initial?.name ?? "",
    url: initial?.url ?? "",
    protocol: initial?.protocol ?? "https",
    check_interval: initial?.check_interval ?? 5,
    active: initial?.active ?? true,
    ssl_monitoring: initial?.ssl_monitoring ?? true,
    ssl_expiry_alert_days: initial?.ssl_expiry_alert_days ?? 30,
    timeout_seconds: initial?.timeout_seconds ?? 30,
    expected_status_code: initial?.expected_status_code ?? 200,
    keyword_check: initial?.keyword_check ?? "",
    verify_ssl: initial?.verify_ssl ?? true,
    notes: initial?.notes ?? "",
  });

  const set = (k: keyof MonitoredWebsiteFormData, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-xl space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-bold">{initial?.id ? "Edit Website" : "Add Website"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="My Website" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">URL *</label>
            <input value={form.url} onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.com" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Protocol</label>
            <select value={form.protocol} onChange={(e) => set("protocol", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="https">HTTPS</option>
              <option value="http">HTTP</option>
              <option value="tcp">TCP</option>
              <option value="ping">PING</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Check Interval</label>
            <select value={form.check_interval} onChange={(e) => set("check_interval", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value={1}>Every 1 min</option>
              <option value={5}>Every 5 min</option>
              <option value={10}>Every 10 min</option>
              <option value={30}>Every 30 min</option>
              <option value={60}>Every 1 hour</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Timeout (seconds)</label>
            <input type="number" value={form.timeout_seconds} onChange={(e) => set("timeout_seconds", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Status Code</label>
            <input type="number" value={form.expected_status_code} onChange={(e) => set("expected_status_code", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Keyword Check</label>
            <input value={form.keyword_check} onChange={(e) => set("keyword_check", e.target.value)}
              placeholder="Optional: keyword that must appear in response"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">SSL Alert Days</label>
            <input type="number" value={form.ssl_expiry_alert_days} onChange={(e) => set("ssl_expiry_alert_days", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="flex items-center gap-4 pt-5 flex-wrap">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.ssl_monitoring} onChange={(e) => set("ssl_monitoring", e.target.checked)} className="rounded" />
              SSL Monitoring
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" title="Uncheck for self-signed or internal certificates">
              <input type="checkbox" checked={form.verify_ssl ?? true} onChange={(e) => set("verify_ssl", e.target.checked)} className="rounded" />
              Verify SSL Chain
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={loading} onClick={() => onSave(form)}>
            {initial?.id ? "Save Changes" : "Add Website"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UptimePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editWebsite, setEditWebsite] = useState<MonitoredWebsite | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const params: UptimeFilterParams = {
    page,
    page_size: 20,
    search: search || undefined,
    active: activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
  };

  const { data, isLoading, refetch } = useMonitoredWebsites(params);
  const createWebsite = useCreateWebsite();
  const deleteWebsite = useDeleteWebsite();
  const runCheck = useRunCheck();
  const toggleWebsite = useToggleWebsite();
  const bulkAction = useBulkAction();

  const allIds = data?.results.map((w) => w.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(allSelected ? [] : allIds);

  const handleCreate = async (form: MonitoredWebsiteFormData) => {
    try {
      await createWebsite.mutateAsync(form);
      toast({ title: "Website added", variant: "success" });
      setShowForm(false);
    } catch {
      toast({ title: "Failed to add website", variant: "destructive" });
    }
  };

  const handleDelete = async (w: MonitoredWebsite) => {
    if (!confirm(`Delete "${w.name}"? All checks and incidents will be removed.`)) return;
    try {
      await deleteWebsite.mutateAsync(w.id);
      toast({ title: "Website deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleRunCheck = async (id: string) => {
    setCheckingId(id);
    try {
      const result = await runCheck.mutateAsync(id);
      toast({
        title: `Check complete: ${result.check.status.toUpperCase()}`,
        variant: result.check.status === "up" ? "success" : "destructive",
      });
    } catch {
      toast({ title: "Check failed", variant: "destructive" });
    } finally {
      setCheckingId(null);
    }
  };

  const handleToggle = async (w: MonitoredWebsite) => {
    try {
      await toggleWebsite.mutateAsync(w.id);
      toast({ title: `Monitoring ${w.active ? "disabled" : "enabled"}`, variant: "success" });
    } catch {
      toast({ title: "Failed to toggle", variant: "destructive" });
    }
  };

  const handleBulk = async (action: string) => {
    if (selected.length === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.length} website(s)?`)) return;
    try {
      await bulkAction.mutateAsync({ action, ids: selected });
      toast({ title: `Bulk ${action} applied`, variant: "success" });
      setSelected([]);
      refetch();
    } catch {
      toast({ title: "Bulk action failed", variant: "destructive" });
    }
  };

  const filtered = (data?.results ?? []).filter((w) => {
    if (statusFilter && w.current_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {(showForm) && (
        <WebsiteFormModal
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
          loading={createWebsite.isPending}
        />
      )}
      {editWebsite && (
        <EditWebsiteModal
          website={editWebsite}
          onClose={() => setEditWebsite(null)}
          onRefresh={() => refetch()}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Uptime Monitoring</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor your websites</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
          Add Website
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or URL…"
                className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">All Statuses</option>
              <option value="up">UP</option>
              <option value="down">DOWN</option>
              <option value="timeout">Timeout</option>
              <option value="error">Error</option>
            </select>
            <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {selected.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">{selected.length} selected</span>
                <Button size="sm" variant="outline" onClick={() => handleBulk("run_check")} loading={bulkAction.isPending}>Run Check</Button>
                <Button size="sm" variant="outline" onClick={() => handleBulk("enable")}>Enable</Button>
                <Button size="sm" variant="outline" onClick={() => handleBulk("disable")}>Disable</Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulk("delete")} loading={bulkAction.isPending}>Delete</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">
            {data ? `${data.count} website${data.count !== 1 ? "s" : ""}` : "Websites"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                  </th>
                  {["Website", "Status", "Response Time", "Last Checked", "Uptime %", "SSL", "Incident", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No websites found.{" "}
                      <button onClick={() => setShowForm(true)} className="text-primary hover:underline">Add your first website</button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((w) => (
                    <tr key={w.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggleSelect(w.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${w.active ? "bg-green-500" : "bg-gray-400"}`} />
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[160px]">{w.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{w.url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[w.current_status] ?? STATUS_COLORS.unknown}`}>
                          {w.current_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-sm">
                        {w.latest_response_time != null ? `${Math.round(w.latest_response_time)}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {w.last_checked ? formatRelative(w.last_checked) : "Never"}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-sm">
                        {w.uptime_percentage != null ? `${w.uptime_percentage}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SSL_COLORS[w.ssl_status] ?? SSL_COLORS.unknown}`}>
                          {w.ssl_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {w.active_incident ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/uptime-monitoring/uptime/${w.id}`}>
                            <Button variant="ghost" size="icon" title="View Details">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost" size="icon"
                            loading={checkingId === w.id}
                            onClick={() => handleRunCheck(w.id)}
                            title="Run Check"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleToggle(w)}
                            title={w.active ? "Disable" : "Enable"}
                          >
                            <Power className={`h-3.5 w-3.5 ${w.active ? "text-green-500" : "text-gray-400"}`} />
                          </Button>
                          <div className="relative">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setOpenMenuId(openMenuId === w.id ? null : w.id)}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                            {openMenuId === w.id && (
                              <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[100px]">
                                <button
                                  onClick={() => { setEditWebsite(w); setOpenMenuId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                                >Edit</button>
                                <button
                                  onClick={() => { handleDelete(w); setOpenMenuId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-accent transition-colors"
                                >Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {data.current_page} of {data.total_pages} ({data.count} total)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditWebsiteModal({ website, onClose, onRefresh }: {
  website: MonitoredWebsite;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState<MonitoredWebsiteFormData>({
    name: website.name,
    url: website.url,
    protocol: website.protocol,
    check_interval: website.check_interval,
    active: website.active,
    ssl_monitoring: website.ssl_monitoring,
    ssl_expiry_alert_days: website.ssl_expiry_alert_days,
    timeout_seconds: website.timeout_seconds,
    expected_status_code: website.expected_status_code,
    keyword_check: website.keyword_check,
    verify_ssl: website.verify_ssl,
    notes: website.notes,
  });
  const update = useUpdateWebsite(website.id);

  const set = (k: keyof MonitoredWebsiteFormData, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      await update.mutateAsync(form);
      toast({ title: "Website updated", variant: "success" });
      onRefresh();
      onClose();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-xl space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-bold">Edit Website</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">URL</label>
            <input value={form.url} onChange={(e) => set("url", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Protocol</label>
            <select value={form.protocol} onChange={(e) => set("protocol", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="https">HTTPS</option>
              <option value="http">HTTP</option>
              <option value="tcp">TCP</option>
              <option value="ping">PING</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Check Interval</label>
            <select value={form.check_interval} onChange={(e) => set("check_interval", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value={1}>Every 1 min</option>
              <option value={5}>Every 5 min</option>
              <option value={10}>Every 10 min</option>
              <option value={30}>Every 30 min</option>
              <option value={60}>Every 1 hour</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Timeout (seconds)</label>
            <input type="number" value={form.timeout_seconds} onChange={(e) => set("timeout_seconds", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Status Code</label>
            <input type="number" value={form.expected_status_code} onChange={(e) => set("expected_status_code", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Keyword Check</label>
            <input value={form.keyword_check} onChange={(e) => set("keyword_check", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">SSL Alert Days</label>
            <input type="number" value={form.ssl_expiry_alert_days} onChange={(e) => set("ssl_expiry_alert_days", Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="flex items-center gap-4 pt-5 flex-wrap">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.ssl_monitoring} onChange={(e) => set("ssl_monitoring", e.target.checked)} className="rounded" />
              SSL Monitoring
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" title="Uncheck for self-signed or internal certificates">
              <input type="checkbox" checked={form.verify_ssl ?? true} onChange={(e) => set("verify_ssl", e.target.checked)} className="rounded" />
              Verify SSL Chain
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={update.isPending} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
