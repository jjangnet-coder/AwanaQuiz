# 전 종목 통합 자동화 테스트 (`npm run test:full`) & 시험장 목록 100% 동적화 계획서

## 1. 목표
1. **시험장 목록 100% 동적화**: `index.html`, `admin/index.html`, E2E 테스트에 남아 있던 12개 시험장 하드코딩을 모두 제거하고, 구글 시트 **`시간표` + `설정(CODE_*)`** 기반으로 시험장 수가 몇 개든(10개, 12개, 15개…) 자동 대응되도록 전환합니다.
2. **전 종목 통합 자동화 테스트 (`npm run test:full`)**:
   - **트랙 1 (백그라운드 Headless)**: 전체 시험장이 **`점수 직접 입력` 모드**로 오전 객관식(`0~80점`) + 오후 퀴즈(스피드 `0~60점`, 조 합계 `<= 200점`)를 고속 입력·제출.
   - **트랙 2 (1번 모니터 Headed 1개 창)**: 본부 관리 포털 `필기 채점` 탭에서 11개 핸드북 × 모든 조(1,376명)를 눈으로 보며 `50~150점` 입력·저장.
   - 두 트랙을 동시 실행해 대시보드 **필기 100% · 오전 100% · 오후 100% · 전체 완료 100%** 를 한 번에 검증합니다.

---

## 2. 세부 구현 내역

### A. 시험장 목록 100% 동적화 (3군데)
1. **시험장 점수 입력 (`index.html`)**:
   - `fetchMasterData()`에서 `MASTER_DATA.timetable` 및 `MASTER_DATA.settings`의 `CODE_*` 키로부터 시험장 목록을 동적 추출(`스팍스` 그룹 / `티앤티` 그룹 / 기타 자동 분류 + 숫자 자연 정렬).
   - `#gatewayRoomSelect`와 `#roomSelect` `<option>`을 동적으로 렌더링 (`populateRoomDropdowns()`).
2. **본부 관리 포털 `대회 설정` 탭 (`admin/index.html`)**:
   - 고정 `SETTINGS_ROOM_LIST` 12개 배열 제거 → `getDynamicSettingsRoomList()`로 `HQ_DATA.timetable` + `HQ_DATA.settings`의 `CODE_*` 키에서 동적 추출.
   - 카드 제목도 `🔐 시험장별 접속 코드 (${rooms.length}개 시험장)`으로 동적 표시.
3. **E2E 테스트 (`test/e2e/simulate-12-rooms.spec.js` & `test/e2e/simulate-full-tournament.spec.js`)**:
   - 테스트 시작 시 `GET ${GAS_URL}?action=init` 1회 호출로 **실제 시험장 목록, 최신 접속 코드(`CODE_*`), 최신 `ADMIN_PIN`, `스피드_최대정답수`**를 모두 자동 로드! (시험장 추가·삭제나 PIN 변경 시 테스트 코드 수정 불필요)

### B. 필기 점수 저장 자동 재시도 보강 (`admin/index.html`)
- `saveWrittenScoresBatch()`에도 `index.html`과 동일한 **최대 4회 자동 재시도(지수 백오프 + Jitter)** 를 적용해, 12개 시험장과 필기 채점이 동시에 저장될 때 락 혼잡 실패율 **0%** 보장.

### C. 전 종목 통합 E2E 스크립트 신설 (`test/e2e/simulate-full-tournament.spec.js`) & `test/e2e/package.json`
- **트랙 1 (Headless 단일 브라우저)**: 동적 로드된 전체 시험장 입장 → `#btnModeDirect`(`점수 직접 입력`) 전환 → 오전/오후 전 교시 입력·제출 및 `.state-saved` 검증.
- **트랙 2 (Headed 1개 창, 1번 모니터 `DISPLAY1` `--window-position=-3400,40`)**: `admin/index.html` 접속 → 동적 로드된 `ADMIN_PIN` 로그인 → `필기 채점` 탭 → 모든 핸드북 × 모든 조를 `25~50ms` 간격으로 보이게 입력 후 `#btnSaveWrittenBatch` 저장·검증.
- `package.json`에 `"test:full": "playwright test simulate-full-tournament.spec.js"` 추가.

---

## 3. Git 반영
- 승인 후 `index.html`, `admin/index.html`, `test/e2e/simulate-12-rooms.spec.js`, `test/e2e/simulate-full-tournament.spec.js`, `test/e2e/package.json`, `docs/plans/FULL_TOURNAMENT_E2E_WITH_WRITTEN_PLAN.md` 커밋 및 `main` 푸시.
