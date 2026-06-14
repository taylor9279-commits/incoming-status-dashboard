/* ============================================================
   ui.tsx — 공통 UI 원자 + 도메인 메타 (프로토타입 ui.jsx 이식)
   ============================================================ */
import React from "react";
import { DASH } from "@/lib/data";
import type { Insight, LineCode } from "@/lib/types";

export const STAGE: Record<string, { key: string; en: string; kr: string; v: string }> = {
  PRE: { key: "PRE", en: "Pre-pickup", kr: "픽업전", v: "--stage-pre" },
  TRANSIT: { key: "TRANSIT", en: "In transit", kr: "운송중", v: "--stage-transit" },
  CUSTOMS: { key: "CUSTOMS", en: "Customs", kr: "통관대기", v: "--stage-customs" },
  DONE: { key: "DONE", en: "Completed", kr: "완료", v: "--stage-done" },
};
export const LINE_ORDER: LineCode[] = ["SP", "AP", "CSI", "DISC"];
export const lineMeta = (code: string) => DASH.BRANDS[code] || DASH.BRANDS.ETC;

// ---- Card -----------------------------------------------------------------
export function Card({
  title,
  sub,
  right,
  children,
  pad = 18,
  className = "",
  style = {},
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  pad?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={"card " + className} style={style}>
      {(title || right) && (
        <header className="card-h">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="card-t">{title}</h3>}
            {sub && <p className="card-s">{sub}</p>}
          </div>
          {right && <div style={{ flexShrink: 0 }}>{right}</div>}
        </header>
      )}
      <div style={{ padding: pad, paddingTop: title ? 0 : pad }}>{children}</div>
    </section>
  );
}

// ---- KPI tile -------------------------------------------------------------
export function Kpi({
  label,
  value,
  unit,
  sub,
  foot,
  tone,
  big,
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  sub?: React.ReactNode;
  foot?: React.ReactNode;
  tone?: "danger" | "warn" | "good";
  big?: boolean;
  children?: React.ReactNode;
}) {
  const toneColor =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "good"
          ? "var(--good)"
          : "var(--ink)";
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val" style={{ color: toneColor, fontSize: big ? 38 : 30 }}>
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {children}
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}

// ---- chips / badges -------------------------------------------------------
export function Chip({
  children,
  color,
  soft,
  style = {},
}: {
  children: React.ReactNode;
  color?: string;
  soft?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className="chip" style={{ color: color || "var(--ink)", background: soft || "var(--track)", ...style }}>
      {children}
    </span>
  );
}
export function LineChip({ code, showKr }: { code: string; showKr?: boolean }) {
  const m = lineMeta(code);
  return (
    <span className="chip" style={{ color: m.color, background: m.soft }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: m.color, display: "inline-block" }} />
      {m.name}
      {showKr && <span style={{ opacity: 0.7 }}>· {m.kr}</span>}
    </span>
  );
}
export function StageDot({ stage, size = 9 }: { stage: string; size?: number }) {
  const s = STAGE[stage] || STAGE.PRE;
  return (
    <span
      style={{ width: size, height: size, borderRadius: "50%", background: `var(${s.v})`, display: "inline-block", flexShrink: 0 }}
    />
  );
}
export function StageBadge({ stage }: { stage: string }) {
  const s = STAGE[stage] || STAGE.PRE;
  return (
    <span className="chip" style={{ background: "var(--track)", color: "var(--ink)" }}>
      <StageDot stage={stage} />
      {s.en}
      <span style={{ color: "var(--muted)" }}>{s.kr}</span>
    </span>
  );
}

// ---- D-day badge ----------------------------------------------------------
export function DDay({ days }: { days: number | null }) {
  if (days == null)
    return (
      <span className="chip" style={{ background: "var(--track)", color: "var(--muted)" }}>
        기한 미정
      </span>
    );
  const overdue = days < 0;
  const soon = days >= 0 && days <= 7;
  const tone = overdue ? "var(--danger)" : soon ? "var(--warn)" : "var(--ink)";
  const bg = overdue ? "var(--danger-soft)" : soon ? "var(--warn-soft)" : "var(--track)";
  return (
    <span className="chip ddmono" style={{ color: tone, background: bg, fontWeight: 700 }}>
      {overdue ? `D+${Math.abs(days)}` : days === 0 ? "D-DAY" : `D-${days}`}
    </span>
  );
}

// ---- Freshness meter ------------------------------------------------------
export function Freshness({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
  const tone = pct <= 20 ? "var(--danger)" : pct <= 40 ? "var(--warn)" : "var(--good)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(3, pct)}%`, height: "100%", background: tone, borderRadius: 3 }} />
      </div>
      <span
        style={{ fontSize: 12, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
      >
        ~{pct}%
      </span>
    </div>
  );
}

// ---- AI insight panel -----------------------------------------------------
export function Insights({ items, layout = "stack" }: { items: Insight[]; layout?: string }) {
  return (
    <div className={"insights " + layout}>
      <div className="insights-h">
        <span className="spark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.9 5.6L19.5 9l-4.5 3.3 1.7 5.7L12 14.8 7.3 18l1.7-5.7L4.5 9l5.6-1.4z" />
          </svg>
        </span>
        AI 인사이트 <span className="insights-tag">제안</span>
      </div>
      <div className="insights-body">
        {items.length === 0 && <div className="insight-empty">현재 주의가 필요한 신호가 없습니다.</div>}
        {items.map((it, i) => (
          <div key={i} className={"insight i-" + (it.tone || "info")}>
            <div className="insight-dot" />
            <div style={{ minWidth: 0 }}>
              <div className="insight-text">{it.text}</div>
              <div className="insight-src">참조 · {it.src}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- data transparency note ----------------------------------------------
export function DataNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="datanote">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5v.5" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

// ---- segmented control ----------------------------------------------------
type Opt = string | { value: string; label: string };
export function Seg({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
  size?: string;
}) {
  return (
    <div className={"seg " + size}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lab = typeof o === "string" ? o : o.label;
        return (
          <button key={val} className={"seg-btn" + (val === value ? " on" : "")} onClick={() => onChange(val)}>
            {lab}
          </button>
        );
      })}
    </div>
  );
}

// ---- select ---------------------------------------------------------------
export function Sel({
  options,
  value,
  onChange,
  label,
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
  label?: React.ReactNode;
}) {
  return (
    <label className="sel">
      {label && <span className="sel-l">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lab = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {lab}
            </option>
          );
        })}
      </select>
    </label>
  );
}
