# 12개 시험장 동시 E2E 안정화 수정 계획서

## 1. 12개 창이 떴다가 한꺼번에 죽은 정확한 원인 (`error-context.md` 확인)
메모리 부족이 아니라 **3가지 복합 원인**으로 확인되었습니다:
1. **가려진 창 절전(Occluded Window Throttling)**: 12개 창(`1280×800`)이 서로 겹쳐 배치되면서 Windows Chromium이 뒤에 가려진 창의 입력 루프를 자동 절전시켜 `cell.click()`이 `15000ms` 타임아웃으로 멈춤.
2. **`Promise.all` 연쇄 종료**: 12개 중 **단 1개 창**만 15초 타임아웃이 나도 `Promise.all`이 즉시 실패 처리되며 Playwright가 나머지 11개 창까지 한꺼번에 종료함.
3. **12개 동시 GPU 프로세스 & 동시 로그인 부하**: 12개 창이 시차 없이 동시에 뜨고 GAS에 동시 요청을 보내면서 응답 지연이 겹침.

---

## 2. 수정 방안 (`test/e2e/simulate-12-rooms.spec.js`)
1. **Chromium 절전 차단 & 경량화 플래그 추가**:
   - `--disable-backgrounding-occluded-windows`
   - `--disable-renderer-backgrounding`
   - `--disable-background-timer-throttling`
   - `--disable-gpu`, `--disable-extensions` (12개 창 메모리·CPU 부하 대폭 절감)
2. **1번 모니터(`3440×1440`) 4×3 무중첩(Zero-Overlap) 바둑판 배치**:
   - 창 크기 `--window-size=840,450` / `viewport: { width: 820, height: 420 }`
   - 좌표 `x = -3430 + (idx % 4) * 855`, `y = 10 + Math.floor(idx / 4) * 465`
   - 12개 시험장이 서로 가리지 않고 한눈에 다 보임.
3. **클릭·로그인 안정화 및 `Promise.allSettled` 적용**:
   - 로그인 시차(`idx * 700ms`)로 GAS 초기 동시 요청 분산.
   - `cell.click({ force: true, timeout: 60_000 })` 및 `#currentRoomText` 대기 `45_000ms`로 여유 확보.
   - `Promise.all` → `Promise.allSettled`로 변경해 1개 시험장에 일시 오류가 나도 나머지 11개 시험장이 끝까지 완주하도록 보호(종료 시 실패한 시험장 로그만 별도 출력).

---

## 3. Git 반영
- 승인 후 `test/e2e/simulate-12-rooms.spec.js` 및 `docs/plans/E2E_12_ROOMS_STABILITY_FIX_PLAN.md` 커밋 및 `main` 푸시.

