# 매직 넘버(`calc(100vh - Npx)`) 제거 및 Flex 100vh 완전 고정 계획서

## 1. 7px 스크롤바가 남았던 이유
- `body` 상하 패딩(`20px`) + `.hq-header` 실제 높이(`59px`) + 하단 마진(`10px`) = **`89px`** 이었는데, `#tab-monitor.active`에 `calc(100vh - 82px)`를 적어 **`100vh + 7px`** 로 7px가 넘쳤습니다.
- 숫자를 수동으로 빼는 방식(`-82px`, `-185px`)은 폰트 크기나 브라우저 배율(90%, 110%, 125%)이 조금만 달라도 오차가 생깁니다.

---

## 2. 근본 해결책 (매직 넘버 0개, Flex `100vh` 100% 자동 분배)

### A. 본부 관리 포털 (`admin/index.html`)
1. **최상위 레이아웃을 `100vh` Flex Column으로 고정**:
   - `html, body { height: 100vh !important; overflow: hidden !important; display: flex; flex-direction: column; }`
   - `.container { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; }`
   - `.hq-header { flex-shrink: 0; }`
2. **모든 탭(`.tab-content.active`)에 `flex: 1; min-height: 0;` 적용** (수동 `calc(100vh - ...)` 전부 제거):
   - `#tab-monitor.active` (**대시보드**): `flex: 1; min-height: 0; overflow: hidden;` → 헤더 높이가 몇 px이든 남은 공간을 **0.00px 오차로 100% 차지 (브라우저 스크롤 영구 0%)**.
   - `#tab-participants.active` (**단원 관리**): `flex: 1; min-height: 0; overflow: hidden;` → 내부 표만 스크롤.
   - `#tab-written.active` (**필기 채점**): `flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;` + `.written-table-container { flex: 1; min-height: 0; height: auto !important; }` → 매직 넘버 `185px` 제거.
   - `#tab-awards.active` (**시상 명단·인쇄**): `flex: 1; min-height: 0; overflow-y: auto;` → 긴 인쇄 미리보기만 패널 내부 스크롤.
   - `#tab-handbook-awards.active` (**핸드북별 결과**): `flex: 1; min-height: 0; overflow: hidden;` → 전체 시상 표·최고득점자 `4×3` 카드가 화면 끝까지 꽉 참.
3. **인쇄(`@media print`) 보호**:
   - `@media print`에서 `html, body, .container, .tab-content.active`에 `height: auto !important; overflow: visible !important; display: block !important;` 명시해 인쇄 출력이 잘리지 않도록 보장.

### B. 시험장 점수 입력 (`index.html`)
- 동일하게 `html, body { height: 100vh; overflow: hidden; display: flex; flex-direction: column; }`, `.container { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; }`, `.table-container { flex: 1; min-height: 0; height: auto; }`로 매직 넘버 `135px` 제거.

---

## 3. Git 반영
- 승인 후 `admin/index.html`, `index.html`, `docs/plans/ZERO_MAGIC_NUMBER_FLEX_VIEWPORT_PLAN.md` 커밋 및 `main` 푸시.

