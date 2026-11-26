# E2E 브라우저 창 1번 모니터(DISPLAY1) 위치 복구 계획서

## 1. 원인
단일 브라우저 경량화 리팩토링 시 `chromium.launch()`의 `args`에서 `--window-position` 옵션이 빠지면서, headed 모드(`test:1room`, `test:12rooms:headed`) 실행 시 기본 좌표 `(0, 0)`인 **2번 모니터(주 모니터)** 에 창이 열렸습니다.

## 2. 수정 방안 (`test/e2e/simulate-12-rooms.spec.js`)
- `chromium.launch()`의 `args`에 `'--window-position=-3400,40'`을 복구하여 headed 모드 실행 시 항상 **1번 모니터(`DISPLAY1`, `X=-3440~0`)** 에 열리도록 고정.
- (`npm run test:12rooms` 기본 Headless 모드는 창 0개, PC 부하 최소화 유지)

## 3. Git 반영
- 승인 후 `test/e2e/simulate-12-rooms.spec.js` 및 `docs/plans/E2E_WINDOW_POS_DISPLAY1_FIX_PLAN.md` 커밋 및 `main` 푸시.

