# 수입 오더 대시보드 (Import Order Dashboard)

산펠레그리노·아쿠아파나 수입 오더 운영 대시보드. Next.js + TypeScript.
디자인은 Claude Design 프로토타입을 그대로 옮겼고, 데이터는 실제 `Incoming Status` 엑셀에서 가져온다.

## 한 번만 (최초 설치)

```bash
cd "10-projects/산펠레그리노-수입-대시보드/dashboard"
npm install
```

## 데이터 갱신 → 화면 보기 (평소 사용)

새 엑셀(`Incoming Status_YYYYMMDD.xlsx`)을 다운로드 폴더에 받은 뒤:

```bash
# 1) 엑셀 → 대시보드 데이터로 변환 (Downloads 최신본 자동 사용)
#    워크스페이스 파이썬 환경에서 실행:
source ../../../.venv/bin/activate
npm run data

# 2) 대시보드 띄우기
npm run dev
```

그 다음 브라우저에서 **http://localhost:3000** 열기.
(특정 파일을 쓰려면: `python scripts/build_data.py "/경로/파일.xlsx"`)

## 3개 화면

| 탭 | 용도 | 주기 |
|----|------|------|
| 물류 현황 | 각 오더의 물류 단계(픽업→출항→입항→통관) 추적, 지연 의심 탐지 | 매일 |
| 송금 관리 | 이번 달 송금 예정·임박 D-day·미송금 리스트(송금 처리 버튼) | 월 1회 |
| 발주 집계·소비기한 | 연간 목표 게이지, 제품군별 합계, 소비기한 신선도 | 상시 |

## 데이터 처리 규칙 (요약)

- 첫 시트 `Incoming Status`만 사용, **CANCELLED(FF) 제외**.
- 제품군: Item 키워드로 SP / AP / CSI(시트러스) / 단종(Essenza) / 기타(POS·굿즈) 매핑.
- 물류 단계: 날짜 컬럼(Pickup·ETD·ETA·C/C) 채움 여부로 자동 추론(추정값).
- 송금기한 = 픽업월의 익월 말일. 픽업 미입력 = "기한 미정".
- "데이터 기준일" = 변환(`npm run data`) 실행한 날짜.

## 아직 안 된 것 (다음 단계)

- **월간 소비기한 PDF 미연동**: 신선도는 엑셀에 채워진 소비기한(약 14%)만 사용,
  제품 수명은 라인별 기본값(SP/AP 24개월·CSI/DISC 12개월). PDF 구조 확정 시 정교화.
- 클라우드 비공개 배포(현재는 로컬 실행).
