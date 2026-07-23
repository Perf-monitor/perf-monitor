import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import type { ProjectStatus, MetricStatus, AlertSeverity } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return Math.round(score).toString();
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatCLS(cls: number | null | undefined): string {
  if (cls === null || cls === undefined) return "—";
  return cls.toFixed(3);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  return format(new Date(dateStr), "MMM d, yyyy HH:mm");
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case "healthy":
      return "text-green-500";
    case "warning":
      return "text-amber-500";
    case "critical":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
}

export function getStatusBg(status: ProjectStatus): string {
  switch (status) {
    case "healthy":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "warning":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

export function getMetricStatusColor(status: MetricStatus): string {
  switch (status) {
    case "good":
      return "text-green-500";
    case "needs-improvement":
      return "text-amber-500";
    case "poor":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
}

export function getScoreStatus(score: number | null): ProjectStatus {
  if (score === null) return "unknown";
  if (score >= 90) return "healthy";
  if (score >= 80) return "warning";
  return "critical";
}

export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "low":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

export function getFrameworkLabel(framework: string): string {
  const labels: Record<string, string> = {
    react: "React.js",
    nextjs: "Next.js",
    vue: "Vue.js",
    nuxt: "Nuxt.js",
    angular: "Angular",
    svelte: "Svelte",
    other: "Other",
  };
  return labels[framework] ?? framework;
}

export function getEnvironmentLabel(env: string): string {
  const labels: Record<string, string> = {
    production: "Production",
    staging: "Staging",
    development: "Development",
    preview: "Preview",
  };
  return labels[env] ?? env;
}

export function scoreGaugeColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 90) return "#22c55e";
  if (score >= 80) return "#f59e0b";
  return "#ef4444";
}

export function truncate(str: string, maxLen = 40): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}
