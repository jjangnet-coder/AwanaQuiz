# 시상 명단·인쇄 / 단원 관리 탭 스크롤 복구 계획서 (`admin/index.html`)

## 1. 정확한 원인
`admin/index.html`의 풀높이 Flex CSS에서 탭 ID를 잘못 참조하고 있었습니다:
- 실제 HTML ID: **`#tab-standings`** (시상 명단·인쇄), **`#tab-roster`** (단원 관리)
- CSS에 적혀 있던 ID: `#tab-awards`, `#tab-participants` → 스타일이 미적용되어 `body { overflow: hidden }` 상태에서 **`시상 명단·인쇄`와 `단원 관리` 탭이 스크롤되지 않던 버그**가 발생함.

## 2. 수정 방안 (`admin/index.html`)
- CSS의 `#tab-awards` → **`#tab-standings`**, `#tab-participants` → **`#tab-roster`** 로 전수 교정 (`@media print` 포함).
- `#tab-standings.active`: `flex: 1; min-height: 0; overflow-y: auto;` 정상 적용 → 긴 시상 명단·인쇄 미리보기가 패널 내부에서 부드럽게 스크롤됨.
- `#tab-roster.active`: `display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;` + 내부 `.hq-table-container { flex: 1; min-height: 0; overflow-y: auto; }` + sticky 헤더 정상 적용.

## 3. Git 반영
- 승인 후 `admin/index.html` 및 `docs/plans/HQ_TAB_IDS_SCROLL_FIX_PLAN.md` 커밋 및 `main` 푸시.

