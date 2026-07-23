"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Download, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useProjectReports, useProjectTrend } from "@/hooks/useReports";
import { useTriggerScan } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChartSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ScoreCardRow } from "@/components/dashboard/ScoreGauge";
import { PerformanceTrendChart } from "@/components/charts/PerformanceTrendChart";
import { CoreWebVitalsBar } from "@/components/charts/CoreWebVitalsChart";
import { toast } from "@/components/ui/Toaster";
import { reportsService } from "@/services/reports.service";
import { formatRelative, formatMs, formatCLS, formatScore, getScoreStatus, getFrameworkLabel } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [trendDays, setTrendDays] = useState(30);

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: reports, isLoading: reportsLoading } = useProjectReports(id, { strategy, page_size: 10 });
  const { data: trend } = useProjectTrend(id, trendDays, strategy);
  const scanMutation = useTriggerScan();

  const latestReport = reports?.results[0];

  const handleScan = async () => {
    try {
      const result = await scanMutation.mutateAsync({ projectId: id, strategy });
      const count = (result as { reports_saved?: number })?.reports_saved ?? 0;
      toast({
        title: "Scan complete",
        description: `${count} report${count !== 1 ? "s" : ""} saved. Page is now updated.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to run scan. Check that the URL is reachable and the Google PageSpeed API key is configured.";
      toast({ title: "Scan failed", description: msg, variant: "destructive" });
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="status" status={getScoreStatus(project.latest_performance)}>
                {project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                {project.url} <ExternalLink className="h-3 w-3" />
              </a>
              <Badge variant="secondary">{getFrameworkLabel(project.framework)}</Badge>
              <Badge variant="outline">{project.environment}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setStrategy("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${strategy === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
            <button
              onClick={() => setStrategy("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${strategy === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
          </div>
          <Button
            onClick={handleScan}
            loading={scanMutation.isPending}
            disabled={scanMutation.isPending}
            leftIcon={<Play className="h-4 w-4" />}
            size="sm"
          >
            {scanMutation.isPending ? "Scanning…" : "Run Scan"}
          </Button>
          <a
            href={reportsService.getExportCsvUrl(id)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input text-sm hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>
      </div>

      {/* Score Gauges */}
      {latestReport ? (
        <Card>
          <CardContent className="pt-6">
            <ScoreCardRow scores={[
              { label: "Performance", value: latestReport.performance_score },
              { label: "Accessibility", value: latestReport.accessibility_score },
              { label: "SEO", value: latestReport.seo_score },
              { label: "Best Practices", value: latestReport.best_practices_score },
            ]} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-4">No reports yet. Run a scan to get scores.</p>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Performance Trend</CardTitle>
              <select
                value={trendDays}
                onChange={(e) => setTrendDays(Number(e.target.value))}
                className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {!trend ? <ChartSkeleton /> : trend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No trend data yet.</div>
            ) : (
              <PerformanceTrendChart data={trend} showAll />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core Web Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? <ChartSkeleton /> : latestReport ? (
              <CoreWebVitalsBar report={latestReport} />
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Metrics */}
      {latestReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Report — {formatRelative(latestReport.tested_at)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "LCP", value: formatMs(latestReport.lcp) },
                { label: "FCP", value: formatMs(latestReport.fcp) },
                { label: "TBT", value: formatMs(latestReport.total_blocking_time) },
                { label: "CLS", value: formatCLS(latestReport.cls) },
                { label: "INP", value: formatMs(latestReport.inp) },
                { label: "TTFB", value: formatMs(latestReport.ttfb) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-lg font-bold mt-1">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Date", "Strategy", "Perf", "A11y", "SEO", "BP", "LCP", "FCP", "CLS", "INP"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                    ))}</tr>
                  ))
                ) : reports?.results.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatRelative(r.tested_at)}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline">{r.strategy}</Badge></td>
                    <td className="px-4 py-2.5 font-bold">{formatScore(r.performance_score)}</td>
                    <td className="px-4 py-2.5">{formatScore(r.accessibility_score)}</td>
                    <td className="px-4 py-2.5">{formatScore(r.seo_score)}</td>
                    <td className="px-4 py-2.5">{formatScore(r.best_practices_score)}</td>
                    <td className="px-4 py-2.5 text-xs">{formatMs(r.lcp)}</td>
                    <td className="px-4 py-2.5 text-xs">{formatMs(r.fcp)}</td>
                    <td className="px-4 py-2.5 text-xs">{formatCLS(r.cls)}</td>
                    <td className="px-4 py-2.5 text-xs">{formatMs(r.inp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
