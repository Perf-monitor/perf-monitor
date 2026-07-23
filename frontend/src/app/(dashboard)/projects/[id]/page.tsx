"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Download, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { useProjectReports, useProjectTrend, useNetworkRequests } from "@/hooks/useReports";
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
import { formatRelative, formatMs, formatCLS, formatScore, getScoreStatus, getFrameworkLabel, getLcpStatus, getClsStatus, getInpStatus, getTbtStatus, getFcpStatus, getTtfbStatus, metricStatusColor } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("desktop");
  const [trendDays, setTrendDays] = useState(30);
  const [netTypeFilter, setNetTypeFilter] = useState("");
  const [netStatusFilter, setNetStatusFilter] = useState("");

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: reports, isLoading: reportsLoading } = useProjectReports(id, { strategy, page_size: 10 });
  const { data: trend } = useProjectTrend(id, trendDays, strategy);
  const scanMutation = useTriggerScan();

  const latestReport = reports?.results[0];
  const { data: networkData, isLoading: networkLoading } = useNetworkRequests(
    latestReport?.id,
    { resource_type: netTypeFilter || undefined, status: netStatusFilter || undefined }
  );

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

      {/* Web Vitals Suggestions */}
      {latestReport && (() => {
        const inpStatus = latestReport.inp !== null ? getInpStatus(latestReport.inp) : getTbtStatus(latestReport.total_blocking_time);

        const suggestions: { metric: string; value: string; status: "good" | "needs-improvement" | "poor" | "unknown"; tips: string[] }[] = [
          {
            metric: "LCP — Largest Contentful Paint",
            value: formatMs(latestReport.lcp),
            status: getLcpStatus(latestReport.lcp),
            tips: [
              "Preload your largest image or hero element using <link rel=\"preload\">.",
              "Serve images in next-gen formats (WebP / AVIF) and size them correctly.",
              "Use a CDN to reduce server distance and time-to-first-byte.",
              "Remove render-blocking CSS and JS by deferring non-critical resources.",
              "Enable server-side caching for faster initial HTML delivery.",
            ],
          },
          {
            metric: "CLS — Cumulative Layout Shift",
            value: formatCLS(latestReport.cls),
            status: getClsStatus(latestReport.cls),
            tips: [
              "Always set explicit width and height on <img> and <video> elements.",
              "Reserve space for ads, embeds, and iframes with a min-height or aspect-ratio.",
              "Avoid inserting content above existing content after page load.",
              "Use CSS transform animations instead of properties that trigger layout (top, left, height).",
              "Load custom fonts with font-display: optional or swap, and use size-adjust.",
            ],
          },
          {
            metric: "INP / TBT — Interaction Responsiveness",
            value: latestReport.inp !== null ? formatMs(latestReport.inp) : formatMs(latestReport.total_blocking_time),
            status: inpStatus,
            tips: [
              "Break up long JavaScript tasks (>50ms) using setTimeout or scheduler.yield().",
              "Reduce main-thread work: defer analytics, third-party scripts, and heavy computations.",
              "Use a web worker for CPU-intensive operations to keep the main thread free.",
              "Minimise DOM size — large DOMs increase style recalculations.",
              "Debounce or throttle event listeners (scroll, resize, input).",
            ],
          },
          {
            metric: "FCP — First Contentful Paint",
            value: formatMs(latestReport.fcp),
            status: getFcpStatus(latestReport.fcp),
            tips: [
              "Eliminate render-blocking resources — inline critical CSS and defer JS.",
              "Reduce server response time (TTFB) with caching and faster hosting.",
              "Minify and compress HTML, CSS, and JS files.",
              "Use a CDN to serve assets closer to the user.",
              "Avoid chained critical requests by inlining above-the-fold styles.",
            ],
          },
          {
            metric: "TTFB — Time to First Byte",
            value: formatMs(latestReport.ttfb),
            status: getTtfbStatus(latestReport.ttfb),
            tips: [
              "Use server-side caching (Redis, Varnish) to avoid recomputing responses.",
              "Move to a server or CDN region closer to your users.",
              "Optimise database queries — add indexes, reduce N+1 queries.",
              "Use HTTP/2 or HTTP/3 to reduce connection overhead.",
              "Enable Brotli or gzip compression on your server.",
            ],
          },
        ];

        const issues = suggestions.filter((s) => s.status !== "good" && s.status !== "unknown");
        const good = suggestions.filter((s) => s.status === "good");

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Web Vitals Improvement Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issues.length === 0 ? (
                <p className="text-sm text-green-500 font-medium">🎉 All metrics are within good thresholds. Keep it up!</p>
              ) : (
                issues.map((s) => (
                  <div key={s.metric} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: metricStatusColor(s.status) }}
                      />
                      <span className="font-semibold text-sm">{s.metric}</span>
                      <span
                        className="ml-auto text-sm font-bold tabular-nums"
                        style={{ color: metricStatusColor(s.status) }}
                      >
                        {s.value}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: s.status === "poor" ? "#fef2f2" : "#fffbeb",
                          color: s.status === "poor" ? "#ef4444" : "#d97706",
                        }}
                      >
                        {s.status === "poor" ? "Poor" : "Needs Improvement"}
                      </span>
                    </div>
                    <ul className="space-y-1 pl-4">
                      {s.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground/50 select-none">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
              {good.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {good.map((s) => (
                    <span key={s.metric} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      {s.metric.split("—")[0].trim()} · {s.value}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Network Requests */}
      {latestReport && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Network Requests — {networkData?.count ?? 0} captured</CardTitle>
              <div className="flex gap-2">
                <select
                  value={netTypeFilter}
                  onChange={(e) => setNetTypeFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Types</option>
                  {["Document", "Script", "Stylesheet", "Image", "Font", "XHR", "Fetch", "Other"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={netStatusFilter}
                  onChange={(e) => setNetStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Status</option>
                  <option value="success">Success (2xx/3xx)</option>
                  <option value="error">Errors (4xx/5xx)</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Status", "Type", "URL", "Duration", "Size", "Protocol", "Cache", "Priority"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {networkLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>{[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-2"><Skeleton className="h-3" /></td>
                      ))}</tr>
                    ))
                  ) : networkData?.results.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No network requests captured. Run a scan to collect data.</td></tr>
                  ) : networkData?.results.map((req) => {
                    const isError = req.status_code !== null && req.status_code >= 400;
                    const isWarn = req.duration_ms !== null && req.duration_ms > 1000;
                    return (
                      <tr key={req.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2 font-bold tabular-nums" style={{ color: req.status_code === null ? "#9ca3af" : isError ? "#ef4444" : "#22c55e" }}>
                          {req.status_code ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted">{req.resource_type}</span>
                        </td>
                        <td className="px-4 py-2 max-w-[320px]">
                          <span className="truncate block" title={req.url}>{req.url}</span>
                          {req.entity && <span className="text-muted-foreground opacity-70">{req.entity}</span>}
                        </td>
                        <td className="px-4 py-2 tabular-nums font-medium" style={{ color: isWarn ? "#f59e0b" : undefined }}>
                          {req.duration_ms !== null ? `${req.duration_ms.toFixed(0)}ms` : "—"}
                        </td>
                        <td className="px-4 py-2 tabular-nums text-muted-foreground">
                          {req.transfer_size !== null ? req.transfer_size > 1024 ? `${(req.transfer_size / 1024).toFixed(1)}kb` : `${req.transfer_size}b` : "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{req.protocol || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{req.cache || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{req.priority || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
