# [수정계획서] '최종집계' 및 '핸드북' 시트 점수 미반영 해결 및 완전 무인화(Self-Healing) 구축

## 1. 개요 및 사용자 요구사항 반영
- **핵심 문제:**
  - 웹 앱([AWANA 성경퀴즈대회 점수 입력 시스템](https://jjangnet-coder.github.io/AwanaQuiz/index.html))에서 점수를 제출했을 때, `객관식_로그`에는 데이터가 쌓이나 `최종집계` 및 `행글라이더 1학년` 시트에는 점수가 들어가지 않음.
  - 원인: `최종집계` 시트에 1,376명 단원 행이 미리 채워져 있지 않아 점수 기입 행을 찾지 못함.
- **사용자 요구사항:**
  > "대회 진행 중에 구글 시트의 Apps Script 에디터에서 `syncFinalSummaryFromParticipants` 함수를 수동으로 누르지 않을 수도 있잖아요. 참가자 명단 등록 시에 최종집계와 핸드북 시트에 명단이 자동으로 배치되어 있어야 합니다."
- **해결 원칙:**
  - 대회 중 또는 설정 시 **관리자가 Apps Script 에디터에서 수동 함수를 누를 필요가 전혀 없는 100% 무인 자동화** 달성.
  - 초기화 함수 1번으로 헤더 생성 + 명단 배치 + 18개 탭 정렬까지 원클릭 통합.
  - 혹시라도 명단이 비어있는 채로 점수가 수신되더라도 백엔드가 즉시 명단을 자동 복구(Self-Healing)한 뒤 점수를 누락 없이 기록.

---

## 2. 상세 수정 계획

### A. `setup_sheets.gs` 및 `setup_test_data.gs` 완전 자동화 (원클릭 통합)
1. **파이프라인 자동 연결:**
   - `setupAwanaSheets()` 실행 시:
     - 1단계: 18개 탭 생성 및 헤더/서식 세팅
     - 2단계: `reorderAwanaSheets(ss)` 자동 호출 (설정 ➔ 참가자명단 ➔ ... ➔ 최종집계 ➔ 11개 핸드북 시상 순서 정렬)
     - 3단계: **`syncFinalSummaryFromParticipants(ss)` 자동 호출** ➔ 1,376명 명단을 `최종집계` 및 11개 핸드북 시상 탭에 즉시 배치 완료!
   - 관리자가 별도로 함수를 찾아 헤매거나 따로 실행할 필요 없이, `setupAwanaSheets` 또는 `setupAwanaTestData` 1번 클릭으로 시트 전체 준비 완료.

### B. `Code.gs` 무인 자가 치유(Self-Healing) 및 자동 복구 탑재
1. **`doPost(e)` 자가 치유 (Self-Healing) 로직 추가:**
   - 점수 수신 시 `최종집계` 시트의 데이터 행을 점검합니다.
   - 만약 관리자가 명단 동기화를 깜빡하여 `최종집계`가 헤더만 있고 비어있는 경우:
     - 에러를 내거나 건너뛰지 않고, **백엔드가 즉시 내부적으로 `syncFinalSummaryFromParticipants(ss)`를 직접 호출하여 1,376명을 1초 만에 쫙 깔아버립니다.**
     - 그 직후 수신된 점수를 해당 단원의 행에 정확하게 기입합니다.
   - **효과:** 어떠한 운영 실수나 예외 상황에서도 점수 누락이 원천적으로 발생하지 않습니다.

2. **로그 소급 적용 함수 추가 (`replayScoresFromLogs`):**
   - 이미 `객관식_로그`에 들어와 있는 사용자의 소중한 채점 데이터를 `최종집계`와 `행글라이더 1학년` 시트로 즉시 자동 반영해 주는 복구 함수를 제공합니다.

---

## 3. 적용 대상 파일
1. `google-apps-script/setup_sheets.gs`
2. `google-apps-script/setup_test_data.gs`
3. `google-apps-script/Code.gs`
4. `docs/plans/SCORE_SYNC_AND_SELF_HEALING_PLAN.md` (문서화 및 형상 관리)
