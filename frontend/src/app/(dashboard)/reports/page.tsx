"use client";

import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { formatScore, formatMs, formatCLS, formatRelative, getScoreStatus } from "@/lib/utils";
import type { FilterParams } from "@/types";

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [strategy, setStrategy] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const params: FilterParams = {
    page,
    strategy: strategy || undefined,
    min_performance_score: minScore ? Number(minScore) : undefined,
    max_performance_score: maxScore ? Number(maxScore) : undefined,
  };

  const { data, isLoading, refetch } = useReports(params);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">{data?.count ?? 0} total reports</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={strategy}
          onChange={(e) => { setStrategy(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Strategies</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
        <input
          type="number"
          value={minScore}
          onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
          placeholder="Min perf score"
          className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          type="number"
          value={maxScore}
          onChange={(e) => { setMaxScore(e.target.value); setPage(1); }}
          placeholder="Max perf score"
          className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Project", "Strategy", "Perf", "A11y", "SEO", "BP", "LCP", "FCP", "TBT", "CLS", "INP", "Status", "Tested At"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={13} />)
                : data?.results.map((r) => (
                    <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium max-w-[140px]">
                        <p className="truncate">{r.project_name}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">{r.strategy}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-bold tabular-nums"
                        style={{ color: r.performance_score !== null ? (r.performance_score >= 90 ? "#22c55e" : r.performance_score >= 80 ? "#f59e0b" : "#ef4444") : undefined }}>
                        {formatScore(r.performance_score)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{formatScore(r.accessibility_score)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{formatScore(r.seo_score)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{formatScore(r.best_practices_score)}</td>
                      <td className="px-4 py-2.5 text-xs">{formatMs(r.lcp)}</td>
                      <td className="px-4 py-2.5 text-xs">{formatMs(r.fcp)}</td>
                      <td className="px-4 py-2.5 text-xs">{formatMs(r.total_blocking_time)}</td>
                      <td className="px-4 py-2.5 text-xs">{formatCLS(r.cls)}</td>
                      <td className="px-4 py-2.5 text-xs">{formatMs(r.inp)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="status" status={getScoreStatus(r.performance_score)}>
                          {getScoreStatus(r.performance_score)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelative(r.tested_at)}
                      </td>
                    </tr>
                  ))}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                    No reports found. Trigger a scan on a project to generate reports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {data.current_page} of {data.total_pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
