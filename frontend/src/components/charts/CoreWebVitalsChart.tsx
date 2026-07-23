"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type { PerformanceReport } from "@/types";
import { formatMs, formatCLS } from "@/lib/utils";

interface CoreWebVitalsChartProps {
  report: PerformanceReport;
}

export function CoreWebVitalsRadar({ report }: CoreWebVitalsChartProps) {
  const data = [
    { metric: "Performance", value: report.performance_score },
    { metric: "Accessibility", value: report.accessibility_score },
    { metric: "SEO", value: report.seo_score },
    { metric: "Best Practices", value: report.best_practices_score },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
        <Radar
          name="Scores"
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function CoreWebVitalsBar({ report }: CoreWebVitalsChartProps) {
  const vitals = [
    { name: "LCP", value: report.lcp ?? 0, threshold: 2500, unit: "ms" },
    { name: "FCP", value: report.fcp ?? 0, threshold: 1800, unit: "ms" },
    { name: "TBT", value: report.total_blocking_time ?? 0, threshold: 200, unit: "ms" },
    { name: "TTFB", value: report.ttfb ?? 0, threshold: 800, unit: "ms" },
    { name: "INP", value: report.inp ?? 0, threshold: 200, unit: "ms" },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={vitals} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(v: number, name: string, props) => [
            `${v.toFixed(0)}ms`,
            props.payload.name,
          ]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {vitals.map((v) => (
            <Cell
              key={v.name}
              fill={v.value <= v.threshold ? "#22c55e" : v.value <= v.threshold * 1.5 ? "#f59e0b" : "#ef4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: { month: string; avg_performance: number; avg_accessibility: number; avg_seo: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
        />
        <Bar dataKey="avg_performance" name="Performance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="avg_accessibility" name="Accessibility" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="avg_seo" name="SEO" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
