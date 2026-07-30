"use client";

import React, { useState } from "react";
import {
  Activity, Plus, Trash2, Copy, Check, Wifi,
  AlertTriangle, Clock, Users, TrendingUp, CheckCircle, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import {
  useRumApps, useCreateRumApp, useDeleteRumApp,
  useRumDashboard, useRumApis, useRumErrors, useRumSlow, useRumLive,
} from "@/hooks/useRum";
import type { RumApplication } from "@/types";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700", POST: "bg-green-100 text-green-700",
    PUT: "bg-yellow-100 text-yellow-700", PATCH: "bg-orange-100 text-orange-700",
    DELETE: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[method] ?? "bg-muted text-muted-foreground"}`}>
      {method}
    </span>
  );
}

function CopyApiKey({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
      <span className="truncate max-w-[140px]">{apiKey.slice(0, 12)}…</span>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CreateAppModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [env, setEnv] = useState("production");
  const [version, setVersion] = useState("1.0.0");
  const create = useCreateRumApp();

  const submit = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), environment: env, version });
      toast({ title: "App created", description: `${name} is ready to monitor.`, variant: "success" });
      onClose();
    } catch {
      toast({ title: "Failed to create app", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl space-y-4">
        <h2 className="text-lg font-bold">New RUM Application</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">App Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="My React App" autoFocus
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Environment</label>
            <select value={env} onChange={e => setEnv(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
              <option value="qa">QA</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Version</label>
            <input value={version} onChange={e => setVersion(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={create.isPending} onClick={submit}>Create App</Button>
        </div>
      </div>
    </div>
  );
}

function IntegrationSnippet({ app }: { app: RumApplication }) {
  const endpoint = process.env.NEXT_PUBLIC_API_URL || "https://api-v1.cameeto.com";
  const reactSnippet = `import { initMonitoring } from "@perfmonitor/rum-sdk";

initMonitoring({
  apiKey: "${app.api_key}",
  appName: "${app.name}",
  environment: "${app.environment}",
  endpoint: "${endpoint}/api/v1/rum/events/",
});`;

  const htmlSnippet = `<script src="/monitor-sdk.min.js"></script>
<script>
  Monitoring.init({
    apiKey: "${app.api_key}",
    appName: "${app.name}",
    endpoint: "${endpoint}/api/v1/rum/events/",
  });
</script>`;

  const [tab, setTab] = useState<"react" | "html">("react");
  const [copied, setCopied] = useState(false);
  const snippet = tab === "react" ? reactSnippet : htmlSnippet;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["react", "html"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {t === "react" ? "React / Next.js" : "HTML"}
            </button>
          ))}
        </div>
        <button onClick={copy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap overflow-x-auto">{snippet}</pre>
    </div>
  );
}

export default function MonitoringPage() {
  const [selectedApp, setSelectedApp] = useState<string | undefined>();
  const [hours, setHours] = useState(24);
  const [activeTab, setActiveTab] = useState<"overview" | "apis" | "errors" | "slow" | "live" | "apps">("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: apps = [], isLoading: appsLoading } = useRumApps();
  const { data: dashboard, isLoading: dashLoading } = useRumDashboard(selectedApp, hours);
  const { data: apisData, isLoading: apisLoading } = useRumApis(selectedApp, hours);
  const { data: errorsData, isLoading: errorsLoading } = useRumErrors(selectedApp, hours);
  const { data: slowData, isLoading: slowLoading } = useRumSlow(selectedApp, hours, 1000);
  const { data: liveData, isLoading: liveLoading } = useRumLive();
  const deleteApp = useDeleteRumApp();

  const handleDelete = async (app: RumApplication) => {
    if (!confirm(`Delete "${app.name}"? This removes all its events.`)) return;
    setDeletingId(app.id);
    try {
      await deleteApp.mutateAsync(app.id);
      toast({ title: "App deleted", variant: "success" });
      if (selectedApp === app.id) setSelectedApp(undefined);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "apis", label: "APIs" },
    { key: "errors", label: "Errors" },
    { key: "slow", label: "Slow" },
    { key: "live", label: "Live", dot: true },
    { key: "apps", label: "Applications" },
  ] as const;

  return (
    <div className="space-y-6">
      {showCreate && <CreateAppModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">RUM Monitor</h1>
            <p className="text-sm text-muted-foreground">Real User Monitoring — API calls across all apps</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedApp ?? ""} onChange={e => setSelectedApp(e.target.value || undefined)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Applications</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={hours} onChange={e => setHours(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value={1}>Last 1h</option>
            <option value={6}>Last 6h</option>
            <option value={24}>Last 24h</option>
            <option value={72}>Last 3d</option>
            <option value={168}>Last 7d</option>
          </select>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            New App
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
            {(t as any).dot && (
              <span className="absolute top-2 right-1 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {dashLoading ? [...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : dashboard ? (<>
              <StatCard label="Total API Calls" value={dashboard.total_calls.toLocaleString()} sub={`last ${hours}h`} icon={Activity} color="bg-blue-500" />
              <StatCard label="Active Users" value={dashboard.active_users} sub="last 30 min" icon={Users} color="bg-violet-500" />
              <StatCard label="Avg Response" value={`${dashboard.avg_response_time_ms}ms`} sub={`max ${dashboard.max_response_time_ms}ms`} icon={Clock} color="bg-amber-500" />
              <StatCard label="RPM" value={dashboard.rpm} sub="requests / min" icon={TrendingUp} color="bg-cyan-500" />
              <StatCard label="Error Rate" value={`${dashboard.error_rate}%`} sub={`${dashboard.total_errors} errors`} icon={AlertTriangle} color="bg-red-500" />
              <StatCard label="Success Rate" value={`${dashboard.success_rate}%`} icon={CheckCircle} color="bg-green-500" />
              <StatCard label="Min Response" value={`${dashboard.min_response_time_ms}ms`} icon={TrendingUp} color="bg-teal-500" />
              <StatCard label="Max Response" value={`${dashboard.max_response_time_ms}ms`} icon={Clock} color="bg-orange-500" />
            </>) : (
              <div className="col-span-4 text-center py-12 text-muted-foreground">
                No data yet. Create an app, integrate the SDK, and run your application.
              </div>
            )}
          </div>

          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Status Codes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.status_distribution.length === 0
                    ? <p className="text-xs text-muted-foreground">No data</p>
                    : dashboard.status_distribution.map(s => (
                      <div key={s.status_code} className="flex items-center justify-between text-sm">
                        <span className={`font-mono font-bold ${s.status_code >= 500 ? "text-red-500" : s.status_code >= 400 ? "text-orange-500" : s.status_code >= 300 ? "text-yellow-500" : "text-green-500"}`}>
                          {s.status_code}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-muted w-24 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((s.count / dashboard.total_calls) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{s.count}</span>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Browser distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Browsers</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.browser_distribution.length === 0
                    ? <p className="text-xs text-muted-foreground">No sessions yet</p>
                    : dashboard.browser_distribution.map(b => (
                      <div key={b.browser_name} className="flex items-center justify-between text-sm">
                        <span>{b.browser_name}</span>
                        <span className="text-xs text-muted-foreground">{b.count}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Device distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Devices</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.device_distribution.length === 0
                    ? <p className="text-xs text-muted-foreground">No sessions yet</p>
                    : dashboard.device_distribution.map(d => (
                      <div key={d.device_type} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{d.device_type}</span>
                        <span className="text-xs text-muted-foreground">{d.count}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── APIs ─────────────────────────────────────────────────────────── */}
      {activeTab === "apis" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">API Performance — Top {apisData?.count ?? 0} endpoints</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Method", "API URL", "Calls", "Avg", "Min", "Max", "Errors", "Success %"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apisLoading
                    ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-2"><Skeleton className="h-3" /></td>)}</tr>)
                    : apisData?.results.length === 0
                      ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No API events yet. Integrate the SDK and trigger some requests.</td></tr>
                      : apisData?.results.map((api, i) => (
                        <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2"><MethodBadge method={api.method} /></td>
                          <td className="px-4 py-2 max-w-[280px]"><span className="truncate block font-mono" title={api.api_url}>{api.api_url}</span></td>
                          <td className="px-4 py-2 tabular-nums font-medium">{api.calls.toLocaleString()}</td>
                          <td className="px-4 py-2 tabular-nums">{api.avg_time}ms</td>
                          <td className="px-4 py-2 tabular-nums text-green-600">{api.min_time}ms</td>
                          <td className="px-4 py-2 tabular-nums text-red-500">{api.max_time}ms</td>
                          <td className="px-4 py-2 tabular-nums" style={{ color: api.error_count > 0 ? "#ef4444" : undefined }}>{api.error_count}</td>
                          <td className="px-4 py-2 tabular-nums font-medium" style={{ color: api.success_pct >= 99 ? "#22c55e" : api.success_pct >= 95 ? "#f59e0b" : "#ef4444" }}>
                            {api.success_pct}%
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Errors ───────────────────────────────────────────────────────── */}
      {activeTab === "errors" && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-red-500">Failed Requests — {errorsData?.count ?? 0} errors</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Status", "Method", "URL", "Error", "Response Time", "Time"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errorsLoading
                    ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2"><Skeleton className="h-3" /></td>)}</tr>)
                    : errorsData?.results.length === 0
                      ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No errors in this time window. 🎉</td></tr>
                      : errorsData?.results.map(ev => (
                        <tr key={ev.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 font-bold text-red-500">{ev.status_code ?? "—"}</td>
                          <td className="px-4 py-2"><MethodBadge method={ev.method} /></td>
                          <td className="px-4 py-2 max-w-[240px]"><span className="truncate block font-mono" title={ev.api_url}>{ev.api_url}</span></td>
                          <td className="px-4 py-2 text-red-400 max-w-[180px]"><span className="truncate block" title={ev.error_message}>{ev.error_message || "—"}</span></td>
                          <td className="px-4 py-2 tabular-nums">{ev.response_time_ms != null ? `${ev.response_time_ms}ms` : "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Slow ─────────────────────────────────────────────────────────── */}
      {activeTab === "slow" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-amber-500">Slow Requests — {slowData?.count ?? 0} above {slowData?.threshold_ms ?? 1000}ms</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Method", "URL", "Response Time", "Status", "Page", "Time"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slowLoading
                    ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2"><Skeleton className="h-3" /></td>)}</tr>)
                    : slowData?.results.length === 0
                      ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No slow requests. Your APIs are fast! ⚡</td></tr>
                      : slowData?.results.map(ev => (
                        <tr key={ev.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2"><MethodBadge method={ev.method} /></td>
                          <td className="px-4 py-2 max-w-[240px]"><span className="truncate block font-mono" title={ev.api_url}>{ev.api_url}</span></td>
                          <td className="px-4 py-2 tabular-nums font-bold text-amber-500">{ev.response_time_ms != null ? `${ev.response_time_ms}ms` : "—"}</td>
                          <td className="px-4 py-2 tabular-nums">{ev.status_code ?? "—"}</td>
                          <td className="px-4 py-2 max-w-[160px]"><span className="truncate block text-muted-foreground" title={ev.page_url}>{ev.route_name || ev.page_url}</span></td>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Live ─────────────────────────────────────────────────────────── */}
      {activeTab === "live" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Live Requests — updating every 5s
              </CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Status", "Method", "URL", "Time", "Route", "Timestamp"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveLoading
                    ? [...Array(8)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2"><Skeleton className="h-3" /></td>)}</tr>)
                    : liveData?.results.length === 0
                      ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No live requests yet. Start your application with the SDK installed.</td></tr>
                      : liveData?.results.map(ev => (
                        <tr key={ev.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2">
                            {ev.success
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                          </td>
                          <td className="px-4 py-2"><MethodBadge method={ev.method} /></td>
                          <td className="px-4 py-2 max-w-[260px]"><span className="truncate block font-mono" title={ev.api_url}>{ev.api_url}</span></td>
                          <td className="px-4 py-2 tabular-nums font-medium" style={{ color: (ev.response_time_ms ?? 0) > 1000 ? "#f59e0b" : undefined }}>
                            {ev.response_time_ms != null ? `${ev.response_time_ms}ms` : "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{ev.route_name || "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Applications ─────────────────────────────────────────────────── */}
      {activeTab === "apps" && (
        <div className="space-y-4">
          {appsLoading
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : apps.length === 0
              ? (
                <div className="text-center py-16 space-y-3">
                  <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No applications yet.</p>
                  <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="h-4 w-4" />}>Create your first app</Button>
                </div>
              )
              : apps.map(app => (
                <Card key={app.id}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{app.name}</span>
                          <Badge variant="outline">{app.environment}</Badge>
                          {app.version && <span className="text-xs text-muted-foreground">v{app.version}</span>}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${app.active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {app.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>API Key: <CopyApiKey apiKey={app.api_key} /></span>
                          <span>{app.total_events.toLocaleString()} events</span>
                          <span className={app.error_rate > 5 ? "text-red-500" : "text-green-600"}>{app.error_rate}% errors</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}>
                          {expandedApp === app.id ? "Hide SDK" : "Integration"}
                        </Button>
                        <Button variant="outline" size="sm"
                          loading={deletingId === app.id}
                          onClick={() => handleDelete(app)}
                          className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {expandedApp === app.id && (
                      <div className="mt-4">
                        <IntegrationSnippet app={app} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>
      )}
    </div>
  );
}
