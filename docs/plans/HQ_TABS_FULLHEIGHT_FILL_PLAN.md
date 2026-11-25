# 본부 관리 포털 탭 하단 빈 여백 제거(풀높이 100% 채움) 계획서

## 1. 하단 여백이 크게 남았던 원인 (`admin/index.html`)
1. **핸드북별 전체 시상 결과 조회**: 표 컨테이너에 과거 임시 값인 `max-height: 62vh`가 인라인으로 박혀 있어 화면 하단 ~150px 이상이 통째로 비어 있었음.
2. **최고득점자 모아보기**: 탭 패널 높이가 `auto`이고 각 카드가 `height: 180px`로 고정되어 있어, 3줄(540px) 아래로 큰 회색 빈 공간이 남고 11개 카드가 `5 + 5 + 1`로 불균형하게 배치됨.
3. **단원 관리 탭**: 표 컨테이너에 풀높이 Flex가 적용되지 않아 브라우저 바깥 스크롤이 발생함.

---

## 2. 수정 방안 (모든 작업 탭 `calc(100vh - 82px)` 풀높이 통일)

### A. 핸드북별 결과 탭 (`#tab-handbook-awards`)
1. **외곽 패널 풀높이 고정**: `#tab-handbook-awards.active`에 `height: calc(100vh - 82px); display: flex; flex-direction: column; overflow: hidden;` 적용.
2. **전체 시상 결과 조회 (`#subTabAllAwards`)**:
   - `flex: 1; min-height: 0; display: flex; flex-direction: column;` 적용 (`switchHandbookAwardSubTab()`에서도 `'flex'`로 전환).
   - 표 컨테이너의 `max-height: 62vh` 제거 → `flex: 1; min-height: 0; overflow-y: auto;` + sticky `thead`로 **화면 하단 끝까지 꽉 차게 확장**.
3. **최고득점자 모아보기 (`#subTabTopScorers`)**:
   - `flex: 1; min-height: 0; display: flex; flex-direction: column;` 적용.
   - `#topScorersSummaryContainer`를 `flex: 1; min-height: 0; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 12px;`로 변경 → 11개 카드가 **`4 + 4 + 3` 균형 배치**로 화면 하단 끝까지 정확히 채워짐.
   - 개별 카드의 고정 `height: 180px` 제거 → `height: 100%; min-height: 0;`로 자동 채움 (동점자가 많을 때만 카드 내부 스크롤).

### B. 단원 관리 탭 (`#tab-participants`)
- `#tab-participants.active`도 동일하게 `height: calc(100vh - 82px); display: flex; flex-direction: column; overflow: hidden;` 적용.
- 내부 `.hq-table-container`에 `flex: 1; min-height: 0; overflow-y: auto;` + sticky `thead` 적용 → 바깥 브라우저 스크롤 없이 화면 하단까지 깔끔하게 꽉 채움.

---

## 3. Git 반영
- 승인 후 `admin/index.html` 및 `docs/plans/HQ_TABS_FULLHEIGHT_FILL_PLAN.md` 커밋 및 `main` 푸시.

