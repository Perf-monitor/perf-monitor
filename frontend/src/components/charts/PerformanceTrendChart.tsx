"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import type { TrendDataPoint } from "@/types";

interface PerformanceTrendChartProps {
  data: TrendDataPoint[];
  showAll?: boolean;
}

const COLORS = {
  performance: "#3b82f6",
  accessibility: "#10b981",
  seo: "#f59e0b",
  best_practices: "#8b5cf6",
};

export function PerformanceTrendChart({ data, showAll = false }: PerformanceTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.tested_at), "MMM d"),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="performance_score"
          name="Performance"
          stroke={COLORS.performance}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        {showAll && (
          <>
            <Line
              type="monotone"
              dataKey="accessibility_score"
              name="Accessibility"
              stroke={COLORS.accessibility}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="seo_score"
              name="SEO"
              stroke={COLORS.seo}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="best_practices_score"
              name="Best Practices"
              stroke={COLORS.best_practices}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
