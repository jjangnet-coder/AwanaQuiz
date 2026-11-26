# E2E 초고속 극한 동시 제출 모드(`test:12rooms:turbo`) 추가 계획서

## 1. 목적
- 기존 `npm run test:12rooms`(25분)는 그대로 유지하면서, **약 2~3분 만에 12개 시험장 전체(1,376명 × 오전·오후)를 완주하고 12개 시험장 동시 제출 극한 부하까지 검증**할 수 있는 `npm run test:12rooms:turbo` 명령어를 추가합니다.

---

## 2. 수정 내역

### A. `test/e2e/simulate-12-rooms.spec.js`
1. **`TURBO` 환경변수 추가**: `const TURBO = process.env.TURBO === '1' || process.env.TURBO === 'true';`
2. **브라우저 내부 일괄 실제 클릭 (`TURBO === true`일 때)**:
   - 교시당 단 1회의 `page.evaluate()`로 1번 문항부터 마지막 문항까지 순회하며, 매 셀마다 실시간으로 `.locked`·`.vacant` 상태를 확인한 뒤 실제 DOM `el.click()` 실행(30% 확률로 O→X 재클릭 포함).
   - 실제 `handleCellClick()`이 그대로 실행되므로 객관식 점수, 스피드 퀴즈 3정답/3오답 자동 잠금, 총점 계산, 제출 버튼 활성화가 **100% 실제와 동일**하게 동작하면서 교시당 채점 시간이 `0.05초`로 단축됨.
3. **극한 동시 제출 대비 대기 시간 여유**:
   - `TURBO` 모드에서는 12개 시험장이 거의 동시에 제출을 연타하므로 저장 완료 검증 타임아웃을 `120초`(자동 재시도 4회 포함)로 넉넉히 설정.
   - 기존과 동일하게 실패/오류 모달 및 `.state-saved` 상태를 엄격 검증.

### B. `test/e2e/package.json`
- 스크립트 추가:
  ```json
  "test:12rooms:turbo": "set HEADLESS=1&& set TURBO=1&& playwright test simulate-12-rooms.spec.js"
  ```

---

## 3. Git 반영
- 승인 후 `test/e2e/simulate-12-rooms.spec.js`, `test/e2e/package.json`, `docs/plans/E2E_TURBO_STRESS_MODE_PLAN.md` 커밋 및 `main` 푸시.

