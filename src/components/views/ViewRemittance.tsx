/* ============================================================
   ViewRemittance.tsx — View 2: 송금 관리 (프로토타입 view2.jsx 이식)
   ============================================================ */
"use client";
import React from "react";
import { DASH } from "@/lib/data";
import type { Order, Fmt, Insight } from "@/lib/types";
import { BarsH } from "@/components/charts";
import { Kpi, Card, Seg, LineChip, DDay, Insights, DataNote } from "@/components/ui";

export default function ViewRemittance({ orders, fmt, today }: { orders: Order[]; fmt: Fmt; today: Date }) {
  const { dayDiff, sum } = DASH.helpers;
  const [statusF, setStatusF] = React.useState("UNPAID");
  const [paidIds, setPaidIds] = React.useState<Set<number>>(() => new Set());
  const markPaid = (id: number) => setPaidIds((s) => new Set(s).add(id));

  const isUnpaid = (o: Order) => o.unpaid && !paidIds.has(o.id);
  const dueDays = (o: Order) => (o.remit_due ? dayDiff(o.remit_due, today) : null);

  const unpaid = orders.filter(isUnpaid);
  const curM = today.getMonth(),
    curY = today.getFullYear();
  const thisMonth = unpaid.filter(
    (o) => o.remit_due && o.remit_due.getMonth() === curM && o.remit_due.getFullYear() === curY
  );
  const thisMonthTotal = sum(thisMonth, (o) => o.amt);
  const overdue = unpaid.filter((o) => o.remit_due && o.remit_due < today);
  const withDue = unpaid.filter((o) => o.remit_due);
  const nearest = withDue.length ? withDue.reduce((m, o) => (dueDays(o)! < dueDays(m)! ? o : m)) : null;
  const noDue = unpaid.filter((o) => !o.remit_due);

  // distribution buckets by remit_due
  const bucketKey = (o: Order) => {
    if (!o.remit_due) return "미정";
    const d = dueDays(o)!;
    if (d < 0) return "연체";
    const mdiff = (o.remit_due.getFullYear() - curY) * 12 + (o.remit_due.getMonth() - curM);
    if (mdiff <= 0) return "이번 달";
    if (mdiff === 1) return "다음 달";
    return "이후";
  };
  const BUCKETS = ["연체", "이번 달", "다음 달", "이후", "미정"];
  const bucketData = BUCKETS.map((b) => {
    const set = unpaid.filter((o) => bucketKey(o) === b);
    const color =
      b === "연체"
        ? "var(--danger)"
        : b === "이번 달"
          ? "var(--warn)"
          : b === "다음 달"
            ? "var(--accent)"
            : b === "이후"
              ? "var(--accent-soft)"
              : "var(--track)";
    return { label: b, value: Math.round(sum(set, (o) => o.amt)), sub: `${set.length}건`, color };
  }).filter((d) => d.value > 0);

  // list
  let list = statusF === "UNPAID" ? unpaid : orders.filter((o) => !o.goods);
  list = [...list].sort((a, b) => {
    const da = dueDays(a),
      db = dueDays(b);
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });

  // AI insight: imminent + large
  const insights: Insight[] = [];
  const bigSoon = unpaid
    .filter((o) => o.remit_due && dueDays(o)! >= -3 && dueDays(o)! <= 7)
    .sort((a, b) => b.amt - a.amt)[0];
  if (bigSoon)
    insights.push({
      tone: dueDays(bigSoon)! < 0 ? "danger" : "warn",
      text: `${bigSoon.po_no} 송금기한 ${dueDays(bigSoon)! < 0 ? `D+${-dueDays(bigSoon)!}(연체)` : `D-${dueDays(bigSoon)!}`}, 금액 ${fmt.usd(bigSoon.amt)}로 큰 편 — 우선 처리를 권장합니다.`,
      src: `${bigSoon.name} ${bigSoon.unit}ml · Pickup ${fmt.date(bigSoon.pickup)}`,
    });
  if (overdue.length)
    insights.push({
      tone: "danger",
      text: `송금기한이 지난 미송금 ${overdue.length}건(${fmt.usd(sum(overdue, (o) => o.amt))})이 있습니다.`,
      src: "Paid 빈값 & 송금기한 < 오늘",
    });
  if (noDue.length)
    insights.push({
      tone: "info",
      text: `픽업일 미입력으로 송금기한을 계산할 수 없는 건이 ${noDue.length}건 있습니다 — 픽업일 확인 필요.`,
      src: "Pickup 빈값 → 기한 미정",
    });

  return (
    <div className="view">
      <div className="kpi-strip k3">
        <Kpi
          big
          label="이번 달 송금 예정 총액"
          value={fmt.usd(thisMonthTotal)}
          tone={thisMonthTotal > 0 ? "warn" : "good"}
          sub={`${curY}년 ${curM + 1}월 · 미송금 ${thisMonth.length}건`}
          foot={
            <span>
              통화 단위 <b>USD(추정)</b> · 송금기한 = 픽업월 익월 말일
            </span>
          }
        />
        <Kpi
          big
          label="가장 임박한 송금기한"
          value={
            nearest
              ? dueDays(nearest)! < 0
                ? `D+${-dueDays(nearest)!}`
                : dueDays(nearest) === 0
                  ? "D-DAY"
                  : `D-${dueDays(nearest)!}`
              : "—"
          }
          tone={nearest && dueDays(nearest)! <= 3 ? "danger" : nearest && dueDays(nearest)! <= 7 ? "warn" : undefined}
          sub={nearest ? `${nearest.po_no} · ${fmt.usd(nearest.amt)}` : "임박 건 없음"}
          foot={nearest ? `기한 ${fmt.date(nearest.remit_due)}` : null}
        />
        <Kpi
          big
          label="미송금 건수"
          value={unpaid.length}
          unit="건"
          sub={
            <span style={{ color: overdue.length ? "var(--danger)" : "var(--muted)" }}>
              연체 {overdue.length}건 · 기한미정 {noDue.length}건
            </span>
          }
          foot={`총 ${fmt.usd(sum(unpaid, (o) => o.amt))}`}
        />
      </div>

      <div className="grid-2-1">
        <Card
          title="미송금 오더"
          sub="송금기한 D-day 순 · 처리하면 목록에서 제외됩니다"
          right={
            <Seg
              size="sm"
              value={statusF}
              onChange={setStatusF}
              options={[
                { value: "UNPAID", label: "미송금만" },
                { value: "ALL", label: "전체" },
              ]}
            />
          }
          pad={0}
        >
          <div className="rtable">
            <div className="rt-head">
              <span>오더</span>
              <span>제품</span>
              <span className="ta-r">금액</span>
              <span>픽업일</span>
              <span>송금기한</span>
              <span className="ta-c">D-day</span>
              <span></span>
            </div>
            <div className="rt-body">
              {list.slice(0, 60).map((o) => {
                const paid = !isUnpaid(o);
                return (
                  <div key={o.id} className={"rt-row" + (paid ? " paid" : "")}>
                    <span className="po">{o.po_no}</span>
                    <span className="rt-prod">
                      <LineChip code={o.line} />
                      <span className="rt-pn">
                        {o.name} {o.unit}ml
                      </span>
                    </span>
                    <span className="ta-r mono">{fmt.usd(o.amt)}</span>
                    <span className="mono dim">{fmt.date(o.pickup)}</span>
                    <span className="mono dim">{fmt.date(o.remit_due)}</span>
                    <span className="ta-c">
                      <DDay days={dueDays(o)} />
                    </span>
                    <span className="ta-r">
                      {paid ? (
                        <span className="paid-tag">✓ 송금완료</span>
                      ) : (
                        <button className="btn-pay" onClick={() => markPaid(o.id)}>
                          송금 처리
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
              {list.length === 0 && <div className="empty">미송금 건이 없습니다 — 모두 처리되었습니다.</div>}
            </div>
          </div>
          {list.length > 60 && <div className="more">+ {list.length - 60}건 더</div>}
        </Card>

        <div className="rail">
          <Card title="송금기한별 미송금 금액" sub="USD(추정)">
            <BarsH data={bucketData} fmt={(n) => fmt.usdK(n)} />
            <div className="bucket-note">막대 길이 = 미송금 금액 합 · 우측 = 건수</div>
          </Card>
          <Insights items={insights.slice(0, 3)} />
        </div>
      </div>

      <DataNote>
        송금기한 = <b>픽업월의 익월 말일</b>(계산값). 픽업 미입력 건은 “기한 미정”으로 별도 표시. 금액은{" "}
        <b>USD(추정)</b> · 데이터 기준일 {fmt.date(today)}
      </DataNote>
    </div>
  );
}
