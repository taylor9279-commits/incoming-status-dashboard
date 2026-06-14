/* ============================================================
   charts.tsx — 손수 만든 SVG 차트 프리미티브 (프로토타입 charts.jsx 이식)
   Donut, BarsV, BarsH, Gauge, AreaTrend, StageTimeline, StackedBar
   ============================================================ */
import React from "react";
import type { Order, Fmt } from "@/lib/types";

// ---- Donut -----------------------------------------------------------------
export function Donut({
  data,
  size = 132,
  thickness = 16,
  center,
  centerSub,
  gap = 2,
}: {
  data: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  centerSub?: React.ReactNode;
  gap?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2,
    cy = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = Math.max(0, frac * C - gap);
          const off = -acc * C;
          acc += frac;
          if (d.value <= 0) return null;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={off}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      {center != null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {center}
          </div>
          {centerSub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{centerSub}</div>}
        </div>
      )}
    </div>
  );
}

// ---- Vertical bars ---------------------------------------------------------
export function BarsV({
  data,
  height = 160,
  fmt = (n: number) => String(n),
  accent = "var(--accent)",
  highlightLast,
}: {
  data: { value: number; label: string; color?: string; short?: string }[];
  height?: number;
  fmt?: (n: number) => string;
  accent?: string;
  highlightLast?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * (height - 26));
        const isLast = highlightLast && i === data.length - 1;
        return (
          <div
            key={i}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}
          >
            <div className="bar-val">{d.short || fmt(d.value)}</div>
            <div
              title={fmt(d.value)}
              style={{
                width: "100%",
                maxWidth: 34,
                height: h,
                borderRadius: 4,
                background: d.color || (isLast ? accent : "var(--accent-soft)"),
                transition: "height .5s cubic-bezier(.2,.7,.2,1)",
              }}
            />
            <div style={{ fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Horizontal bars (ranking) ---------------------------------------------
export function BarsH({
  data,
  fmt = (n: number) => n.toLocaleString(),
  max: maxOverride,
}: {
  data: { label: string; value: number; color: string; sub?: string }[];
  fmt?: (n: number) => string;
  max?: number;
}) {
  const max = maxOverride || Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 540,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {d.label}
            </span>
          </div>
          <div style={{ height: 9, borderRadius: 5, background: "var(--track)", overflow: "hidden" }}>
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: "100%",
                borderRadius: 5,
                background: d.color,
                transition: "width .6s cubic-bezier(.2,.7,.2,1)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "var(--ink)",
              whiteSpace: "nowrap",
            }}
          >
            {fmt(d.value)}
            {d.sub && <span style={{ color: "var(--muted)", fontWeight: 440, marginLeft: 6 }}>{d.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Semicircle goal gauge -------------------------------------------------
export function Gauge({
  value,
  max,
  paceValue,
  size = 260,
  accent = "var(--accent)",
}: {
  value: number;
  max: number;
  paceValue: number;
  size?: number;
  accent?: string;
}) {
  const pct = Math.min(1, value / max);
  const w = size,
    h = size / 2 + 26;
  const r = (size - 30) / 2;
  const cx = size / 2,
    cy = size / 2 + 4;
  const arc = (frac: number): [number, number] => {
    const a = Math.PI * (1 - frac);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const [ex, ey] = arc(pct);
  const large = pct > 0.5 ? 1 : 0;
  const [sx, sy] = arc(0);
  const [px, py] = arc(Math.min(1, paceValue / max));
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: size }}>
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${arc(1)[0]} ${arc(1)[1]}`}
        fill="none"
        stroke="var(--track)"
        strokeWidth={18}
        strokeLinecap="round"
      />
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
        fill="none"
        stroke={accent}
        strokeWidth={18}
        strokeLinecap="round"
      />
      {/* pace marker */}
      <line
        x1={px}
        y1={py}
        x2={cx + (r + 11) * Math.cos(Math.PI * (1 - Math.min(1, paceValue / max)))}
        y2={cy - (r + 11) * Math.sin(Math.PI * (1 - Math.min(1, paceValue / max)))}
        stroke="var(--ink)"
        strokeWidth={2}
        strokeDasharray="2 2"
        opacity="0.55"
      />
    </svg>
  );
}

// ---- Area / line trend -----------------------------------------------------
export function AreaTrend({
  points,
  height = 64,
  color = "var(--accent)",
  fill = true,
}: {
  points: number[];
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  const max = Math.max(...points, 1),
    min = Math.min(...points, 0);
  const W = 100,
    H = height;
  const span = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p - min) / span) * (H - 8) - 4);
  const line = xs.map((x, i) => `${i ? "L" : "M"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {fill && <path d={area} fill={color} opacity="0.1" />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---- Per-order pipeline timeline (픽업→출항→입항→통관) ---------------------
export const PIPE_STEPS = [
  { key: "pickup", label: "Pickup", kr: "픽업" },
  { key: "etd", label: "ETD", kr: "출항" },
  { key: "eta", label: "ETA", kr: "입항" },
  { key: "cc", label: "C/C", kr: "통관" },
] as const;

export function StageTimeline({ order, fmt, compact }: { order: Order; fmt: Fmt; compact?: boolean }) {
  const reached = PIPE_STEPS.map((s) => !!order[s.key]);
  const lastIdx = reached.lastIndexOf(true);
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {PIPE_STEPS.map((s, i) => {
        const on = reached[i];
        const isCurrent = i === lastIdx && order.stage !== "DONE";
        return (
          <React.Fragment key={s.key}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
              <div
                style={{
                  width: isCurrent ? 13 : 11,
                  height: isCurrent ? 13 : 11,
                  borderRadius: "50%",
                  background: on ? (isCurrent ? "var(--accent)" : "var(--accent-mid)") : "var(--track)",
                  border: isCurrent ? "3px solid var(--accent-soft)" : "none",
                  boxShadow: isCurrent ? "0 0 0 1px var(--accent)" : "none",
                  flexShrink: 0,
                }}
              />
              {!compact && (
                <div style={{ textAlign: "center", lineHeight: 1.15 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: on ? "var(--ink)" : "var(--muted)" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    {on ? fmt.md(order[s.key] as Date | null) : "—"}
                  </div>
                </div>
              )}
            </div>
            {i < PIPE_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2.5,
                  margin: "0 2px",
                  borderRadius: 2,
                  marginBottom: compact ? 0 : 22,
                  background: reached[i + 1] ? "var(--accent-mid)" : "var(--track)",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---- Stacked horizontal bar (stage distribution within a line) -------------
export function StackedBar({
  segments,
  height = 10,
}: {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        background: "var(--track)",
      }}
    >
      {segments.map(
        (s, i) =>
          s.value > 0 && (
            <div
              key={i}
              title={`${s.label}: ${s.value}`}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: "width .5s ease" }}
            />
          )
      )}
    </div>
  );
}
