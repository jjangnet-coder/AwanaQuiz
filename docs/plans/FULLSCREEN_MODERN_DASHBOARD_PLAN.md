# 풀스크린 다크 본부 포털 & 시험장 고정 패널 100% 활용 계획서

## 1. 본부 관리 포털 (`admin/index.html`) — "전체 탭 통일 풀스크린 다크 테마"
- **이질감 제거 (5개 탭 전체 통일)**:
  - 대시보드만 어둡게 하지 않고, **본부 포털 전체(`body`, 헤더, 대시보드, 단원 관리, 필기 채점, 핸드북별 결과, 모달)**를 하나의 일관된 **딥 옵시디언 다크 테마**(`#0B1120` 배경, `#111827` 카드/패널, `#1E293B` 테이블 헤더/입력창, `#F8FAFC` 텍스트)로 통일.
  - 단, 실제 A4 종이 미리보기인 `.print-award-page` 및 `@media print`는 종이 출력용 고대비 화이트 유지.
- **풀스크린 100% 활용**:
  - `.container`를 `max-width: 100%;`로 확장해 대형 모니터 좌우 여백 제거.
  - `#tab-monitor`를 `min-height: calc(100vh - 96px); display: flex; flex-direction: column;`으로 구성하고 `.monitor-grid`가 `flex: 1`로 화면 하단까지 꽉 차게 자동 확장.
  - SPARKS(크림슨 레드 `#F43F5E`) / T&T(에메랄드 그린 `#10B981`) 발광 탑 라인 및 고대비 상태 칩으로 3m 밖에서도 즉시 인지 가능.
  - **필기 채점 탭(`.written-table-container`)**도 `height: calc(100vh - 175px);`로 풀높이 고정 패널을 확장해 하단 여백 없이 동적 행 높이로 꽉 채움.

---

## 2. 시험장 점수 입력 (`index.html`) — "고정 풀높이 패널 + 동적 행 높이"
- **패널 외곽 크기 고정**:
  - `.container`를 `max-width: 100%;`로 확장.
  - `.table-container`의 높이를 **`height: calc(100vh - 135px);`**로 고정해 15명 조든 23명 조든 패널 외곽 크기가 흔들리지 않고 화면 하단까지 꽉 차게 유지.
- **행 높이 동적 자동 분배**:
  - `renderTableStructure()`에서 고정 패널 가용 높이를 현재 슬롯 수(`DISPLAY_SLOTS.length`)로 나누어 행 높이를 동적 계산 (`최소 31px ~ 최대 54px`) — 작은 노트북(23명)에서도 무스크롤 유지, 큰 모니터에서는 O/X 클릭 면적이 시원하게 확대.

---

## 3. Git 반영
- `index.html`, `admin/index.html`, `docs/plans/FULLSCREEN_MODERN_DASHBOARD_PLAN.md` 커밋 및 `git push`
