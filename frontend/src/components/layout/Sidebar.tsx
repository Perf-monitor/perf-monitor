"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  History,
  Bell,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Activity,
  Globe,
  ShieldCheck,
  AlertOctagon,
  Clock,
  BellRing,
  ChevronDown,
  RadioTower,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/monitoring", label: "RUM Monitor", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const UPTIME_NAV_ITEMS = [
  { href: "/uptime-monitoring/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/uptime-monitoring/uptime", label: "Uptime", icon: Globe },
  { href: "/uptime-monitoring/ssl", label: "SSL", icon: ShieldCheck },
  { href: "/uptime-monitoring/incidents", label: "Incidents", icon: AlertOctagon },
  { href: "/uptime-monitoring/history", label: "History", icon: Clock },
  { href: "/uptime-monitoring/ssl-alerts", label: "SSL Alerts", icon: BellRing },
  { href: "/uptime-monitoring/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [uptimeOpen, setUptimeOpen] = useState(pathname.startsWith("/uptime-monitoring"));

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
          <Zap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight">PerfMonitor</p>
            <p className="text-xs text-muted-foreground">Lighthouse Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}

        {/* Monitoring Section */}
        {!collapsed ? (
          <div>
            <button
              onClick={() => setUptimeOpen(!uptimeOpen)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/uptime-monitoring")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <RadioTower className="h-5 w-5 flex-shrink-0" />
                <span>Monitoring</span>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform flex-shrink-0", uptimeOpen && "rotate-180")}
              />
            </button>
            {uptimeOpen && (
              <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                {UPTIME_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/uptime-monitoring/dashboard"
            className={cn(
              "flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/uptime-monitoring")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title="Monitoring"
          >
            <RadioTower className="h-5 w-5 flex-shrink-0" />
          </Link>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
