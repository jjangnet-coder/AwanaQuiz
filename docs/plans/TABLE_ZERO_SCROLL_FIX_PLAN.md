# 전 화면 세로 스크롤 완전 제거 수정 계획서 (시험장 입력 + 본부 대시보드 + 필기 채점)

## 1. 문제 원인 요약
1. **시험장 점수 입력 (`index.html`)**:
   - `tbody td`에 `line-height: var(--row-h) !important`가 들어가 있어, 계산된 행 높이에 행마다 테두리 `1px`이 추가로 누적(`+19px` 초과)되면서 테이블 내부 세로 스크롤바가 발생함.
2. **본부 관리 포털 대시보드 (`admin/index.html` `#tab-monitor`)**:
   - `#tab-monitor.active`가 `min-height`로만 설정되어 있고, 상단 헤더·요약 카드·상태 바·3줄 시험장 카드의 여백 합계가 1080p 브라우저 가용 높이(`~940px`)를 약 `15~25px` 초과하면서 브라우저 우측 스크롤바가 발생함.
3. **본부 관리 포털 필기 채점 (`admin/index.html` `#tab-written`)**:
   - `loadWrittenScoringList()`가 `tr`/`td`에 인라인 `height`를 강제해 테두리 누적 시 하단 행이 미세하게 잘릴 수 있음.

---

## 2. 수정 방안 (스크롤바 0% 보장)

### A. 시험장 점수 입력 (`index.html`)
- **CSS**: `tbody td`, `tbody tr`, `.quiz-cell`에서 `line-height: var(--row-h) !important`와 강제 `height: var(--row-h) !important` 제거 → `line-height: 1.1; vertical-align: middle;`로 변경.
- **JS (`applyScoringTableHeight()`)**:
  - 일반 조(`24px <= availH / N <= 54px`, 15~25명 전 구간): `#scoringTable`에 `height: 100%`, `.table-container`에 `overflow-y: hidden` 적용 → 브라우저 테이블 엔진이 **1px 오차 없이 정확히 1/N 균등 분배 (세로 스크롤 0%)**.
  - 소규모 조(`availH / N > 54px`): `#scoringTable` `height: auto`, `tr` 상한 `54px` (`overflow-y: hidden`).
  - 초소형 창(`availH / N < 24px`): 글자 잘림 방지 최소 `24px` + `overflow-y: auto` 안전 폴백.
  - `window.resize` 시에도 자동 재계산.

### B. 본부 관리 포털 대시보드 (`admin/index.html`)
- **`#tab-monitor.active` 정확히 1화면 고정**:
  - `min-height` 대신 `height: calc(100vh - 86px); overflow: hidden;` 적용.
  - `.monitor-grid`에 `flex: 1; min-height: 0; grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 10px;` 적용 → 12개 카드 3줄이 남은 세로 높이를 1/3씩 정확히 나눠 가지며 **절대 화면 밖으로 넘치지 않음**.
- **세로 여백 컴팩트 최적화 (약 55px 절감)**:
  - 상단 헤더 `padding: 8px 16px; margin-bottom: 10px;`
  - 요약 카드 4종 `padding: 12px 18px; margin-bottom: 10px;`
  - 상태 스트립 `padding: 6px 14px; margin-bottom: 10px;`
  - 시험장 카드 `padding: 10px 14px;`, 교시 카드 `padding: 6px 5px;`
  - 1080p·1440p·노트북 모두에서 **브라우저 스크롤바 완전 제거**.

### C. 본부 관리 포털 필기 채점 (`admin/index.html`)
- `.written-table-container` 높이를 화면 여백에 맞춰 `calc(100vh - 165px)`로 조정해 바깥 브라우저 스크롤도 발생하지 않도록 고정.
- 일반 조에서는 `tr`/`td` 인라인 강제 `height`를 제거하고 `.written-table { height: 100% }` 네이티브 1/N 분배에 맡겨 하단 잘림 및 스크롤 완전 차단.

---

## 3. Git 반영
- 승인 후 `index.html`, `admin/index.html`, `docs/plans/TABLE_ZERO_SCROLL_FIX_PLAN.md` 커밋 및 `main` 브랜치 푸시.
