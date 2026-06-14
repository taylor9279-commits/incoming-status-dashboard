/* 대시보드 도메인 타입 */

export type LineCode = "SP" | "AP" | "CSI" | "DISC" | "ETC";
export type Stage = "PRE" | "TRANSIT" | "CUSTOMS" | "DONE" | "CANCELLED";

/** 전처리 JSON 안의 오더(날짜는 ISO 문자열 또는 null) */
export interface RawOrder {
  id: number;
  po_no: string;
  po_date: string;
  line: LineCode;
  goods: boolean;
  name: string;
  unit: number;
  btl: number;
  amt: number;
  pickup: string | null;
  etd: string | null;
  eta: string | null;
  cc: string | null;
  stage: Stage;
  cancelled: boolean;
  paid: string | null;
  remit_due: string | null;
  unpaid: boolean;
  expiry: string | null;
  shelf: number;
  freshness: number | null;
}

/** 앱에서 쓰는 오더(날짜는 Date 또는 null) */
export interface Order {
  id: number;
  po_no: string;
  po_date: Date;
  line: LineCode;
  goods: boolean;
  name: string;
  unit: number;
  btl: number;
  amt: number;
  pickup: Date | null;
  etd: Date | null;
  eta: Date | null;
  cc: Date | null;
  stage: Stage;
  cancelled: boolean;
  paid: Date | null;
  remit_due: Date | null;
  unpaid: boolean;
  expiry: Date | null;
  shelf: number;
  freshness: number | null;
}

export interface RawInventory {
  line: LineCode;
  name: string;
  unit: number;
  shelf: number;
  freshness: number | null;
  expiry: string | null;
}

export interface Inventory {
  line: LineCode;
  name: string;
  unit: number;
  shelf: number;
  freshness: number;
  expiry: Date | null;
}

export interface Brand {
  code: LineCode;
  name: string;
  kr: string;
  color: string;
  soft: string;
}

export interface Meta {
  asOfDate: string;
  sourceFile: string;
  total: number;
  cancelled: number;
  unpaid: number;
  goal: number;
  pdfIntegrated: boolean;
}

export interface Insight {
  tone?: "info" | "warn" | "danger";
  text: string;
  src: string;
}

export type Fmt = {
  int: (n: number) => string;
  usd: (n: number) => string;
  usdK: (n: number) => string;
  mBtl: (n: number) => string;
  date: (d: Date | null) => string;
  md: (d: Date | null) => string;
};
