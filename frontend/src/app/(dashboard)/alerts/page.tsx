"use client";

import { useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsService } from "@/services/alerts.service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import { formatRelative } from "@/lib/utils";
import type { AlertSeverity } from "@/types";

export default function AlertsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["alerts", page],
    queryFn: () => alertsService.list({ page }),
    staleTime: 30_000,
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertsService.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const handleAck = async (id: string) => {
    try {
      await ackMutation.mutateAsync(id);
      toast({ title: "Alert acknowledged", variant: "success" });
    } catch {
      toast({ title: "Failed to acknowledge", variant: "destructive" });
    }
  };

  const SEVERITY_LABEL: Record<AlertSeverity, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Alerts</h1>
            <p className="text-sm text-muted-foreground">{data?.count ?? 0} total alerts</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Project", "Type", "Severity", "Message", "Time", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : data?.results.map((alert) => (
                    <tr key={alert.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{alert.project_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{alert.alert_type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="severity" severity={alert.severity}>
                          {SEVERITY_LABEL[alert.severity]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-sm">{alert.message}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelative(alert.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {alert.is_acknowledged ? (
                          <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                            <CheckCheck className="h-3.5 w-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500 font-medium">Unread</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!alert.is_acknowledged && (
                          <button
                            onClick={() => handleAck(alert.id)}
                            className="text-xs text-primary hover:underline disabled:opacity-50"
                            disabled={ackMutation.isPending}
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No alerts found. All systems are operating normally.
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
