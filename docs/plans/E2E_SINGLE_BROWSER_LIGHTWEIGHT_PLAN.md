# 12개 시험장 동시 E2E 초경량화 수정 계획서 (PC 프리징 해결)

## 1. PC가 멈출 뻔한 정확한 원인
현재 `test/e2e/simulate-12-rooms.spec.js`가:
1. **`chromium.launch()`를 12번 호출**해 Chromium 브라우저 인스턴스 12개(OS 프로세스 약 60~70개)를 동시에 띄움.
2. **`--disable-gpu` + 12개 가시 창(`headless: false`)** 조합 때문에 12개 창이 매 클릭마다 **CPU 소프트웨어 렌더링**을 초당 수십 번씩 돌려 CPU 100% 포화가 발생함.

---

## 2. 해결 방안 (CPU·메모리 1/8 수준으로 경량화)

### A. 단일 Chromium 브라우저 + 12개 독립 `BrowserContext` (`test/e2e/simulate-12-rooms.spec.js`)
- **브라우저 1개만 실행**하고 그 안에 시험장별 독립 `browser.newContext()` 12개를 생성:
  - 각 컨텍스트는 `localStorage`·쿠키·세션이 완전히 분리되어 실제 12대 PC와 동일하게 동작.
  - OS 프로세스 및 메모리 사용량 대폭 절감.
- **실행 모드 선택 지원 (`HEADLESS` 환경변수)**:
  - **`npm run test:12rooms`** (기본, **Headless**): 화면 렌더링 부하 **0%** — 12개 시험장이 실제 DOM 클릭 + 실제 GAS 전송을 백그라운드에서 동시 수행하고, 사용자는 **본부 관리 포털 대시보드**와 **터미널 실시간 진행 로그**(`[스팍스1] 1교시 오전 제출 완료`)를 쾌적하게 관제.
  - **`npm run test:12rooms:headed`** (화면 보기 필요 시): 단일 브라우저 1개 창 안에 12개 탭으로 띄움 (기존 12개 별도 창 대비 부하 대폭 감소).
- **터미널 실시간 진행 로그 강화**:
  - 각 시험장이 교시/세션 제출 완료할 때마다 `[시험장명] N교시 오전/오후 제출 완료` 로그 출력.

### B. 스크립트 정리 (`test/e2e/package.json`)
- `test:1room`: 단일 시험장 확인용 (`--headed`)
- `test:12rooms`: 12개 시험장 동시 부하 테스트 (단일 브라우저 **Headless**, PC 쾌적)
- `test:12rooms:headed`: 12개 시험장 단일 브라우저 탭 보기 모드 (`--headed`)

---

## 3. Git 반영
- 승인 후 `test/e2e/simulate-12-rooms.spec.js`, `test/e2e/package.json`, `docs/plans/E2E_SINGLE_BROWSER_LIGHTWEIGHT_PLAN.md` 커밋 및 `main` 푸시.

