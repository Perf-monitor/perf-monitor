"use client";

import Link from "next/link";
import {
  Globe, CheckCircle2, XCircle, AlertTriangle, TrendingUp,
  Clock, ShieldCheck, ShieldAlert, ShieldX, RadioTower,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUptimeDashboard, useMonitoredWebsites, useIncidents, useSSLAlerts } from "@/hooks/useUptime";
import { formatRelative } from "@/lib/utils";

function StatCard({
  title, value, subtitle, icon: Icon, iconBg, iconColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function UptimeStatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    up: "bg-green-500",
    down: "bg-red-500",
    timeout: "bg-amber-500",
    error: "bg-orange-500",
    unknown: "bg-gray-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status] ?? "bg-gray-400"}`} />;
}

export default function UptimeDashboardPage() {
  const { data: stats, isLoading } = useUptimeDashboard();
  const { data: websites } = useMonitoredWebsites({ page_size: 6, ordering: "-updated_at" });
  const { data: incidents } = useIncidents({ ongoing: "true", page_size: 5 });
  const { data: sslAlerts } = useSSLAlerts({ status: "open", page_size: 5 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <RadioTower className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
          <p className="text-sm text-muted-foreground">Website uptime, SSL and incident overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(9)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Total Monitored" value={stats?.total_websites ?? 0} subtitle="websites" icon={Globe} iconBg="bg-blue-500/10" iconColor="text-blue-500" />
            <StatCard title="Websites UP" value={stats?.websites_up ?? 0} subtitle="currently online" icon={CheckCircle2} iconBg="bg-green-500/10" iconColor="text-green-500" />
            <StatCard title="Websites DOWN" value={stats?.websites_down ?? 0} subtitle="currently offline" icon={XCircle} iconBg="bg-red-500/10" iconColor="text-red-500" />
            <StatCard title="Active Incidents" value={stats?.active_incidents ?? 0} subtitle="ongoing outages" icon={AlertTriangle} iconBg="bg-amber-500/10" iconColor="text-amber-500" />
            <StatCard title="Overall Uptime" value={stats ? `${stats.overall_uptime_pct}%` : "—"} subtitle="all-time" icon={TrendingUp} iconBg="bg-violet-500/10" iconColor="text-violet-500" />
            <StatCard title="Avg Response Time" value={stats ? `${stats.avg_response_time_ms}ms` : "—"} subtitle="last 24 hours" icon={Clock} iconBg="bg-cyan-500/10" iconColor="text-cyan-500" />
            <StatCard title="SSL Expiring Soon" value={stats?.ssl_expiring_soon ?? 0} subtitle={`within alert threshold`} icon={ShieldAlert} iconBg="bg-amber-500/10" iconColor="text-amber-500" />
            <StatCard title="SSL Expired" value={stats?.ssl_expired ?? 0} subtitle="expired certs" icon={ShieldX} iconBg="bg-red-500/10" iconColor="text-red-500" />
            <StatCard title="SSL Invalid" value={stats?.ssl_invalid ?? 0} subtitle="invalid / error" icon={ShieldCheck} iconBg="bg-orange-500/10" iconColor="text-orange-500" />
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Latest Website Checks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Latest Website Checks
              <Link href="/uptime-monitoring/uptime" className="text-xs text-primary hover:underline font-normal">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!websites ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)
            ) : websites.results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No websites monitored yet</p>
            ) : (
              websites.results.map((w) => (
                <Link key={w.id} href={`/uptime-monitoring/uptime/${w.id}`}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UptimeStatusDot status={w.current_status} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{w.last_checked ? formatRelative(w.last_checked) : "Never"}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {w.latest_response_time != null ? `${Math.round(w.latest_response_time)}ms` : "—"}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Active Incidents
              <Link href="/uptime-monitoring/incidents" className="text-xs text-primary hover:underline font-normal">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!incidents ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)
            ) : incidents.results.length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-1">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <p className="text-xs text-muted-foreground">No active incidents</p>
              </div>
            ) : (
              incidents.results.map((inc) => (
                <div key={inc.id} className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-3 py-2">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 truncate">{inc.website_name}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(inc.started_at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* SSL Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              SSL Alerts
              <Link href="/uptime-monitoring/ssl-alerts" className="text-xs text-primary hover:underline font-normal">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!sslAlerts ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)
            ) : sslAlerts.results.length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-1">
                <ShieldCheck className="h-6 w-6 text-green-500" />
                <p className="text-xs text-muted-foreground">No SSL alerts</p>
              </div>
            ) : (
              sslAlerts.results.map((alert) => {
                const severityClass = alert.severity === "critical"
                  ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10"
                  : "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10";
                const textClass = alert.severity === "critical"
                  ? "text-red-700 dark:text-red-400"
                  : "text-amber-700 dark:text-amber-400";
                return (
                  <div key={alert.id} className={`rounded-lg border px-3 py-2 ${severityClass}`}>
                    <p className={`text-xs font-medium truncate ${textClass}`}>{alert.website_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                        {alert.alert_type.replace("_", " ")}
                      </Badge>
                      {alert.days_remaining != null && (
                        <span className="text-xs text-muted-foreground">{alert.days_remaining}d remaining</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
