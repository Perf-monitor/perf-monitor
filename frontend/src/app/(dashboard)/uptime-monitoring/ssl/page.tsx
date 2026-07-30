"use client";

import { useState } from "react";
import { ShieldCheck, RefreshCw, ShieldAlert, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import { useSSLMonitoring, useRunSSLCheck } from "@/hooks/useUptime";
import { formatDate } from "@/lib/utils";
import type { SSLCheck } from "@/types";

const CERT_STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  healthy:          { badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   dot: "bg-green-500" },
  expiring_soon:    { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   dot: "bg-amber-500" },
  expired:          { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           dot: "bg-red-500" },
  invalid:          { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           dot: "bg-red-500" },
  hostname_mismatch:{ badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           dot: "bg-red-500" },
  handshake_failed: { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           dot: "bg-red-500" },
  disabled:         { badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",          dot: "bg-gray-400" },
  unknown:          { badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",          dot: "bg-gray-400" },
};

function DaysRemaining({ days }: { days: number | null }) {
  if (days == null) return <span className="text-muted-foreground">—</span>;
  if (days < 0) return <span className="text-red-500 font-bold">Expired</span>;
  if (days <= 7) return <span className="text-red-500 font-bold">{days}d</span>;
  if (days <= 30) return <span className="text-amber-500 font-semibold">{days}d</span>;
  return <span className="text-green-600 font-medium">{days}d</span>;
}

export default function SSLMonitoringPage() {
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const runSSL = useRunSSLCheck();

  const { data, isLoading, refetch } = useSSLMonitoring();

  const results: SSLCheck[] = (data?.results ?? []).filter((s) => {
    if (!filter) return true;
    return s.cert_status === filter;
  });

  const allIds = results.map((s) => s.website);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allIds);
  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleRunSSL = async (websiteId: string) => {
    setCheckingId(websiteId);
    try {
      await runSSL.mutateAsync(websiteId);
      toast({ title: "SSL check complete", variant: "success" });
      refetch();
    } catch {
      toast({ title: "SSL check failed", variant: "destructive" });
    } finally {
      setCheckingId(null);
    }
  };

  const handleBulkSSL = async () => {
    for (const id of selected) {
      await handleRunSSL(id);
    }
    setSelected([]);
  };

  const counts = (data?.results ?? []).reduce((acc, s) => {
    acc[s.cert_status] = (acc[s.cert_status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SSL Monitoring</h1>
          <p className="text-sm text-muted-foreground">Certificate status for all monitored websites</p>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: "", label: "All", color: "bg-muted text-muted-foreground", count: data?.count ?? 0 },
          { key: "healthy", label: "Healthy", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", count: counts.healthy ?? 0 },
          { key: "expiring_soon", label: "Expiring Soon", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", count: counts.expiring_soon ?? 0 },
          { key: "expired", label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", count: counts.expired ?? 0 },
          { key: "invalid", label: "Invalid", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", count: counts.invalid ?? 0 },
          { key: "disabled", label: "SSL Disabled", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500", count: counts.disabled ?? 0 },
        ].map(({ key, label, color, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border-2 transition-all ${color} ${filter === key ? "border-current shadow" : "border-transparent"}`}
          >
            {label} <span className="font-bold">{count}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
          <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleBulkSSL} loading={runSSL.isPending}>
            Run SSL Check
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">SSL Certificates ({results.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                  </th>
                  {["Website", "Status", "Issuer", "Common Name", "Valid From", "Expiry Date", "Days Remaining", "Last SSL Check", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(10)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}
                    </tr>
                  ))
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No SSL data. Run a check to populate certificates.
                    </td>
                  </tr>
                ) : (
                  results.map((ssl) => {
                    const style = CERT_STATUS_STYLES[ssl.cert_status] ?? CERT_STATUS_STYLES.unknown;
                    return (
                      <tr key={ssl.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.includes(ssl.website)} onChange={() => toggleSelect(ssl.website)} className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${style.dot}`} />
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[140px]">{ssl.website_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{ssl.website_url ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
                            {ssl.cert_status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{ssl.issuer || "—"}</td>
                        <td className="px-4 py-3 text-xs font-mono max-w-[120px] truncate">{ssl.common_name || "—"}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{ssl.valid_from ? formatDate(ssl.valid_from) : "—"}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{ssl.valid_to ? formatDate(ssl.valid_to) : "—"}</td>
                        <td className="px-4 py-3 text-sm font-mono"><DaysRemaining days={ssl.days_remaining} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{ssl.checked_at ? formatDate(ssl.checked_at) : "—"}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost" size="icon"
                            loading={checkingId === ssl.website}
                            onClick={() => handleRunSSL(ssl.website)}
                            title="Run SSL Check"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
