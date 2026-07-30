"use client";

import { useState } from "react";
import { AlertOctagon, Search, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useIncidents } from "@/hooks/useUptime";
import { formatDate } from "@/lib/utils";
import type { UptimeFilterParams } from "@/types";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function IncidentsPage() {
  const [search, setSearch] = useState("");
  const [ongoingOnly, setOngoingOnly] = useState(false);
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [page, setPage] = useState(1);

  const params: UptimeFilterParams = {
    page,
    page_size: 25,
    search: search || undefined,
    ongoing: ongoingOnly ? "true" : undefined,
    started_after: dateAfter || undefined,
    started_before: dateBefore || undefined,
  };

  const { data, isLoading } = useIncidents(params);

  const handleExport = () => {
    const rows = data?.results ?? [];
    if (!rows.length) return;
    const headers = ["Website", "URL", "Started At", "Ended At", "Duration", "Status", "Root Cause"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.website_name}"`,
          `"${r.website_url}"`,
          r.started_at,
          r.ended_at ?? "",
          formatDuration(r.duration_seconds),
          r.is_ongoing ? "Ongoing" : "Resolved",
          `"${r.root_cause}"`,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incidents.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Incidents</h1>
            <p className="text-sm text-muted-foreground">Downtime incidents across all websites</p>
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
                placeholder="Search by website name…"
                className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={ongoingOnly} onChange={(e) => { setOngoingOnly(e.target.checked); setPage(1); }} className="rounded" />
              Ongoing only
            </label>
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
            {data ? `${data.count} incident${data.count !== 1 ? "s" : ""}` : "Incidents"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Website", "Started At", "Ended At", "Duration", "Status", "Root Cause"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}
                    </tr>
                  ))
                ) : (data?.results ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <AlertOctagon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No incidents found
                    </td>
                  </tr>
                ) : (
                  data?.results.map((inc) => (
                    <tr key={inc.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{inc.website_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{inc.website_url}</p>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDate(inc.started_at)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {inc.ended_at
                          ? formatDate(inc.ended_at)
                          : <span className="text-red-500 font-medium">Ongoing</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs">{formatDuration(inc.duration_seconds)}</td>
                      <td className="px-4 py-3">
                        {inc.is_ongoing ? (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Ongoing
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Resolved
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                        {inc.root_cause || "—"}
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
                Page {data.current_page} of {data.total_pages}
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
