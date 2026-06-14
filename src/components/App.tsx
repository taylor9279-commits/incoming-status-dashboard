/* ============================================================
   App.tsx — 대시보드 셸: 헤더, 내비, 글로벌 필터 (프로토타입 app.jsx 이식)
   Tweaks 패널은 운영 앱에서 제외(레이아웃/강조색은 layout.tsx 정적 기본값).
   ============================================================ */
"use client";
import React, { useState } from "react";
import { DASH } from "@/lib/data";
import ViewLogistics from "@/components/views/ViewLogistics";
import ViewRemittance from "@/components/views/ViewRemittance";
import ViewAggregate from "@/components/views/ViewAggregate";

const TABS = [
  { id: 0, en: "Logistics", kr: "물류 현황", note: "매일", icon: "M3 13h4l2 5 4-12 2 7h5" },
  { id: 1, en: "Remittance", kr: "송금 관리", note: "월 1회", icon: "M3 7h18M3 12h18M7 17h5" },
  { id: 2, en: "Aggregation", kr: "발주 집계·소비기한", note: "상시", icon: "M5 19V9M10 19V5M15 19v-7M20 19v-4" },
];
const LINE_FILTERS = [
  { value: "ALL", label: "전체" },
  { value: "SP", label: "SP" },
  { value: "AP", label: "AP" },
  { value: "CSI", label: "CSI" },
  { value: "DISC", label: "단종" },
];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <span>IO</span>
      </div>
      <div className="brand-txt">
        <div className="brand-t">Import Order Dashboard</div>
        <div className="brand-s">산펠레그리노 · 아쿠아파나 수입 오더</div>
      </div>
    </div>
  );
}

function NavItem({
  tab,
  active,
  onClick,
  count,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
  count?: number | null;
}) {
  return (
    <button className={"nav-item" + (active ? " on" : "")} onClick={onClick}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={tab.icon} />
      </svg>
      <span className="nav-labels">
        <span className="nav-en">{tab.en}</span>
        <span className="nav-kr">{tab.kr}</span>
      </span>
      {count != null && <span className="nav-count">{count}</span>}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [line, setLine] = useState("ALL");
  const D = DASH;

  const base = line === "ALL" ? D.active : D.active.filter((o) => o.line === line);
  const inflight = base.filter((o) => o.stage !== "DONE").length;
  const unpaid = base.filter((o) => o.unpaid).length;
  const counts: (number | null)[] = [inflight, unpaid, null];

  const viewProps = { orders: base, fmt: D.fmt, today: D.TODAY };
  const View = [ViewLogistics, ViewRemittance, ViewAggregate][tab];

  const globalFilters = (
    <div className="gfilters">
      <span className="gf-label">제품군</span>
      <div className="seg sm">
        {LINE_FILTERS.map((l) => (
          <button
            key={l.value}
            className={"seg-btn" + (l.value === line ? " on" : "")}
            onClick={() => setLine(l.value)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );

  const asOf = (
    <div className="asof">
      <span className="asof-dot" />
      데이터 기준 <b>{D.fmt.date(D.TODAY)}</b>
      <span className="asof-sep">·</span>
      <span className="asof-rows">
        {D.fmt.int(D.counts.total)}행 · CANCELLED {D.counts.cancelled}건 제외
      </span>
    </div>
  );

  return (
    <div className="app lay-topbar">
      <div className="main">
        <header className="topbar">
          <Brand />
          <nav className="tnav">
            {TABS.map((tb) => (
              <NavItem key={tb.id} tab={tb} active={tab === tb.id} onClick={() => setTab(tb.id)} count={counts[tb.id]} />
            ))}
          </nav>
          <div className="topbar-right">
            {globalFilters}
            {asOf}
          </div>
        </header>

        <main className="content">
          <div className="view-head">
            <div>
              <h1 className="view-title">
                {TABS[tab].kr} <span className="view-en">{TABS[tab].en}</span>
              </h1>
              <p className="view-desc">
                {
                  [
                    "지금 각 오더가 어느 물류 단계에 있는지 추적하고 픽업·출항·입항·통관 일정을 챙깁니다.",
                    "이번 달 송금 마감을 놓치지 않도록 미송금 건과 송금기한을 관리합니다.",
                    "흩어진 발주 기록을 제품군별로 집계하고 연간 목표·소비기한을 관리합니다.",
                  ][tab]
                }
              </p>
            </div>
            <span className="view-tag">{TABS[tab].note} 사용</span>
          </div>
          <View {...viewProps} />
        </main>
      </div>
    </div>
  );
}
