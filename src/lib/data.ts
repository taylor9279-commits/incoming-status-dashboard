/* ============================================================
   data.ts — 전처리 JSON 로드 + 파생/헬퍼/포맷 (프로토타입 data.js 대체)
   원본 data.js의 window.DASH API를 그대로 재현해 뷰 코드 변경을 최소화.
   ============================================================ */
import raw from "@/data/dashboard-data.json";
import type {
  Order,
  RawOrder,
  Inventory,
  RawInventory,
  Brand,
  Meta,
  LineCode,
  Stage,
  Fmt,
} from "./types";

const MS_DAY = 86400000;
const parse = (s: string | null): Date | null => (s ? new Date(s + "T00:00:00") : null);

const meta = raw.meta as Meta;
const BRANDS = raw.brands as Record<string, Brand>;

const TODAY = new Date(meta.asOfDate + "T00:00:00");

// ---- orders: 날짜 문자열 → Date ----
const orders: Order[] = (raw.orders as RawOrder[]).map((o) => ({
  ...o,
  line: o.line as LineCode,
  stage: o.stage as Stage,
  po_date: new Date(o.po_date + "T00:00:00"),
  pickup: parse(o.pickup),
  etd: parse(o.etd),
  eta: parse(o.eta),
  cc: parse(o.cc),
  paid: parse(o.paid),
  remit_due: parse(o.remit_due),
  expiry: parse(o.expiry),
}));

const inventory: Inventory[] = (raw.inventory as RawInventory[]).map((p) => ({
  ...p,
  line: p.line as LineCode,
  freshness: p.freshness ?? 0,
  expiry: parse(p.expiry),
}));

// ---- active(비취소·비굿즈) ----
const active = orders.filter((o) => !o.cancelled && !o.goods);

// ---- helpers ----
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * MS_DAY);
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / MS_DAY);
const endOfMonth = (y: number, m: number) => new Date(y, m + 1, 0);
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const sum = <T>(arr: T[], f: (o: T) => number) => arr.reduce((s, o) => s + f(o), 0);

function stageCounts(arr: Order[]) {
  const c: Record<string, number> = { PRE: 0, TRANSIT: 0, CUSTOMS: 0, DONE: 0 };
  arr.forEach((o) => {
    if (c[o.stage] != null) c[o.stage]++;
  });
  return c;
}
function byLine(arr: Order[]) {
  const m: Record<string, { line: string; btl: number; amt: number; orders: number }> = {};
  arr.forEach((o) => {
    if (!m[o.line]) m[o.line] = { line: o.line, btl: 0, amt: 0, orders: 0 };
    m[o.line].btl += o.btl;
    m[o.line].amt += o.amt;
    m[o.line].orders++;
  });
  return m;
}

// ---- 목표 / YTD ----
const GOAL = meta.goal;
const ytd2026 = active.filter((o) => o.po_date.getFullYear() === 2026);
const ytdBottles = sum(ytd2026, (o) => o.btl);

// ---- 이번 주 윈도우(월~일) ----
const dow = (TODAY.getDay() + 6) % 7; // 0=월
const weekStart = addDays(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()), -dow);
const weekEnd = addDays(weekStart, 6);
const inThisWeek = (d: Date | null) => !!d && d >= weekStart && d <= addDays(weekEnd, 1);

// ---- 포맷 ----
const fmt: Fmt = {
  int: (n) => Math.round(n).toLocaleString("en-US"),
  usd: (n) => "$" + Math.round(n).toLocaleString("en-US"),
  usdK: (n) =>
    n >= 1000 ? "$" + (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "K" : "$" + Math.round(n),
  mBtl: (n) => (n / 1000000).toFixed(2) + "M",
  date: (d) =>
    d
      ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
      : "—",
  md: (d) =>
    d ? `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}` : "—",
};

export const DASH = {
  TODAY,
  meta,
  BRANDS,
  orders,
  active,
  inventory,
  GOAL,
  ytdBottles,
  weekStart,
  weekEnd,
  inThisWeek,
  helpers: { sum, stageCounts, byLine, addDays, dayDiff, endOfMonth, iso },
  counts: {
    total: meta.total,
    cancelled: meta.cancelled,
    goods: orders.filter((o) => o.goods).length,
    unpaid: meta.unpaid,
    activeStages: stageCounts(active),
  },
  fmt,
};

export type Dash = typeof DASH;
