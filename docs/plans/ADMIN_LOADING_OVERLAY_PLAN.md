# 본부 관리 포털(`admin/index.html`) 로딩 오버레이 추가 계획서

## 1. 현황 및 문제점
- 현재 `admin/index.html`의 초기 데이터 로드 및 수동 새로고침(`refreshHqDataManual()`, 2268행) 시 상단 텍스트만 `집계중...`으로 바뀔 뿐, 화면 전체를 덮는 오버레이가 없어 로딩 도중 다른 탭(`.hq-tab-btn`)이나 버튼을 클릭할 수 있습니다.

---

## 2. 수정 내용 (`admin/index.html`)
1. **CSS 추가 (`<style>` 내부)**:
   - `.hq-loading-overlay`: `position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 30000; pointer-events: auto; display: none; justify-content: center; align-items: center; flex-direction: column; gap: 12px; color: #fff; font-weight: 700;`
2. **HTML 추가 (`<body>` 최상단)**:
   - `<div class="hq-loading-overlay" id="hqLoadingOverlay"><div class="spinner"></div><div id="hqLoadingText">본부 데이터를 불러오는 중입니다...</div></div>`
3. **JS 제어 함수 및 호출 추가**:
   - `showHqLoading(text)` / `hideHqLoading()` 함수 추가
   - `refreshHqDataManual()`(2268행) 및 초기 데이터 로드 시 `try { showHqLoading(...); ... } finally { hideHqLoading(); }`로 감싸 로딩 중 모든 UI 입력 차단

---

## 3. Git 반영
- `admin/index.html` 및 `docs/plans/ADMIN_LOADING_OVERLAY_PLAN.md` 커밋 및 `git push`

