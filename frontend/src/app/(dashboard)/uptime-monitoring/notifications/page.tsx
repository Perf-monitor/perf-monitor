"use client";

import { useState } from "react";
import {
  Bell, Plus, Trash2, Edit2, TestTube2, CheckCircle2,
  XCircle, Mail, Slack, Webhook,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toaster";
import {
  useNotificationProviders, useCreateProvider, useUpdateProvider,
  useDeleteProvider, useTestProvider,
} from "@/hooks/useUptime";
import type { NotificationProvider, NotificationProviderType } from "@/types";

const PROVIDER_ICONS: Record<NotificationProviderType, React.ReactNode> = {
  email:   <Mail className="h-4 w-4" />,
  slack:   <Slack className="h-4 w-4" />,
  teams:   <span className="text-xs font-bold">T</span>,
  discord: <span className="text-xs font-bold">D</span>,
  telegram:<span className="text-xs font-bold">TG</span>,
  webhook: <Webhook className="h-4 w-4" />,
};

const PROVIDER_COLORS: Record<NotificationProviderType, string> = {
  email:   "bg-blue-500/10 text-blue-500",
  slack:   "bg-purple-500/10 text-purple-500",
  teams:   "bg-indigo-500/10 text-indigo-500",
  discord: "bg-violet-500/10 text-violet-500",
  telegram:"bg-sky-500/10 text-sky-500",
  webhook: "bg-orange-500/10 text-orange-500",
};

const CONFIG_FIELDS: Record<NotificationProviderType, { key: string; label: string; placeholder: string; type?: string }[]> = {
  email:   [{ key: "recipients", label: "Recipients (comma-separated)", placeholder: "admin@example.com, ops@example.com" }],
  slack:   [{ key: "webhook_url", label: "Slack Webhook URL", placeholder: "https://hooks.slack.com/services/..." }],
  teams:   [{ key: "webhook_url", label: "Teams Webhook URL", placeholder: "https://outlook.office.com/webhook/..." }],
  discord: [{ key: "webhook_url", label: "Discord Webhook URL", placeholder: "https://discord.com/api/webhooks/..." }],
  telegram:[
    { key: "bot_token", label: "Bot Token", placeholder: "123456:ABC-DEF..." },
    { key: "chat_id",   label: "Chat ID",   placeholder: "-100123456789" },
  ],
  webhook: [
    { key: "webhook_url", label: "Webhook URL", placeholder: "https://your-server.com/webhook" },
    { key: "secret",      label: "Secret (optional)", placeholder: "shared-secret" },
  ],
};

interface ProviderFormState {
  name: string;
  provider_type: NotificationProviderType;
  enabled: boolean;
  config: Record<string, string>;
  notify_on_down: boolean;
  notify_on_recovery: boolean;
  notify_on_ssl_expiring: boolean;
  notify_on_ssl_expired: boolean;
  notify_on_ssl_invalid: boolean;
}

const DEFAULT_FORM: ProviderFormState = {
  name: "",
  provider_type: "slack",
  enabled: true,
  config: {},
  notify_on_down: true,
  notify_on_recovery: true,
  notify_on_ssl_expiring: true,
  notify_on_ssl_expired: true,
  notify_on_ssl_invalid: true,
};

function ProviderFormModal({
  initial,
  onClose,
}: {
  initial?: NotificationProvider;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProviderFormState>(
    initial
      ? {
          name: initial.name,
          provider_type: initial.provider_type,
          enabled: initial.enabled,
          config: { ...initial.config },
          notify_on_down: initial.notify_on_down,
          notify_on_recovery: initial.notify_on_recovery,
          notify_on_ssl_expiring: initial.notify_on_ssl_expiring,
          notify_on_ssl_expired: initial.notify_on_ssl_expired,
          notify_on_ssl_invalid: initial.notify_on_ssl_invalid,
        }
      : DEFAULT_FORM
  );

  const create = useCreateProvider();
  const update = initial ? useUpdateProvider(initial.id) : null;

  const set = <K extends keyof ProviderFormState>(k: K, v: ProviderFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setConfig = (key: string, value: string) =>
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      if (initial && update) {
        await update.mutateAsync(form);
        toast({ title: "Provider updated", variant: "success" });
      } else {
        await create.mutateAsync(form);
        toast({ title: "Provider created", variant: "success" });
      }
      onClose();
    } catch {
      toast({ title: "Failed to save provider", variant: "destructive" });
    }
  };

  const configFields = CONFIG_FIELDS[form.provider_type] ?? [];
  const isPending = create.isPending || (update?.isPending ?? false);

  const EVENTS: { key: keyof ProviderFormState; label: string }[] = [
    { key: "notify_on_down",         label: "Website Down" },
    { key: "notify_on_recovery",     label: "Website Recovered" },
    { key: "notify_on_ssl_expiring", label: "SSL Expiring Soon" },
    { key: "notify_on_ssl_expired",  label: "SSL Expired" },
    { key: "notify_on_ssl_invalid",  label: "SSL Validation Failure" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-xl space-y-5 overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-bold">{initial ? "Edit Provider" : "New Notification Provider"}</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Slack Ops Channel"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Provider Type</label>
            <select
              value={form.provider_type}
              onChange={(e) => { set("provider_type", e.target.value as NotificationProviderType); set("config", {}); }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="teams">Microsoft Teams</option>
              <option value="discord">Discord</option>
              <option value="telegram">Telegram</option>
              <option value="webhook">Generic Webhook</option>
            </select>
          </div>

          {configFields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{field.label}</label>
              <input
                type={field.type ?? "text"}
                value={form.config[field.key] ?? ""}
                onChange={(e) => setConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Notify On</p>
          <div className="space-y-2">
            {EVENTS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => set(key, e.target.checked as ProviderFormState[typeof key])}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="rounded"
          />
          Provider Enabled
        </label>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={isPending} onClick={handleSave}>
            {initial ? "Save Changes" : "Create Provider"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({ provider }: { provider: NotificationProvider }) {
  const [showEdit, setShowEdit] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const deleteProvider = useDeleteProvider();
  const testProvider = useTestProvider();

  const handleDelete = async () => {
    if (!confirm(`Delete "${provider.name}"?`)) return;
    try {
      await deleteProvider.mutateAsync(provider.id);
      toast({ title: "Provider deleted", variant: "success" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleTest = async () => {
    try {
      const res = await testProvider.mutateAsync(provider.id);
      setTestResult(res);
      toast({
        title: res.success ? "Test sent!" : "Test failed",
        variant: res.success ? "success" : "destructive",
      });
    } catch {
      toast({ title: "Test failed", variant: "destructive" });
    }
  };

  const colorClass = PROVIDER_COLORS[provider.provider_type] ?? "bg-muted text-muted-foreground";

  const EVENTS = [
    { key: "notify_on_down" as const,         label: "Down" },
    { key: "notify_on_recovery" as const,     label: "Recovery" },
    { key: "notify_on_ssl_expiring" as const, label: "SSL Expiring" },
    { key: "notify_on_ssl_expired" as const,  label: "SSL Expired" },
    { key: "notify_on_ssl_invalid" as const,  label: "SSL Invalid" },
  ];

  return (
    <>
      {showEdit && <ProviderFormModal initial={provider} onClose={() => setShowEdit(false)} />}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon + Info */}
            <div className="flex items-start gap-3 flex-1">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${colorClass}`}>
                {PROVIDER_ICONS[provider.provider_type]}
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{provider.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${provider.enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">{provider.provider_type}</Badge>
                </div>

                {/* Events */}
                <div className="flex flex-wrap gap-1.5">
                  {EVENTS.map(({ key, label }) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${provider[key] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground line-through"}`}
                    >
                      {provider[key] ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                      {label}
                    </span>
                  ))}
                </div>

                {testResult && (
                  <p className={`text-xs ${testResult.success ? "text-green-600" : "text-red-500"}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                leftIcon={<TestTube2 className="h-3.5 w-3.5" />}
                loading={testProvider.isPending}
                onClick={handleTest}
              >
                Test
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={() => setShowEdit(true)}
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                loading={deleteProvider.isPending}
                onClick={handleDelete}
                title="Delete"
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function NotificationsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: providers = [], isLoading } = useNotificationProviders();

  return (
    <div className="space-y-6">
      {showCreate && <ProviderFormModal onClose={() => setShowCreate(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-sm text-muted-foreground">Configure how alerts are delivered</p>
          </div>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          Add Provider
        </Button>
      </div>

      {/* Supported channels info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Supported Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(["email", "slack", "teams", "discord", "telegram", "webhook"] as NotificationProviderType[]).map((type) => (
              <div
                key={type}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg ${PROVIDER_COLORS[type]} bg-opacity-10`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${PROVIDER_COLORS[type]}`}>
                  {PROVIDER_ICONS[type]}
                </div>
                <span className="text-xs font-medium capitalize">
                  {type === "teams" ? "MS Teams" : type === "webhook" ? "Webhook" : type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Alert Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Website Down", desc: "Triggered when a website becomes unreachable" },
              { label: "Website Recovered", desc: "Triggered when a website comes back online" },
              { label: "SSL Expiring Soon", desc: "Triggered when cert is within the alert threshold" },
              { label: "SSL Expired", desc: "Triggered when a certificate has expired" },
              { label: "SSL Validation Failure", desc: "Invalid cert, hostname mismatch, or handshake failure" },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider list */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : providers.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No notification providers configured.</p>
            <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add your first provider
            </Button>
          </div>
        ) : (
          providers.map((p) => <ProviderCard key={p.id} provider={p} />)
        )}
      </div>
    </div>
  );
}
