"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Power, Globe, Clock, ShieldCheck,
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import {
  useMonitoredWebsite, useMonitoringHistory, useIncidents,
  useSSLHistory, useRunCheck, useToggleWebsite, useUptimeTrend,
} from "@/hooks/useUptime";
import { formatDate, formatRelative } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area,
} from "recharts";
import { format } from "date-fns";

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
  disabled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

type TabKey = "history" | "incidents" | "ssl" | "config";

export default function WebsiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<TabKey>("history");
  const [trendDays, setTrendDays] = useState(7);
  const [checkingId, setCheckingId] = useState(false);

  const { data: website, isLoading } = useMonitoredWebsite(id);
  const { data: historyData } = useMonitoringHistory({ website: id, page_size: 50 });
  const { data: incidentsData } = useIncidents({ website: id, page_size: 20 });
  const { data: sslHistory } = useSSLHistory({ website: id, page_size: 10 });
  const { data: trend } = useUptimeTrend(id, trendDays);

  const runCheck = useRunCheck();
  const toggleWebsite = useToggleWebsite();

  const handleRunCheck = async () => {
    setCheckingId(true);
    try {
      const result = await runCheck.mutateAsync(id);
      toast({
        title: `Check: ${result.check.status.toUpperCase()}`,
        variant: result.check.status === "up" ? "success" : "destructive",
      });
    } catch {
      toast({ title: "Check failed", variant: "destructive" });
    } finally {
      setCheckingId(false);
    }
  };

  const handleToggle = async () => {
    if (!website) return;
    try {
      await toggleWebsite.mutateAsync(id);
      toast({ title: `Monitoring ${website.active ? "disabled" : "enabled"}`, variant: "success" });
    } catch {
      toast({ title: "Toggle failed", variant: "destructive" });
    }
  };

  const trendData = (trend?.checks ?? []).map((c) => ({
    time: format(new Date(c.checked_at), "MM/dd HH:mm"),
    rt: c.response_time_ms,
    up: c.status === "up" ? 1 : 0,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Website not found.</p>
        <Link href="/uptime-monitoring/uptime" className="text-primary hover:underline text-sm mt-2 inline-block">
          ← Back to Uptime
        </Link>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "history", label: "Monitoring History" },
    { key: "incidents", label: "Incident History" },
    { key: "ssl", label: "SSL Information" },
    { key: "config", label: "Configuration" },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/uptime-monitoring/uptime">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              {website.name}
            </h1>
            <a href={website.url} target="_blank" rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-primary hover:underline">{website.url}</a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" loading={checkingId} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={handleRunCheck}>
            Run Check
          </Button>
          <Button size="sm" variant="outline" leftIcon={<Power className="h-4 w-4" />} onClick={handleToggle}>
            {website.active ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Current Status</p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${STATUS_COLORS[website.current_status] ?? STATUS_COLORS.unknown}`}>
            {website.current_status === "up"
              ? <CheckCircle2 className="h-4 w-4 mr-1.5" />
              : <XCircle className="h-4 w-4 mr-1.5" />}
            {website.current_status.toUpperCase()}
          </span>
          {website.active_incident && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Active incident
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Uptime</p>
          <p className="text-2xl font-bold">
            {website.uptime_percentage != null ? `${website.uptime_percentage}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">all-time average</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Response Time</p>
          <p className="text-2xl font-bold">
            {website.latest_response_time != null ? `${Math.round(website.latest_response_time)}ms` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">last check</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">SSL Status</p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${SSL_COLORS[website.ssl_status] ?? SSL_COLORS.unknown}`}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            {website.ssl_status.replace("_", " ")}
          </span>
          <p className="text-xs text-muted-foreground mt-2">
            Last checked: {website.last_checked ? formatRelative(website.last_checked) : "Never"}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Response Time History</CardTitle>
              <select value={trendDays} onChange={(e) => setTrendDays(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none">
                <option value={1}>Last 24h</option>
                <option value={7}>Last 7d</option>
                <option value={30}>Last 30d</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Area type="monotone" dataKey="rt" name="Response (ms)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Uptime History (1 = UP, 0 = DOWN)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Line type="stepAfter" dataKey="up" name="Status" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Monitoring History */}
      {tab === "history" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Status", "HTTP Status", "Response Time", "Error", "Checked At"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(historyData?.results ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No checks yet</td></tr>
                  ) : (
                    historyData?.results.map((c) => (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[c.status] ?? STATUS_COLORS.unknown}`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{c.http_status_code ?? "—"}</td>
                        <td className="px-4 py-2 tabular-nums">{c.response_time_ms != null ? `${Math.round(c.response_time_ms)}ms` : "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">{c.error_message || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDate(c.checked_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Incidents */}
      {tab === "incidents" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Started At", "Ended At", "Duration", "Status", "Root Cause"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(incidentsData?.results ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No incidents recorded</td></tr>
                  ) : (
                    incidentsData?.results.map((inc) => (
                      <tr key={inc.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(inc.started_at)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{inc.ended_at ? formatDate(inc.ended_at) : <span className="text-red-500 font-medium">Ongoing</span>}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {inc.duration_seconds != null
                            ? inc.duration_seconds >= 3600
                              ? `${(inc.duration_seconds / 3600).toFixed(1)}h`
                              : inc.duration_seconds >= 60
                                ? `${Math.round(inc.duration_seconds / 60)}m`
                                : `${Math.round(inc.duration_seconds)}s`
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {inc.is_ongoing
                            ? <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Ongoing</span>
                            : <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Resolved</span>}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{inc.root_cause || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: SSL */}
      {tab === "ssl" && (
        <div className="space-y-4">
          {(sslHistory?.results ?? []).length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No SSL checks yet</CardContent></Card>
          ) : (
            sslHistory?.results.slice(0, 1).map((ssl) => (
              <Card key={ssl.id}>
                <CardHeader><CardTitle className="text-sm">Latest SSL Certificate</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${SSL_COLORS[ssl.cert_status] ?? SSL_COLORS.unknown}`}>
                        {ssl.cert_status.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Common Name</p>
                      <p className="font-medium mt-0.5">{ssl.common_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Issuer</p>
                      <p className="font-medium mt-0.5">{ssl.issuer || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Days Remaining</p>
                      <p className={`font-bold mt-0.5 ${(ssl.days_remaining ?? 0) < 30 ? "text-amber-500" : (ssl.days_remaining ?? 0) < 0 ? "text-red-500" : ""}`}>
                        {ssl.days_remaining != null ? `${ssl.days_remaining} days` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valid From</p>
                      <p className="font-medium mt-0.5">{ssl.valid_from ? formatDate(ssl.valid_from) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valid To</p>
                      <p className="font-medium mt-0.5">{ssl.valid_to ? formatDate(ssl.valid_to) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Checked</p>
                      <p className="font-medium mt-0.5">{ssl.checked_at ? formatDate(ssl.checked_at) : "—"}</p>
                    </div>
                    {ssl.error_message && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Error</p>
                        <p className="font-medium text-red-500 mt-0.5 text-xs">{ssl.error_message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Configuration */}
      {tab === "config" && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> Configuration</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Protocol", value: website.protocol.toUpperCase() },
                { label: "Check Interval", value: `${website.check_interval} min` },
                { label: "Timeout", value: `${website.timeout_seconds}s` },
                { label: "Expected Status Code", value: website.expected_status_code },
                { label: "SSL Monitoring", value: website.ssl_monitoring ? "Enabled" : "Disabled" },
                { label: "SSL Alert Days", value: `${website.ssl_expiry_alert_days} days before expiry` },
                { label: "Monitoring Active", value: website.active ? "Yes" : "No" },
                { label: "Created", value: formatDate(website.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium mt-0.5">{String(value)}</p>
                </div>
              ))}
              {website.keyword_check && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Keyword Check</p>
                  <p className="font-medium mt-0.5 font-mono text-xs">{website.keyword_check}</p>
                </div>
              )}
              {website.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="mt-0.5 text-sm">{website.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
