#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_data.py — Incoming Status 엑셀을 대시보드용 JSON으로 전처리.

하는 일(요약):
  1) ~/Downloads/Incoming Status_*.xlsx 중 최신본(또는 인자로 받은 경로)을 읽는다.
  2) 첫 시트 'Incoming Status'만 사용(헤더 2행, 데이터 3행부터).
  3) CANCELLED 제외 + 파생계산(제품군 매핑·물류단계·송금기한·미송금·신선도).
  4) src/data/dashboard-data.json 으로 저장.

사용:
  python scripts/build_data.py                 # Downloads 최신본 자동 탐색
  python scripts/build_data.py /경로/파일.xlsx  # 특정 파일 지정
"""
import sys, os, json, glob, datetime as dt
import pandas as pd

# ---- 경로 ----------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "src", "data", "dashboard-data.json")
GOAL = 13_800_000  # 2026 Sell-in 목표(병)

# 라인별 기본 shelf life(개월) — 월간 소비기한 PDF 연동 전까지의 기본값
SHELF = {"SP": 24, "AP": 24, "CSI": 12, "DISC": 12, "ETC": 0}

# 라인 메타(앱과 동일 — 참고용으로 JSON에 함께 내보냄)
BRANDS = {
    "SP":   {"code": "SP",   "name": "S.Pellegrino",            "kr": "산펠레그리노",  "color": "#B14A3F", "soft": "#F3E2DF"},
    "AP":   {"code": "AP",   "name": "Acqua Panna",             "kr": "아쿠아파나",    "color": "#5E8C6A", "soft": "#E2ECE4"},
    "CSI":  {"code": "CSI",  "name": "Italian Sparkling Drinks","kr": "시트러스(CSI)","color": "#D08A39", "soft": "#F6E8D5"},
    "DISC": {"code": "DISC", "name": "Essenza",                 "kr": "단종",          "color": "#9AA0A6", "soft": "#ECEDEE"},
    "ETC":  {"code": "ETC",  "name": "POS / Goods",             "kr": "기타",          "color": "#BCB6AB", "soft": "#EEEBE5"},
}

CSI_KEYWORDS = ("ARANCIATA", "POMPELMO", "ROSSA", "LIMONATA", "MELOGRANO", "MELARA", "CLEMENTINA", "CHINOTTO")


def find_source(argv):
    if len(argv) > 1 and argv[1].strip():
        p = os.path.expanduser(argv[1])
        if not os.path.exists(p):
            sys.exit(f"[오류] 파일을 찾을 수 없습니다: {p}")
        return p
    cands = glob.glob(os.path.expanduser("~/Downloads/Incoming Status_*.xlsx"))
    cands = [c for c in cands if not os.path.basename(c).startswith("~$")]  # 엑셀 임시잠금파일 제외
    if not cands:
        sys.exit("[오류] ~/Downloads 에서 'Incoming Status_*.xlsx' 를 찾지 못했습니다. 경로를 인자로 넘겨주세요.")
    return max(cands, key=os.path.getmtime)


def map_line(item, unit):
    """Item 문자열 → 제품군. POS/굿즈는 ETC."""
    s = str(item or "").upper().strip()
    if not s or s == "NAN":
        return "ETC"
    if any(k in s for k in CSI_KEYWORDS):
        return "CSI"
    if "ESSENZA" in s:
        return "DISC"
    if s.startswith("SP"):
        return "SP"
    if s.startswith("AP"):
        return "AP"
    # ISD = Italian Sparkling Drinks(키워드 없이 코드만 온 경우)
    if s.startswith("ISD") or s.startswith("CAN"):
        return "CSI"
    return "ETC"


def to_date(v):
    """엑셀 셀 → date 또는 None. 'CANCELLED' 등 문자열은 None."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    ts = pd.to_datetime(v, errors="coerce")
    if pd.isna(ts):
        return None
    return ts.date()


def iso(d):
    return d.isoformat() if d else None


def to_num(v, default=0):
    """셀 → 숫자. 'CANCELLED' 등 비숫자 문자열은 default."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def end_of_next_month(d):
    """송금기한 = 픽업월의 익월 말일."""
    y, m = d.year, d.month
    # 익월
    if m == 12:
        y2, m2 = y + 1, 1
    else:
        y2, m2 = y, m + 1
    # 익월의 말일 = 그 다음달 1일 - 1일
    if m2 == 12:
        first_next = dt.date(y2 + 1, 1, 1)
    else:
        first_next = dt.date(y2, m2 + 1, 1)
    return first_next - dt.timedelta(days=1)


def main():
    src = find_source(sys.argv)
    today = dt.date.today()
    print(f"[입력] {src}")
    print(f"[기준일] {today.isoformat()}")

    df = pd.read_excel(src, sheet_name="Incoming Status", header=1)
    df = df.dropna(how="all")  # 완전 빈 행 제거

    orders = []
    inv_map = {}  # (name, unit) -> 가장 최근(po_date) expiry 보유 행
    po_counter = 0

    for i, row in df.iterrows():
        item = row.get("Item")
        # PO 날짜 없으면 데이터 행 아님 → 스킵
        po_date = to_date(row.get("PO Date"))
        if po_date is None:
            continue

        ff = str(row.get("FF") or "").upper().strip()
        remarks = str(row.get("Remarks") or "").upper().strip()
        cancelled = ("CANCELLED" in ff) or (remarks == "CANCELLED")

        line = map_line(item, row.get("Unit (ml)"))
        goods = line == "ETC"

        unit = int(to_num(row.get("Unit (ml)"), 0))
        btl = int(to_num(row.get("Btl"), 0))
        amt = round(to_num(row.get("Amt"), 0.0), 2)

        pickup = to_date(row.get("Pick-up"))
        etd = to_date(row.get("ETD"))
        eta = to_date(row.get("ETA"))
        cc = to_date(row.get("C/C"))
        expiry = to_date(row.get("Expiry Date"))
        paid = to_date(row.get("Paid"))

        # ---- 물류 단계 ----
        if cancelled:
            stage = "CANCELLED"
        elif cc:
            stage = "DONE"
        elif eta and eta < today:
            stage = "CUSTOMS"
        elif etd:
            stage = "TRANSIT"
        else:
            stage = "PRE"

        # ---- 송금기한 / 미송금 ----
        remit_due = end_of_next_month(pickup) if pickup else None
        unpaid = (paid is None) and (not cancelled) and (not goods)

        # ---- 신선도 ----
        shelf = SHELF.get(line, 0)
        freshness = None
        if expiry and shelf > 0:
            days_left = (expiry - today).days
            freshness = round(days_left / (shelf * 30) * 100)
            if freshness > 100:
                freshness = 100

        po_raw = row.get("SD PO#")
        if pd.isna(po_raw):
            po_no = f"ROW{i}"
        else:
            try:
                po_no = "SD" + str(int(po_raw))
            except (ValueError, TypeError):
                po_no = str(po_raw).strip()

        name = str(item).strip() if pd.notna(item) else "—"

        rec = {
            "id": int(po_counter),
            "po_no": po_no,
            "po_date": iso(po_date),
            "line": line,
            "goods": goods,
            "name": name,
            "unit": unit,
            "btl": btl,
            "amt": amt,
            "pickup": iso(pickup),
            "etd": iso(etd),
            "eta": iso(eta),
            "cc": iso(cc),
            "stage": stage,
            "cancelled": cancelled,
            "paid": iso(paid),
            "remit_due": iso(remit_due),
            "unpaid": unpaid,
            "expiry": iso(expiry),
            "shelf": shelf,
            "freshness": freshness,
        }
        orders.append(rec)
        po_counter += 1

        # 신선도 워치리스트: 제품(name+unit)별 가장 최근 배치의 expiry 사용
        if expiry and shelf > 0 and not cancelled and not goods:
            key = (name, unit)
            prev = inv_map.get(key)
            if prev is None or po_date > prev["_po"]:
                inv_map[key] = {
                    "line": line, "name": name, "unit": unit, "shelf": shelf,
                    "freshness": freshness, "expiry": iso(expiry), "_po": po_date,
                }

    inventory = []
    for v in inv_map.values():
        v.pop("_po", None)
        inventory.append(v)

    # ---- 집계(요약 출력 + meta) ----
    active = [o for o in orders if not o["cancelled"] and not o["goods"]]
    cancelled_n = sum(1 for o in orders if o["cancelled"])
    unpaid_n = sum(1 for o in active if o["unpaid"])
    ytd_btl = sum(o["btl"] for o in active if o["po_date"][:4] == "2026")
    stage_counts = {"PRE": 0, "TRANSIT": 0, "CUSTOMS": 0, "DONE": 0}
    for o in active:
        if o["stage"] in stage_counts:
            stage_counts[o["stage"]] += 1
    line_counts = {}
    for o in active:
        line_counts[o["line"]] = line_counts.get(o["line"], 0) + 1

    meta = {
        "asOfDate": today.isoformat(),
        "sourceFile": os.path.basename(src),
        "total": len(orders),
        "cancelled": cancelled_n,
        "unpaid": unpaid_n,
        "goal": GOAL,
        "pdfIntegrated": False,  # 월간 소비기한 PDF 미연동(신선도는 엑셀 채워진 행만)
    }

    out = {"meta": meta, "brands": BRANDS, "orders": orders, "inventory": inventory}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    # ---- 콘솔 요약 ----
    print("\n=== 요약 ===")
    print(f"총 행: {len(orders)} · CANCELLED: {cancelled_n} · active(비취소·비굿즈): {len(active)}")
    print(f"미송금(active): {unpaid_n}건")
    print(f"라인별 active 건수: {line_counts}")
    print(f"물류 단계(active): {stage_counts}")
    print(f"2026 누적 발주: {ytd_btl:,}병 / 목표 {GOAL:,}병 = {ytd_btl/GOAL*100:.1f}%")
    print(f"신선도 워치리스트 품목: {len(inventory)}종 (expiry 채워진 제품만)")
    print(f"\n[출력] {os.path.abspath(OUT)}")


if __name__ == "__main__":
    main()
