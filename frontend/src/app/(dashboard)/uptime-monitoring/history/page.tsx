"use client";

import { useState } from "react";
import { Clock, Search, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMonitoringHistory } from "@/hooks/useUptime";
import { formatDate } from "@/lib/utils";
import type { UptimeFilterParams } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  up:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  down:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  timeout: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  unknown: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function MonitoringHistoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [page, setPage] = useState(1);

  const params: UptimeFilterParams = {
    page,
    page_size: 30,
    search: search || undefined,
    status: statusFilter || undefined,
    checked_after: dateAfter || undefined,
    checked_before: dateBefore || undefined,
  };

  const { data, isLoading } = useMonitoringHistory(params);

  const handleExport = () => {
    const rows = data?.results ?? [];
    if (!rows.length) return;
    const headers = ["Website", "Status", "HTTP Status", "Response Time (ms)", "Checked At", "Error"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${(r as any).website_name ?? r.website}"`,
          r.status,
          r.http_status_code ?? "",
          r.response_time_ms ?? "",
          r.checked_at,
          `"${r.error_message}"`,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monitoring_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Monitoring History</h1>
            <p className="text-sm text-muted-foreground">All monitoring checks across all websites</p>
          </div>
        </div>
        <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
          Export CSV
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
                placeholder="Search website name or URL…"
                className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">All Statuses</option>
              <option value="up">UP</option>
              <option value="down">DOWN</option>
              <option value="timeout">Timeout</option>
              <option value="error">Error</option>
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={dateAfter} onChange={(e) => { setDateAfter(e.target.value); setPage(1); }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={dateBefore} onChange={(e) => { setDateBefore(e.target.value); setPage(1); }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">
            {data ? `${data.count} check${data.count !== 1 ? "s" : ""}` : "Checks"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Website", "Status", "HTTP Status", "Response Time", "Checked At", "Error Message"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}
                    </tr>
                  ))
                ) : (data?.results ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No monitoring history yet
                    </td>
                  </tr>
                ) : (
                  data?.results.map((check) => (
                    <tr key={check.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{(check as any).website_name ?? check.website}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{(check as any).website_url ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[check.status] ?? STATUS_COLORS.unknown}`}>
                          {check.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{check.http_status_code ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-xs">
                        {check.response_time_ms != null ? `${Math.round(check.response_time_ms)}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(check.checked_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                        <span className="truncate block" title={check.error_message}>
                          {check.error_message || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
