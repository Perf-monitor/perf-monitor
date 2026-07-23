import { cn } from "@/lib/utils";
import type { ProjectStatus, AlertSeverity } from "@/types";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "status" | "severity";
  status?: ProjectStatus;
  severity?: AlertSeverity;
}

export function Badge({ children, className, variant = "default", status, severity }: BadgeProps) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";

  const variantClass =
    variant === "status" && status
      ? {
          healthy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          unknown: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        }[status]
      : variant === "severity" && severity
      ? {
          critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
          medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        }[severity]
      : variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : variant === "outline"
      ? "border border-border text-foreground"
      : "bg-primary text-primary-foreground";

  return <span className={cn(base, variantClass, className)}>{children}</span>;
}
