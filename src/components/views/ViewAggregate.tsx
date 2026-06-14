/* ============================================================
   ViewAggregate.tsx — View 3: 발주 집계·소비기한 (프로토타입 view3.jsx 이식)
   ============================================================ */
"use client";
import React from "react";
import { DASH } from "@/lib/data";
import type { Order, Fmt, Insight, LineCode } from "@/lib/types";
import { BarsH, Gauge } from "@/components/charts";
import { Kpi, Card, Sel, Freshness, Insights, DataNote, LINE_ORDER, lineMeta } from "@/components/ui";

function StackedV({
  years,
  lines,
  data,
  fmt,
}: {
  years: number[];
  lines: LineCode[];
  data: Record<number, Record<string, number>>;
  fmt: Fmt;
}) {
  // data[year][line] = bottles
  const totals = years.map((y) => lines.reduce((s, l) => s + (data[y]?.[l] || 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 168 }}>
      {years.map((y, yi) => {
        const tot = totals[yi];
        const colH = Math.max(2, (tot / max) * 132);
        return (
          <div
            key={y}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}
          >
            <div className="bar-val">{(tot / 1000000).toFixed(1)}M</div>
            <div
              style={{
                width: "100%",
                maxWidth: 40,
                height: colH,
                borderRadius: 4,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {lines.map((l) => {
                const v = data[y]?.[l] || 0;
                if (!v) return null;
                return (
                  <div
                    key={l}
                    title={`${lineMeta(l).name}: ${fmt.int(v)}`}
                    style={{ height: `${(v / tot) * 100}%`, background: lineMeta(l).color }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{y}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ViewAggregate({ orders, fmt, today }: { orders: Order[]; fmt: Fmt; today: Date }) {
  const { sum } = DASH.helpers;
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  const [year, setYear] = React.useState("2026");
  const [unit, setUnit] = React.useState("ALL");

  const unitOpts: (string | number)[] = ["ALL", ...Array.from(new Set(orders.map((o) => o.unit))).sort((a, b) => a - b)];
  let scoped = orders;
  if (unit !== "ALL") scoped = scoped.filter((o) => o.unit === Number(unit));
  const yScoped = scoped.filter((o) => o.po_date.getFullYear() === Number(year));

  // KPI 1 — goal gauge
  const GOAL = DASH.GOAL;
  const ytdBottles = sum(
    scoped.filter((o) => o.po_date.getFullYear() === 2026),
    (o) => o.btl
  );
  const pct = (ytdBottles / GOAL) * 100;
  const doy = DASH.helpers.dayDiff(today, new Date(2026, 0, 1)) + 1;
  const pace = (doy / 365) * GOAL;
  const onPace = ytdBottles >= pace;

  // KPI 2 — by line
  const lineAgg = LINE_ORDER.map((code) => {
    const set = yScoped.filter((o) => o.line === code);
    return { code, btl: sum(set, (o) => o.btl), amt: sum(set, (o) => o.amt), orders: set.length };
  })
    .filter((d) => d.btl > 0)
    .sort((a, b) => b.btl - a.btl);
  const lineBars = lineAgg.map((d) => ({
    label: lineMeta(d.code).name,
    value: d.btl,
    color: lineMeta(d.code).color,
    sub: fmt.usdK(d.amt),
  }));

  // KPI 3 — freshness (from monthly-PDF product inventory: oldest on-hand batch)
  const invLines = new Set(orders.map((o) => o.line));
  let inv = DASH.inventory.filter((p) => invLines.has(p.line));
  if (unit !== "ALL") inv = inv.filter((p) => p.unit === Number(unit));
  const imminent = inv.filter((p) => p.freshness <= 30);
  const freshList = [...inv].sort((a, b) => a.freshness - b.freshness).slice(0, 10);

  // annual trend stacked by line
  const trend: Record<number, Record<string, number>> = {};
  years.forEach((y) => {
    trend[y] = {};
    LINE_ORDER.forEach((l) => (trend[y][l] = 0));
  });
  scoped.forEach((o) => {
    const y = o.po_date.getFullYear();
    if (trend[y]) trend[y][o.line] += o.btl;
  });

  const insights: Insight[] = [];
  if (!onPace)
    insights.push({
      tone: "warn",
      text: `현재 페이스(연 환산 ${fmt.mBtl((ytdBottles / doy) * 365)})로는 연간 목표 ${fmt.mBtl(GOAL)}병 달성이 어려울 수 있습니다.`,
      src: `YTD ${fmt.int(ytdBottles)}병 / 기대 ${fmt.int(Math.round(pace))}병(${doy}일차)`,
    });
  if (imminent.length) {
    const w = freshList[0];
    insights.push({
      tone: imminent.some((o) => o.freshness <= 15) ? "danger" : "warn",
      text: `${w.name} ${w.unit}ml 잔여 신선도 ~${w.freshness}% — 소진 계획 검토가 필요합니다.`,
      src: `소비기한 ${fmt.date(w.expiry)} · 월간 PDF`,
    });
  }
  const topLine = lineAgg[0];
  if (topLine)
    insights.push({
      tone: "info",
      text: `${year}년 발주는 ${lineMeta(topLine.code).name}(${fmt.mBtl(topLine.btl)}병)가 가장 큽니다 — 전체의 ${Math.round((topLine.btl / sum(yScoped, (o) => o.btl)) * 100)}%.`,
      src: "SUM(Btl) · CANCELLED 제외",
    });

  return (
    <div className="view">
      <div className="agg-top">
        {/* goal gauge card */}
        <Card title="2026 연간 목표 진행" sub="Sell-in 기준 · 목표 1,380만 병">
          <div className="gauge-wrap">
            <div style={{ position: "relative" }}>
              <Gauge value={ytdBottles} max={GOAL} paceValue={pace} />
              <div className="gauge-center">
                <div className="gauge-pct" style={{ color: onPace ? "var(--good)" : "var(--warn)" }}>
                  {pct.toFixed(1)}%
                </div>
                <div className="gauge-sub">
                  {fmt.mBtl(ytdBottles)} / {fmt.mBtl(GOAL)}병
                </div>
              </div>
            </div>
            <div className="gauge-meta">
              <div className="gm-row">
                <span className="gm-dot" style={{ background: onPace ? "var(--good)" : "var(--warn)" }} />
                <span>
                  현재 누적 <b>{fmt.int(ytdBottles)}</b>병
                </span>
              </div>
              <div className="gm-row">
                <span className="gm-dot dash" />
                <span>
                  {doy}일차 기대 페이스 <b>{fmt.int(Math.round(pace))}</b>병
                </span>
              </div>
              <div className={"pace-pill " + (onPace ? "ok" : "warn")}>
                {onPace ? "페이스 양호" : `페이스 대비 ${fmt.int(Math.round(pace - ytdBottles))}병 부족`}
              </div>
              <div className="sellout-note">
                ⚠ Sell-out 실적은 이 데이터로 측정 불가 — 게이지는 Sell-in(입고) 기준
              </div>
            </div>
          </div>
        </Card>

        {/* secondary KPI tiles */}
        <div className="agg-kpis">
          <Kpi
            label="소비기한 임박 품목"
            value={imminent.length}
            unit="종"
            tone={imminent.length ? "danger" : "good"}
            sub="잔여 신선도 ~30% 이하"
            foot="월간 PDF + 엑셀 보완"
          />
          <Kpi
            label={`${year}년 발주 수량`}
            value={fmt.mBtl(sum(yScoped, (o) => o.btl))}
            unit="병"
            sub={`${yScoped.length}건 · ${unit === "ALL" ? "전 용량" : unit + "ml"}`}
            foot={`발주금액 ${fmt.usd(sum(yScoped, (o) => o.amt))}`}
          />
        </div>
      </div>

      <div className="grid-2-1">
        <div className="rail">
          <Card
            title="제품군별 발주 집계"
            sub={`${year}년 · 막대=병 수, 우측=금액(USD 추정)`}
            right={
              <div className="card-tools">
                <Sel
                  label="연도"
                  value={year}
                  onChange={setYear}
                  options={years.map((y) => ({ value: String(y), label: y + "년" }))}
                />
                <Sel
                  label="용량"
                  value={unit}
                  onChange={setUnit}
                  options={unitOpts.map((u) => ({ value: String(u), label: u === "ALL" ? "전체" : u + "ml" }))}
                />
              </div>
            }
          >
            <BarsH data={lineBars} fmt={(n) => fmt.int(n)} />
          </Card>

          <Card title="연간 발주 추이" sub="PO Date 연도별 · 제품군 누적(병)">
            <StackedV years={years} lines={LINE_ORDER} data={trend} fmt={fmt} />
            <div className="legend wide">
              {LINE_ORDER.map((l) => (
                <span key={l}>
                  <span
                    style={{ width: 8, height: 8, borderRadius: 2, background: lineMeta(l).color, display: "inline-block" }}
                  />
                  {lineMeta(l).name}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="rail">
          <Card title="소비기한 신선도 낮은 순" sub="제품(이름+용량) 기준 · 잔여 신선도 %">
            <div className="fresh-list">
              {freshList.map((o, i) => (
                <div key={i} className="fresh-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="fr-name">
                      {o.name} <span className="punit">{o.unit}ml</span>
                    </div>
                    <div className="fr-exp">소비기한 {fmt.date(o.expiry)}</div>
                  </div>
                  <Freshness pct={o.freshness} />
                </div>
              ))}
              {freshList.length === 0 && <div className="empty">신선도 데이터가 있는 품목이 없습니다.</div>}
            </div>
          </Card>
          <Insights items={insights.slice(0, 3)} />
        </div>
      </div>

      <DataNote>
        합계는 <b>CANCELLED 제외</b>. 목표는 전체 1,380만 병(Sell-in). 잔여 신선도 %는 <b>추정값(~)</b> · 소비기한
        출처: 월간 PDF(갱신월 표기) · 데이터 기준일 {fmt.date(today)}
      </DataNote>
    </div>
  );
}
