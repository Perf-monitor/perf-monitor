"use client";

import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import type { AppSettings } from "@/types";

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.get,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<Partial<AppSettings> & { google_api_key?: string }>({});

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: typeof form) => settingsService.update(payload),
    onSuccess: () => toast({ title: "Settings saved", variant: "success" }),
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-1/3" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "", hint?: string) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={(form[key] as string | number) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* API Configuration */}
        <Card>
          <CardHeader><CardTitle className="text-base">API Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {field("Google PageSpeed API Key", "google_api_key", "password", "AIzaSy…", "Used for PageSpeed Insights API calls")}
            {field("Scan Interval (hours)", "scan_interval_hours", "number", "6", "How often to auto-scan all projects")}
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alert Thresholds</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {field("Min Performance Score", "alert_threshold_performance", "number", "80")}
            {field("Max LCP (ms)", "alert_threshold_lcp", "number", "2500")}
            {field("Max CLS", "alert_threshold_cls", "number", "0.1")}
            {field("Max INP (ms)", "alert_threshold_inp", "number", "200")}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {field("Slack Webhook URL", "slack_webhook_url", "url", "https://hooks.slack.com/…")}
            {field("Alert Email Address", "alert_email", "email", "alerts@example.com")}
            <div className="flex flex-wrap gap-5 pt-1">
              {[
                ["Email Alerts", "email_alerts_enabled"],
                ["Slack Alerts", "slack_alerts_enabled"],
              ].map(([label, key]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(form as Record<string, unknown>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 h-9 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
