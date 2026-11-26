# Playwright `waitForFunction` 15초 조기 타임아웃 버그 수정 계획서

## 1. 정확한 원인 (진단 로그로 100% 확인)
`❌ 중단 원인: page.waitForFunction: Timeout 15000ms exceeded.`

- **앱/서버 문제가 아니라 Playwright API 인자 실수**였습니다:
  - Playwright의 `page.waitForFunction(fn, arg, options)`는 **2번째 인자가 함수 전달 인자(`arg`)이고, 3번째 인자가 `{ timeout }` 옵션**입니다.
  - 기존 코드가 `page.waitForFunction(fn, { timeout: 120_000 })`로 2번째 인자(`undefined`)를 빼먹어 `120_000`이 무시되고 `playwright.config.js`의 기본 `actionTimeout: 15_000ms`(15초)로 13개 동시 요청이 15초 만에 전부 강제 종료된 것입니다.

## 2. 수정 방안
- `test/e2e/simulate-full-tournament.spec.js` 및 `test/e2e/simulate-12-rooms.spec.js`의 모든 `page.waitForFunction(fn, { timeout: ... })` 호출을 **`page.waitForFunction(fn, undefined, { timeout: ... })`** 로 교정.

## 3. Git 반영
- 승인 후 `test/e2e/simulate-full-tournament.spec.js`, `test/e2e/simulate-12-rooms.spec.js`, `docs/plans/PLAYWRIGHT_WAITFORFUNCTION_ARG_FIX_PLAN.md` 커밋 및 `main` 푸시.

