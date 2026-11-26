# 전 종목 통합 테스트 (`npm run test:full`) 실패 원인 즉시 진단 계획서

## 1. 핵심 원칙 (문제를 숨기지 않고 정확히 진단)
- 테스트에 인위적인 대기 시간을 넣어 동시성 부하를 피하지 않고, **현재의 극한 13동시 제출 압력을 그대로 유지**합니다.
- 먼저 `티앤티4~7` 등이 정확히 **어떤 에러**(GAS 락 타임아웃인지, 로그인 지연인지, 스크립트 모달 타이밍인지)로 멈췄는지 실시간 로그로 100% 확인한 뒤, 실제 동시성 문제라면 서버/클라이언트를 근본적으로 해결합니다.

---

## 2. 수정 내역 (`test/e2e/simulate-full-tournament.spec.js`)
1. **즉시 오류 로그 출력**:
   - 각 시험장(`simulateDirectRoom`)과 본부 필기 채점(`simulateHqWrittenScoring`)에 `catch` 블록을 추가해, 오류가 발생하는 즉시 터미널에 **`❌ [시험장:티앤티4] 중단 원인: ...`** 을 실시간 출력.
2. **초기 로그인 타임아웃만 소폭 여유 (`45s → 60s`)**:
   - 12개 시험장 + 본부가 동시에 `action=init` + `getRoomStudents`를 호출하는 첫 5초 구간 로그도 함께 출력 (`[시험장:티앤티4] 입장 완료`).

---

## 3. Git 반영
- 승인 후 `test/e2e/simulate-full-tournament.spec.js` 및 `docs/plans/FULL_E2E_CONCURRENCY_TUNING_PLAN.md` 커밋 및 `main` 푸시.
