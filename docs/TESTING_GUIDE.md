# AWANA 성경퀴즈대회 자동화 테스트 가이드

이 문서는 시험장 채점 화면(`index.html`), 본부 관리 포털(`admin/index.html`), 그리고 Google Apps Script(`Code.gs`) 백엔드의 **동시성·무결성·전 과정(필기 + 오전 + 오후)** 을 검증하는 자동화 테스트 실행 방법을 정리한 가이드입니다.

---

## 1. 사전 준비 (최초 1회)

1. **Node.js 설치 확인** (Node.js 18 이상 권장)
   ```powershell
   node -v
   npm -v
   ```
2. **E2E 테스트 패키지 및 Chromium 브라우저 설치**
   ```powershell
   cd e:\AwanaProject\AwanaQuizScore\test\e2e
   npm install
   npx playwright install chromium
   ```
   > 별도의 로컬 웹 서버를 수동으로 띄울 필요는 없습니다. `test/e2e/playwright.config.js`가 테스트 시작 시 `http://localhost:8080` 로컬 서버를 자동으로 실행하고 종료합니다.

---

## 2. 테스트 실행 전 필수 체크리스트

1. **구글 시트 점수 초기화**
   - 이전 테스트 점수가 남아 있으면 정확한 신규 제출 검증이 어렵습니다.
   - 본부 관리 포털(`admin/index.html`) 우측 상단의 **`대회 점수 초기화`** 버튼으로 기존 점수를 먼저 비워주세요.
2. **시험장 목록 및 접속 코드 자동 연동**
   - 모든 E2E 테스트는 구글 시트의 **`시간표`** 탭과 **`설정`** 탭(`CODE_*`, `ADMIN_PIN`, `스피드_최대정답수`)을 실행 시점에 실시간으로 읽어옵니다.
   - 시험장이 추가/삭제되거나 접속 코드가 바뀌어도 테스트 코드를 수정할 필요가 없습니다.
3. **`test:full` 실행 전 직접 입력 허용 확인**
   - `npm run test:full`은 시험장에서 **점수 직접 입력 모드**로 채점합니다.
   - 본부 포털 **`⚙️ 대회 설정`** 탭에서 아래 두 스위치가 모두 **ON** 상태인지 확인하세요.
     - `객관식 점수 직접 입력 허용`
     - `스피드 퀴즈 점수 직접 입력 허용`

---

## 3. 테스트 명령어 한눈에 보기

### A. Playwright E2E 시뮬레이션 (`test/e2e` 폴더에서 실행)

```powershell
cd e:\AwanaProject\AwanaQuizScore\test\e2e
```

| 명령어 | 대상 스크립트 | 동작 방식 | 권장 용도 |
| :--- | :--- | :--- | :--- |
| **`npm run test:full`** | `simulate-full-tournament.spec.js` | **전 시험장(직접입력, Headless) + 본부 필기 채점(브라우저 창 표시)** 동시 실행 | **실전 대회 전체 리허설 (가장 추천)** — 필기·오전·오후 100% 완주 및 동시성 검증 |
| **`npm run test:1room`** | `simulate-12-rooms.spec.js` | 1개 시험장만 **O/X 클릭** 방식, 브라우저 창 표시(`HEADLESS=0`) | UI 변경 후 화면 동작·클릭·모달 빠른 육안 확인 |
| **`npm run test:12rooms:turbo`** | `simulate-12-rooms.spec.js` | 전 시험장 **O/X 클릭** 동시 실행(Headless, 클릭 딜레이 최소화) | O/X 채점 모드 기준 전 시험장 빠른 스트레스 테스트 |
| **`npm run test:12rooms`** | `simulate-12-rooms.spec.js` | 전 시험장 **O/X 클릭** 동시 실행(Headless, 실제 사람 속도 딜레이) | 장시간(약 20~25분) 실전 유사 부하 테스트 |
| **`npm run test:12rooms:headed`** | `simulate-12-rooms.spec.js` | 전 시험장 **O/X 클릭** 동시 실행 + 모든 브라우저 창 표시 | 시연/관찰용 (창이 많으므로 고사양 PC 권장) |

### B. 백엔드 API 단독 동시성 부하 테스트 (프로젝트 루트에서 실행)

브라우저 UI 없이 GAS `doPost` 엔드포인트에 20개 교실(400명) 요청을 동시에 발사해 `LockService` 순차 처리와 재전송 덮어쓰기를 검증합니다.

```powershell
cd e:\AwanaProject\AwanaQuizScore
node test/test_concurrency.js
```

---

## 4. 환경 변수로 세부 조건 지정하기 (PowerShell)

필요에 따라 특정 시험장만 테스트하거나, 로컬 대신 **배포된 GitHub Pages** 대상으로 바로 테스트할 수 있습니다.

| 환경 변수 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `ROOM_LIMIT` | `0` (전체) | 실행할 시험장 개수 제한 (예: `2` → 앞 2개 시험장만 실행) |
| `TARGET_ROOM` | `""` (전체) | 특정 시험장 1곳만 지정 실행 (예: `스팍스1`, `티앤티3`) |
| `BASE_URL` | `http://localhost:8080` | 테스트 대상 웹 URL (GitHub Pages 검증 시 변경) |
| `GAS_URL` | 운영 GAS 웹 앱 URL | 테스트용 별도 GAS 배포 URL 지정 |
| `ADMIN_PIN` | 시트 `ADMIN_PIN` 값 | 본부 포털 비밀번호 수동 지정 (`test:full`) |
| `HEADLESS` | `1` (숨김) | `0`으로 설정 시 브라우저 창 표시 (`simulate-12-rooms.spec.js`) |
| `TURBO` | `0` | `1`로 설정 시 클릭 간격 최소화 (`simulate-12-rooms.spec.js`) |

#### 자주 쓰는 PowerShell 실행 예시

```powershell
# 1) 특정 시험장 1곳 + 본부 필기 채점만 빠르게 확인
$env:TARGET_ROOM="스팍스1"; npm run test:full; Remove-Item Env:TARGET_ROOM

# 2) 앞 2개 시험장만 풀 테스트
$env:ROOM_LIMIT="2"; npm run test:full; Remove-Item Env:ROOM_LIMIT

# 3) 로컬이 아닌 실제 배포된 GitHub Pages 대상으로 풀 테스트
$env:BASE_URL="https://jjangnet-coder.github.io/AwanaQuiz"; npm run test:full; Remove-Item Env:BASE_URL
```

> **주의**: PowerShell에서 `$env:변수="값"`으로 설정한 환경 변수는 현재 터미널을 닫을 때까지 유지됩니다. 위 예시처럼 실행 직후 `Remove-Item Env:변수명`으로 해제하면 다음 테스트에 영향을 주지 않습니다.

---

## 5. 테스트 완료 후 결과 검증 체크리스트

테스트가 `1 passed`로 끝나면 본부 관리 포털(`admin/index.html`)에서 아래 항목을 확인하세요.

1. **대시보드 탭**
   - `필기 채점 100%`, `오전 객관식 100%`, `오후 퀴즈 100%` 도달 여부 (누락 단원 `0명`)
   - 모든 시험장 카드가 에메랄드색 **`✓ 전체 완료`** 상태인지 확인
2. **시상 명단·인쇄 탭**
   - `전체 일괄 인쇄` 및 개별 시험장 선택 시 스크롤 및 A4 인쇄 미리보기 정상 출력 확인
3. **핸드북별 결과 탭**
   - `전체 시상 결과 조회`: `전체 핸드북` 기본 표시, 핸드북 경계선, 검색 필터 정상 동작
   - `최고득점자 모아보기`: SPARKS(5개)·T&T(6개) 2단 카드 표시 및 `최고득점자 인쇄` A4 1장 출력 확인
   - `엑셀 다운로드 (.xlsx)`: 11개 핸드북 시트 정상 생성 확인
4. **테스트 종료 후 정리**
   - 실전 대회 전에는 반드시 본부 포털 **`대회 점수 초기화`**를 실행해 테스트 점수를 깨끗이 비워두세요.

---

## 6. 자주 발생하는 문제 및 해결 (트러블슈팅)

- **콘솔에 `서버 혼잡 — 자동 재시도 중 (1/4)` 로그가 뜸**
  - 전 시험장과 본부가 동시에 구글 시트에 저장할 때 `LockService` 대기로 인해 발생하는 정상적인 자동 복구 동작입니다. 재시도 후 저장 완료(`.state-saved`)되면 데이터 유실 없이 정상 통과합니다.
- **로컬 8080 포트 오류 또는 이전 파일이 뜸**
  - 이미 8080 포트에 다른 프로세스가 떠 있으면 기존 서버를 재사용합니다(`reuseExistingServer: true`). 변경 사항이 반영되지 않으면 기존 8080 서버를 종료한 뒤 다시 실행하세요.
- **본부 포털 로그인이 실패함 (`test:full`)**
  - 구글 시트 `설정` 탭의 `ADMIN_PIN` 값과 일치하는지 확인하거나, `$env:ADMIN_PIN="비밀번호"`로 직접 지정해 실행하세요.
- **테스트 중 특정 교시 인원이 누락됨**
  - 구글 시트 `시간표` 탭에 동일한 `(핸드북, 조)`가 중복 배정되어 있거나 빠진 조가 없는지 확인하세요.

