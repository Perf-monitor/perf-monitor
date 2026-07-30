"use client";

import { useState } from "react";
import { BellRing, Search, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import { useSSLAlerts, useAcknowledgeSSLAlert } from "@/hooks/useUptime";
import { formatDate, formatRelative } from "@/lib/utils";
import type { UptimeFilterParams, SSLAlertType, SSLAlertSeverity, SSLAlertStatus } from "@/types";

const SEVERITY_STYLES: Record<SSLAlertSeverity, string> = {
  info:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  warning:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<SSLAlertStatus, string> = {
  open:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  acknowledged: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  resolved:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const ALERT_TYPE_LABELS: Record<SSLAlertType, string> = {
  expiring_soon:    "Expiring Soon",
  expired:          "Expired",
  invalid:          "Invalid Certificate",
  hostname_mismatch:"Hostname Mismatch",
  handshake_failed: "Handshake Failed",
};

export default function SSLAlertsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [ackingId, setAckingId] = useState<string | null>(null);

  const params: UptimeFilterParams = {
    page,
    page_size: 25,
    search: search || undefined,
    alert_type: typeFilter || undefined,
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useSSLAlerts(params);
  const acknowledge = useAcknowledgeSSLAlert();

  const handleAcknowledge = async (id: string) => {
    setAckingId(id);
    try {
      await acknowledge.mutateAsync(id);
      toast({ title: "Alert acknowledged", variant: "success" });
    } catch {
      toast({ title: "Failed to acknowledge", variant: "destructive" });
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BellRing className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SSL Alerts</h1>
          <p className="text-sm text-muted-foreground">Certificate expiry and validity alerts</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search website…"
                className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">All Types</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="invalid">Invalid</option>
              <option value="hostname_mismatch">Hostname Mismatch</option>
              <option value="handshake_failed">Handshake Failed</option>
            </select>
            <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">
            {data ? `${data.count} alert${data.count !== 1 ? "s" : ""}` : "Alerts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Website", "Alert Type", "Severity", "Days Remaining", "Generated At", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}
                    </tr>
                  ))
                ) : (data?.results ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <BellRing className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No SSL alerts found
                    </td>
                  </tr>
                ) : (
                  data?.results.map((alert) => (
                    <tr key={alert.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{alert.website_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{alert.website_url}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[alert.severity]}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-sm font-medium">
                        {alert.days_remaining != null ? (
                          <span className={alert.days_remaining <= 0 ? "text-red-500" : alert.days_remaining <= 7 ? "text-red-400" : alert.days_remaining <= 30 ? "text-amber-500" : ""}>
                            {alert.days_remaining <= 0 ? "Expired" : `${alert.days_remaining}d`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelative(alert.generated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[alert.status]}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {alert.status === "open" && (
                          <Button
                            size="sm" variant="outline"
                            loading={ackingId === alert.id}
                            onClick={() => handleAcknowledge(alert.id)}
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          >
                            Ack
                          </Button>
                        )}
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
