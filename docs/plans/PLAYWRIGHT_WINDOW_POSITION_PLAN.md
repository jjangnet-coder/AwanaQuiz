# Playwright 12개 브라우저 창 엇갈림 배치 계획서

## 1. 수정 내용 (`test/e2e/simulate-12-rooms.spec.js`)
- `chromium`을 직접 `import`하여 각 시험장(`idx = 0..11`)마다 독립된 브라우저 인스턴스를 실행하고 `--window-position`을 엇갈리게 지정:
  - `x = 60 + (idx % 4) * 80`
  - `y = 40 + Math.floor(idx / 4) * 60`
- 12개 창이 1번 모니터 안에서 겹치지 않고 조금씩 엇갈려 모두 보이도록 배치
- `test/e2e/simulate-12-rooms.spec.js` 및 `docs/plans/PLAYWRIGHT_WINDOW_POSITION_PLAN.md` 커밋 및 `git push`
