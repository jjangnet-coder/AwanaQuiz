# 필기 저장 로딩 정리 · 대시보드 4단계 상태 구분 · E2E 필기 고속화 계획서

## 1. 수정 내역

### A. 필기시험 점수 저장 로딩 UI 통일 & 줄바꿈 정리 (`admin/index.html`)
- 기존 구식 `showCustomLoading()`(모래시계 + 비활성 `"처리 중..."` 버튼 팝업) 제거 → 깔끔한 **`showHqLoading`** 스피너 오버레이로 통일.
- `#hqLoadingText`에 `word-break: keep-all; text-align: center; line-height: 1.5;` 적용 및 문구를 `[핸드북 N조] 필기점수를 저장하는 중입니다...`로 간결하게 다듬어 어색한 줄바꿈 방지.

### B. 대시보드 4단계 시각적 상태 구분 (`대기` · `1단계 완료` · `2단계 완료` · `전체 완료`) (`admin/index.html`)
- **교시 미니 카드 (`.period-card-item`) 4단계 컬러 분리**:
  - **0종 완료 (`대기`)**: 소프트 슬레이트 (`#f8fafc` / `#e2e8f0`)
  - **1종 완료 (`1단계 완료`)**: 스카이 블루 (`#eff6ff` / `#93c5fd` / `#1d4ed8`)
  - **2종 완료 (`2단계 완료`)**: 앰버 오렌지 (`#fffbeb` / `#fcd34d` / `#b45309`)
  - **3종 완료 (`✓ 전체 완료`)**: 에메랄드 그린 (`#ecfdf5` / `#34d399` / `#047857`)
- **시험장 외곽 카드 (`.room-monitor-card`) 4단계 상태 배지 & 외곽 강조**:
  - 해당 시험장 전체 교시의 완료 단계를 집계해 시험장명 옆 상태 배지 + 카드 테두리/상단 그라데이션에 4단계 색상 반영:
    - `대기` (회색) → `1단계 완료` (블루) → `2단계 완료` (앰버) → **`✓ 전체 완료`** (에메랄드)
  - 3m 밖에서도 각 시험장이 몇 단계까지 끝났는지 0.2초 만에 직관적으로 식별 가능.

### C. E2E 필기 채점 입력 속도 개선 (`test/e2e/simulate-full-tournament.spec.js`)
- 브라우저 내부에서 조별 필기 점수를 시각적으로 빠르게 채우도록(약 150ms/조) 개선해 1번 모니터 관제 효과는 유지하면서 전체 테스트 시간을 대폭 단축.

---

## 2. Git 반영
- 승인 후 `admin/index.html`, `test/e2e/simulate-full-tournament.spec.js`, `docs/plans/HQ_WRITTEN_LOADING_AND_DONE_ROOM_POLISH_PLAN.md` 커밋 및 `main` 푸시.
