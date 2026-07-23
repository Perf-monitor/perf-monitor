"use client";

import { Activity, CheckCircle2, AlertTriangle, XCircle, FolderKanban, Clock } from "lucide-react";
import { useDashboardStats, useMonthlyAverages } from "@/hooks/useReports";
import { useProjects } from "@/hooks/useProjects";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { PerformanceTrendChart } from "@/components/charts/PerformanceTrendChart";
import { MonthlyTrendChart } from "@/components/charts/CoreWebVitalsChart";
import { formatRelative, formatScore, getScoreStatus } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projects } = useProjects({ page_size: 5, ordering: "-updated_at" });
  const { data: monthly } = useMonthlyAverages();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of all monitored projects
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Projects"
          value={stats?.total_projects ?? 0}
          subtitle={`${stats?.active_projects ?? 0} active`}
          icon={FolderKanban}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          loading={statsLoading}
        />
        <StatCard
          title="Average Performance"
          value={stats ? `${stats.average_performance}` : "—"}
          subtitle="Across all projects"
          icon={Activity}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
          loading={statsLoading}
        />
        <StatCard
          title="Healthy Projects"
          value={stats?.projects_healthy ?? 0}
          subtitle="Score ≥ 90"
          icon={CheckCircle2}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
          loading={statsLoading}
        />
        <StatCard
          title="Warning Projects"
          value={stats?.projects_warning ?? 0}
          subtitle="Score 80–89"
          icon={AlertTriangle}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          loading={statsLoading}
        />
        <StatCard
          title="Critical Projects"
          value={stats?.projects_critical ?? 0}
          subtitle="Score < 80"
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
          loading={statsLoading}
        />
        <StatCard
          title="Latest Scan"
          value={stats?.latest_scan_time ? formatRelative(stats.latest_scan_time) : "Never"}
          subtitle={`${stats?.total_reports ?? 0} total reports`}
          icon={Clock}
          iconColor="text-sky-500"
          iconBg="bg-sky-500/10"
          loading={statsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Monthly Averages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Performance Averages</CardTitle>
          </CardHeader>
          <CardContent>
            {!monthly ? (
              <ChartSkeleton />
            ) : monthly.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No data yet. Run a scan to see trends.
              </div>
            ) : (
              <MonthlyTrendChart data={monthly} />
            )}
          </CardContent>
        </Card>

        {/* Project Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {!projects ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {projects.results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold tabular-nums">
                        {formatScore(p.latest_performance)}
                      </span>
                      <Badge variant="status" status={getScoreStatus(p.latest_performance)}>
                        {p.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {projects.results.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No projects yet.{" "}
                    <Link href="/projects" className="text-primary hover:underline">
                      Add one
                    </Link>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
