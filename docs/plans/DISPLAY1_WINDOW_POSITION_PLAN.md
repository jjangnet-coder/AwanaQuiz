# 1번 모니터(`DISPLAY1`) 12개 브라우저 창 배치 계획서

## 1. 수정 내용 (`test/e2e/simulate-12-rooms.spec.js`)
- 1번 모니터(`DISPLAY1`: `X=-3440, Y=0, Width=3440, Height=1440`) 기준으로 12개 창 좌표 계산:
  - `const x = -3380 + (idx % 4) * 550;`
  - `const y = 40 + Math.floor(idx / 4) * 260;`
- 3440×1440 울트라와이드 화면에 4열 × 3행으로 넉넉하게 엇갈려 배치되어 12개 창이 모두 한눈에 보이도록 구성
- `test/e2e/simulate-12-rooms.spec.js` 및 `docs/plans/DISPLAY1_WINDOW_POSITION_PLAN.md` 커밋 및 `git push`

