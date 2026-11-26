# 본부 관리 포털 `대회 설정` 탭 신설 & 입력 모드 허용 제어 계획서

## 1. 목적
1. `설정` 시트에 **객관식 / 스피드 퀴즈 각각의 직접 입력 모드 허용 여부(`Y`/`N`)** 를 분리 관리합니다.
2. 시험장 점수 입력(`index.html`)은 해당 설정값에 따라 모드 전환 토글을 자동으로 표시/숨김 처리합니다.
3. 본부 관리 포털(`admin/index.html`)에 **`대회 설정`** 탭을 신설해, 구글 시트를 열지 않고도 **대회 제목·관리자 PIN·스피드 규칙·메달 비율·직접 입력 허용 On/Off·12개 시험장 접속 코드** 등 `설정` 시트의 모든 값을 안전하게 수정·저장할 수 있게 합니다.

---

## 2. 세부 구현 설계

### A. 시트 초기화 스크립트 (`google-apps-script/setup_sheets.gs` & `setup_test_data.gs`)
- `설정` 시트 초기 데이터에 2개 키 추가:
  - `['객관식_직접입력허용', 'Y', '객관식 점수 직접 입력 모드 토글 표시 여부 (Y/N)']`
  - `['스피드_직접입력허용', 'Y', '스피드 퀴즈 점수 직접 입력 모드 토글 표시 여부 (Y/N)']`

### B. 백엔드 설정 저장 API (`google-apps-script/Code.gs`)
- `doPost(e)`에 `payload.action === 'updateSettings'` 핸들러(`handleUpdateSettings(ss, payload)`) 추가:
  - `ScriptLock` 내에서 `설정` 시트의 기존 키 행(A열 일치)은 B열 값만 안전하게 갱신 (숫자 항목은 숫자 타입 `Number`로 저장).
  - 기존 시트에 아직 없는 신규 키(`객관식_직접입력허용`, `스피드_직접입력허용` 등)는 자동으로 맨 아래 행에 `[키, 값, 설명]`을 추가(기존 운영 시트 무중단 호환!).
  - `SpreadsheetApp.flush()` 후 최신 `settings` 객체를 응답으로 반환.

### C. 시험장 점수 입력 연동 (`index.html`)
- `isDirectModeAllowedForCurrentSession()` 헬퍼 추가:
  - 객관식 세션 → `MASTER_DATA.settings['객관식_직접입력허용']` 확인 (`'N'`/`'OFF'`/`'FALSE'`면 비허용, 미설정·`'Y'`면 허용).
  - 스피드 세션 → `MASTER_DATA.settings['스피드_직접입력허용']` 확인.
- **비허용(`N`)일 때 동작**:
  - `#inputModeToggle` 토글 UI를 숨기고 **`O/X 채점` 모드만 표시**.
  - *(무결성 예외: 이미 과거에 `점수 직접 입력`으로 저장 완료된 교시를 열었을 때는 저장된 점수를 정확히 보여주기 위해 해당 교시만 직접 입력 화면 유지)*

### D. 본부 관리 포털 `대회 설정` 탭 신설 (`admin/index.html`)
- 상단 네비게이션에 **`대회 설정`** 탭 버튼 추가 (6번째 탭, 기존 Soft Editorial Light 풀높이 Flex 레이아웃과 톤앤매너 100% 통일).
- **3개 깔끔한 카드 섹션 구성**:
  1. **🏆 대회 기본 설정**: `대회제목`, `ADMIN_PIN` (표시/숨김 버튼 포함)
  2. **⚙️ 채점 규칙 · 메달 비율 · 입력 모드 제어**:
     - `스피드_최대정답수`, `스피드_최대오답수`: **숫자(정수) 전용** (`type="number" inputmode="numeric" step="1" min="1" max="10"`, 비숫자 입력 차단)
     - `금메달_비율` / `은메달_비율` / `동메달_비율`: **숫자(정수) 전용** (`0~100`, 비숫자 입력 차단 + 실시간 합계 `100%` 검증)
     - **`객관식 직접 입력 허용`** (토글 스위치 `ON` / `OFF`)
     - **`스피드 퀴즈 직접 입력 허용`** (토글 스위치 `ON` / `OFF`)
  3. **🔐 시험장별 접속 코드 (12개 시험장)**: `CODE_스팍스1~5` (SPARKS 레드 도트), `CODE_티앤티1~7` (T&T 그린 도트) 4열 그리드 편집.
- **저장 흐름**:
  - **`설정 저장`** 클릭 → 숫자/비율 합계 유효성 검증 → `showCustomConfirm()` 확인 모달 → `action: 'updateSettings'` 전송 → 저장 완료 시 `HQ_DATA.settings` 즉시 갱신 + 헤더/타이틀 실시간 반영 + 안내(`시험장 화면은 새로고침 시 즉시 반영됩니다`).

---

## 3. Git & 배포 안내
- 승인 후 `google-apps-script/setup_sheets.gs`, `google-apps-script/Code.gs`, `index.html`, `admin/index.html`, `docs/plans/HQ_SETTINGS_TAB_AND_MODE_POLICY_PLAN.md` 커밋 및 `main` 푸시 (`setup_test_data.gs`는 로컬만 반영).
- *(※ `Code.gs`에 `updateSettings` API가 추가되므로, 구현 후 Apps Script 웹앱 **새 버전으로 배포** 1회가 필요합니다.)*
