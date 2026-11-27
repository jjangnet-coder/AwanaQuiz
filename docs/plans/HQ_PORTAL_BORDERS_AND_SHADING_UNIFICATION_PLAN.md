# 본부 관리 포털 구분선 · 행별 음영 일괄 개선 계획서

## 1. 목적
밝은 모니터 환경에서도 본부 관리 포털([admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html))의 모든 표·카드·섹션 경계와 행 흐름을 한눈에 파악할 수 있도록, 흐린 구분선(`#f1f5f9`, `#eef2f6`, `rgba(..., 0.06)`)과 행 음영 누락을 전 탭에 걸쳐 일괄 정비합니다.

---

## 2. 수정 항목 ([admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html))

### A. 공통 데이터 테이블 (`.hq-table` — 단원 관리 & 핸드북별 전체 시상 결과)
1. **행별 음영 (Zebra Striping) & 호버 강조**:
   - 홀수 행 `#ffffff` / 짝수 행 `#f4f7fb` 교차 음영 적용.
   - 마우스 호버: `#f8fafc` → **`#e0f2fe`** 로 선명하게 강조.
   - 결석 행(`tr.row-absent`): `#f8fafc` → **`#fef2f2`** (은은한 로즈 틴트)로 일반 행과 명확히 구분.
2. **헤더 · 셀 구분선 강화**:
   - `th`: 배경 `#e9eff6`, 하단 `2px solid #94a3b8`, 세로선 `1px solid #cbd5e1` (`:last-child` 제외).
   - `td`: 하단 `1px solid #cbd5e1`, 세로선 `1px solid #e2e8f0` (`:last-child` 제외).
3. **전체 핸드북 조회 시 핸드북 경계선 (`#hbAwardTable`)**:
   - `전체 핸드북` 필터일 때 핸드북이 바뀌는 첫 행에 `.hb-group-start` 클래스를 부여해 상단 **`2.5px solid #64748b`** 굵은 경계선 표시.

### B. 필기 채점 테이블 (`.written-table`)
- `.written-table-container` 외곽선: `#e2e8f0` → **`#cbd5e1`** 복원.
- `td:last-child` 배경: `#f8faff` → **`rgba(59, 130, 246, 0.04)`** 로 변경하여 짝수 행 음영(`#f1f5f9`)이 점수 입력 열까지 자연스럽게 이어지도록 개선.

### C. 대시보드 (`#tab-monitor`)
- `.metric-card`, `.dashboard-status-strip`, `.room-monitor-card`(대기 상태) 외곽선: `rgba(15, 23, 42, 0.06)` → **`#d5dde8`**.
- `.room-monitor-header` 하단 구분선: `#f1f5f9` → **`#e2e8f0`**.
- `.period-card-item`(대기 상태) 테두리: `#eef2f6` → **`#cbd5e1`**.

### D. 대회 설정 (`#tab-settings`)
- `.settings-toolbar`, `.settings-card` 외곽선: `rgba(15, 23, 42, 0.06)` → **`#d5dde8`**.
- `.settings-card-title` 하단 구분선: `#f1f5f9` → **`#e2e8f0`**.
- `.settings-switch-row`, `.code-room-item` 테두리: `#e2e8f0` → **`#cbd5e1`**.

### E. 시상 명단·인쇄 집계표 & 공통 헤더/패널/필터 바
- `.summary-table tr:nth-child(even):not(.total-row)` 배경: `#fafafa` → **`#f1f5f9`**.
- `.hq-header`, `.tab-content` 외곽선: `rgba(15, 23, 42, 0.06~0.07)` → **`#d5dde8`**.
- `.filter-bar` 하단 구분선: `#e2e8f0` → **`#cbd5e1`**.

---

## 3. 검증 및 Git 반영
- `admin/index.html` 인라인 JS 문법 검증(Node) 후 [admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html) 및 [HQ_PORTAL_BORDERS_AND_SHADING_UNIFICATION_PLAN.md](file:///e:/AwanaProject/AwanaQuizScore/docs/plans/HQ_PORTAL_BORDERS_AND_SHADING_UNIFICATION_PLAN.md) 커밋 및 `main` 푸시.

