"use client";

import { scoreGaugeColor } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number | null;
  label: string;
  size?: number;
}

export function ScoreGauge({ score, label, size = 80 }: ScoreGaugeProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const dash = pct * circumference;
  const color = scoreGaugeColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="score-ring"
        />
        <text
          x={size / 2}
          y={size / 2 + 5}
          textAnchor="middle"
          className="rotate-90"
          style={{
            fill: color,
            fontSize: size > 70 ? 18 : 14,
            fontWeight: 700,
            transform: `rotate(90deg) translate(0, 0)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
          }}
        >
          {score !== null ? Math.round(score) : "–"}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export function ScoreCardRow({ scores }: {
  scores: { label: string; value: number | null }[];
}) {
  return (
    <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
      {scores.map((s) => (
        <ScoreGauge key={s.label} score={s.value} label={s.label} />
      ))}
    </div>
  );
}
