# 시험장 점수 입력 3종 버그 수정 + 필기 채점 점검 + 전체 팝업 전수 교정 계획서

## 1. 원인 및 수정 방안

### A. 셀 클릭 시 행 높이가 미세하게 흔들리는 현상
- **시험장 점수 입력 (`index.html`)**:
  - **원인**: 빈 `.quiz-cell`은 텍스트가 없어 행의 기본 높이가 이름 열(`0.9rem`) 기준이지만, 클릭해서 `O`/`X`가 들어가면 `.quiz-cell`의 `1.08rem` 글자 높이가 추가(+3px)되면서 `table { height: 100% }`가 다른 행의 높이를 미세하게 재분배함.
  - **수정**: `.quiz-cell:empty::before { content: "\00a0"; display: inline-block; }` 추가 및 `.quiz-cell` `line-height: 1;` 통일 → 빈 셀에도 동일한 `1.08rem` 투명 기준선이 항상 존재하므로 클릭 시 행 높이 변동 **0.00px** 보장.
- **필기시험 채점 (`admin/index.html`) 점검 결과**:
  - 모든 행(응시·결석 포함)에 동일한 고정 높이(`inputH`)의 `<input class="input-written-score">`가 항상 렌더링되고, 포커스·유효성 스타일에서도 테두리 두께(`1.5px`)나 높이가 바뀌지 않아 흔들림 없음. 예방 차원에서 `.written-table td`에 `line-height: 1.1;`만 명시.

### B. 오전 ↔ 오후 세션 탭 전환 시 미저장 경고 없이 입력 데이터 증발 (`index.html`)
- **원인**: `handlePeriodChange()`·`handleManualRefresh()`와 달리 `switchSession()`에 `hasUnsavedChanges()` 체크가 누락됨.
- **수정**:
  - `switchSession(typeKey, force = false)`로 확장:
    - 이미 선택된 탭 재클릭 시(`!force`) 즉시 무시(데이터 보존).
    - 다른 세션 탭 클릭 시 `hasUnsavedChanges()`가 참이면 교시 변경과 동일한 **미제출 이탈 경고 모달(`showCustomConfirm`, `danger` 테마)** 표시 → 확인 시에만 세션 전환.
    - 내부 코드(`onSelectionChange`) 호출은 `force = true`로 유지.

### C. 전체 팝업 전수조사 결과 및 일괄 교정 (`index.html` + `admin/index.html` 총 7개 팝업 / 4개 카드 클래스)
전수조사 결과, **4개 모달 카드 클래스 모두 `max-height`가 없어** 작은 화면(`420px` E2E 창, 소형 노트북 등)에서 하단 버튼이 화면 밖으로 잘릴 위험이 확인되었습니다:

| 파일 | 모달 카드 클래스 | 해당 팝업 목록 | 교정 내용 |
|---|---|---|---|
| `index.html` | `.custom-modal-card` | `#customModalOverlay` (점수 제출·완료·이탈 경고 등) | `max-height: calc(100vh - 24px); display: flex; flex-direction: column; padding: 18px 22px 16px;`, `.modal-icon-badge` `44px` 슬림화, `.modal-message`만 `overflow-y: auto`, `.modal-actions` `flex-shrink: 0` 하단 고정 |
| `index.html` | `.gateway-card` | `#gatewayModalOverlay` (시험장 입장 인증) | `max-height: calc(100vh - 24px); overflow-y: auto; padding: 22px 24px 20px;` |
| `admin/index.html` | `.custom-modal-card` | `#customModalOverlay` (필기 저장·결석 처리·긴급 이동 확인 등) | `index.html`과 동일하게 `max-height: calc(100vh - 24px)` + Flex + 본문만 스크롤 + 하단 버튼 고정 |
| `admin/index.html` | `.hq-modal-card` | `#adminPinModalOverlay` (본부 로그인), `#resetScoresModalOverlay` (점수 초기화), `#editStudentModalOverlay` (단원 수정), `#transferModalOverlay` (긴급 이동) | `max-height: calc(100vh - 24px); overflow-y: auto; padding: 20px 22px;` |

- **E2E 보강 (`test/e2e/simulate-12-rooms.spec.js`)**: `dismissModalIfVisible()`에서 `confirmBtn.click({ force: true })` 적용.

---

## 2. Git 반영
- 승인 후 `index.html`, `admin/index.html`, `test/e2e/simulate-12-rooms.spec.js`, `docs/plans/EXAM_UI_THREE_BUGS_FIX_PLAN.md` 커밋 및 `main` 푸시.
ㅜ