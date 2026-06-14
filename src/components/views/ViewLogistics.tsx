/* ============================================================
   ViewLogistics.tsx — View 1: 물류 현황 (프로토타입 view1.jsx 이식)
   ============================================================ */
"use client";
import React from "react";
import { DASH } from "@/lib/data";
import type { Order, Fmt, Insight } from "@/lib/types";
import { StageTimeline, StackedBar } from "@/components/charts";
import { Kpi, StageDot, Card, Seg, Sel, LineChip, StageBadge, Insights, DataNote, LINE_ORDER } from "@/components/ui";

function delaySuspect(o: Order, today: Date, dayDiff: (a: Date, b: Date) => number): string | null {
  // ETA passed but customs not cleared for >7d
  if (o.stage === "CUSTOMS" && o.eta && dayDiff(today, o.eta) > 7) return "통관 지연 의심";
  // picked up but no ETD for >21d
  if (o.stage === "PRE" && o.pickup && dayDiff(today, o.pickup) > 21) return "출항 기록 없음";
  return null;
}
function lastEvent(o: Order): Date {
  return o.cc || o.eta || o.etd || o.pickup || o.po_date;
}

export default function ViewLogistics({ orders, fmt, today }: { orders: Order[]; fmt: Fmt; today: Date }) {
  const { dayDiff } = DASH.helpers;
  const [stageFilter, setStageFilter] = React.useState("ALL");
  const [sort, setSort] = React.useState("recent");

  const inflight = orders.filter((o) => o.stage !== "DONE");
  const counts: Record<string, number> = { PRE: 0, TRANSIT: 0, CUSTOMS: 0 };
  inflight.forEach((o) => {
    if (counts[o.stage] != null) counts[o.stage]++;
  });

  const thisWeek = orders.filter((o) => DASH.inThisWeek(o.pickup) || DASH.inThisWeek(o.eta));
  const delayed = inflight.map((o) => ({ o, why: delaySuspect(o, today, dayDiff) })).filter((x) => x.why);

  // list
  let list = inflight;
  if (stageFilter !== "ALL") list = list.filter((o) => o.stage === stageFilter);
  list = [...list].sort((a, b) => {
    if (sort === "recent") return lastEvent(b).getTime() - lastEvent(a).getTime();
    if (sort === "stage")
      return ["PRE", "TRANSIT", "CUSTOMS"].indexOf(a.stage) - ["PRE", "TRANSIT", "CUSTOMS"].indexOf(b.stage);
    if (sort === "btl") return b.btl - a.btl;
    return 0;
  });

  // stage distribution by line
  const lineDist = LINE_ORDER.map((code) => {
    const set = inflight.filter((o) => o.line === code);
    return {
      code,
      total: set.length,
      seg: [
        { label: "픽업전", value: set.filter((o) => o.stage === "PRE").length, color: "var(--stage-pre)" },
        { label: "운송중", value: set.filter((o) => o.stage === "TRANSIT").length, color: "var(--stage-transit)" },
        { label: "통관대기", value: set.filter((o) => o.stage === "CUSTOMS").length, color: "var(--stage-customs)" },
      ],
    };
  }).filter((d) => d.total > 0);

  // AI insights (data-driven, ≤3)
  const insights: Insight[] = [];
  const worstCustoms = delayed
    .filter((x) => x.why!.includes("통관"))
    .sort((a, b) => (a.o.eta!.getTime() - b.o.eta!.getTime()))[0];
  if (worstCustoms)
    insights.push({
      tone: "warn",
      text: `${worstCustoms.o.po_no} (${worstCustoms.o.name} ${worstCustoms.o.unit}ml) 입항 후 ${dayDiff(today, worstCustoms.o.eta!)}일째 통관이 지연되고 있을 수 있습니다.`,
      src: `ETA ${fmt.date(worstCustoms.o.eta)} · C/C 미기재`,
    });
  const stuck = delayed.find((x) => x.why!.includes("출항"));
  if (stuck)
    insights.push({
      tone: "danger",
      text: `${stuck.o.po_no} (${stuck.o.name}) 픽업됐으나 출항(ETD) 기록이 없습니다 — 확인이 필요합니다.`,
      src: `Pickup ${fmt.date(stuck.o.pickup)} · ETD 미기재`,
    });
  if (counts.CUSTOMS >= 1)
    insights.push({
      tone: "info",
      text: `현재 통관 대기 ${counts.CUSTOMS}건 중 ${delayed.filter((x) => x.why!.includes("통관")).length}건이 7일 이상 지연 구간입니다.`,
      src: "물류 단계 파생 추론",
    });

  return (
    <div className="view">
      {/* KPI strip */}
      <div className="kpi-strip k5">
        <Kpi
          label="픽업 전 · Pre-pickup"
          value={counts.PRE}
          unit="건"
          foot={
            <span>
              <StageDot stage="PRE" /> 오더 완료, 픽업 대기
            </span>
          }
        />
        <Kpi
          label="운송 중 · In transit"
          value={counts.TRANSIT}
          unit="건"
          foot={
            <span>
              <StageDot stage="TRANSIT" /> 출항함, 입항 전
            </span>
          }
        />
        <Kpi
          label="통관 대기 · Customs"
          value={counts.CUSTOMS}
          unit="건"
          tone={counts.CUSTOMS > 0 ? "warn" : undefined}
          foot={
            <span>
              <StageDot stage="CUSTOMS" /> 입항함, 통관 전
            </span>
          }
        />
        <Kpi
          label="이번 주 픽업·입항"
          value={thisWeek.length}
          unit="건"
          foot={`${fmt.md(DASH.weekStart)}–${fmt.md(DASH.weekEnd)}`}
        />
        <Kpi
          label="지연 의심"
          value={delayed.length}
          unit="건"
          tone={delayed.length > 0 ? "danger" : "good"}
          foot="ETA 경과·통관 미완 / 픽업 후 미출항"
        />
      </div>

      <div className="grid-2-1">
        {/* main: in-flight pipeline list */}
        <Card
          title="운송 중인 오더"
          sub={`${list.length}건 · 픽업 → 출항 → 입항 → 통관 타임라인`}
          right={
            <div className="card-tools">
              <Seg
                size="sm"
                value={stageFilter}
                onChange={setStageFilter}
                options={[
                  { value: "ALL", label: "전체" },
                  { value: "PRE", label: "픽업전" },
                  { value: "TRANSIT", label: "운송중" },
                  { value: "CUSTOMS", label: "통관대기" },
                ]}
              />
              <Sel
                label="정렬"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "recent", label: "최근 이벤트순" },
                  { value: "stage", label: "단계순" },
                  { value: "btl", label: "수량순" },
                ]}
              />
            </div>
          }
          pad={0}
        >
          <div className="olist">
            {list.slice(0, 40).map((o) => {
              const why = delaySuspect(o, today, dayDiff);
              const since = dayDiff(today, lastEvent(o));
              return (
                <div key={o.id} className={"orow" + (why ? " flag" : "")}>
                  <div className="orow-id">
                    <div className="po">{o.po_no}</div>
                    <LineChip code={o.line} />
                  </div>
                  <div className="orow-prod">
                    <div className="pname">
                      {o.name} <span className="punit">{o.unit}ml</span>
                    </div>
                    <div className="pmeta">
                      {fmt.int(o.btl)} btl · {fmt.usdK(o.amt)}
                    </div>
                  </div>
                  <div className="orow-time">
                    <StageTimeline order={o} fmt={fmt} />
                  </div>
                  <div className="orow-stat">
                    <StageBadge stage={o.stage} />
                    {why ? (
                      <span className="flag-tag">
                        ⚠ {why} · {since}일째
                      </span>
                    ) : (
                      <span className="since">최근 이벤트 {since}일 전</span>
                    )}
                  </div>
                </div>
              );
            })}
            {list.length === 0 && <div className="empty">해당 조건의 운송 중 오더가 없습니다.</div>}
          </div>
          {list.length > 40 && <div className="more">+ {list.length - 40}건 더 · 필터로 좁혀 보세요</div>}
        </Card>

        {/* right rail */}
        <div className="rail">
          <Card title="제품군별 진행 단계" sub="운송 중 오더 분포">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lineDist.map((d) => (
                <div key={d.code}>
                  <div className="dist-h">
                    <LineChip code={d.code} />
                    <span className="dist-n">{d.total}건</span>
                  </div>
                  <StackedBar segments={d.seg} />
                </div>
              ))}
              {lineDist.length === 0 && <div className="empty">운송 중 오더 없음</div>}
              <div className="legend">
                <span>
                  <StageDot stage="PRE" size={8} />
                  픽업전
                </span>
                <span>
                  <StageDot stage="TRANSIT" size={8} />
                  운송중
                </span>
                <span>
                  <StageDot stage="CUSTOMS" size={8} />
                  통관대기
                </span>
              </div>
            </div>
          </Card>

          <Insights items={insights.slice(0, 3)} />
        </div>
      </div>

      <DataNote>
        물류 단계는 날짜 컬럼(Pickup·ETD·ETA·C/C) 채움 여부로 <b>자동 추론한 추정값</b>입니다. · 데이터 기준일{" "}
        {fmt.date(today)} · CANCELLED·POS/굿즈 제외
      </DataNote>
    </div>
  );
}
