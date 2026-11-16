# [수정계획서] Google Apps Script(Code.gs) 시트 탭 이름 동기화 및 다중 호환 처리

## 1. 개요 및 원인 분석
- **문제 현상:** 웹 UI에서 교실/교시 선택 시 `"시간표 시트에 해당 교실/교시 배정이 없습니다"` 안내가 발생.
- **원인:** 
  - 사용자의 실제 스프레드시트 탭 이름은 **`시간표`**와 **`설정`**으로 생성되어 있음.
  - 이전에 작성된 일부 스크립트에서 **`교실순환시간표`**, **`대회설정`**이라는 대체 명칭을 참조하도록 되어 있어, 시트를 찾지 못해 빈 배열(`[]`)이 반환됨.
  - 해당 시트 탭 명칭 불일치 수정이 로컬 저장소 및 Git에 아직 공식 커밋/푸시되지 않은 상태임.

---

## 2. 세부 수정 계획

### A. `google-apps-script/Code.gs` 시트 참조 다중 호환화
어떤 시트 이름을 사용하더라도 100% 정상 작동하도록 폴백(Fallback) 호환 코드로 정규화:
1. **설정 시트:**
   ```javascript
   const sSheet = ss.getSheetByName('설정') || ss.getSheetByName('대회설정');
   ```
2. **시간표 시트:**
   ```javascript
   const tSheet = ss.getSheetByName('시간표') || ss.getSheetByName('교실순환시간표');
   ```
3. **참가자명단, 최종집계, 로그 시트:**
   기존 정상 작동 확인된 표준 명칭 유지 (`참가자명단`, `최종집계`, `객관식_로그`, `스피드_로그`, `필기_로그`).

### B. 로컬 코드베이스 동기화 및 Git 반영
1. `google-apps-script/Code.gs`에 위 호환 로직을 정확히 반영.
2. `git add google-apps-script/Code.gs; git commit; git push origin main` 실행으로 리포지토리 완전 일치 보장.
3. Git 푸시 완료 후, 사용자가 스프레드시트의 Apps Script 편집기에 복사-붙여넣기할 수 있도록 최종 안내.

---

## 3. 사용자 승인 요청
위 계획서 내용에 대해 승인해 주시면 즉시 `google-apps-script/Code.gs` 파일을 수정하고 Git 커밋 및 푸시까지 완료하겠습니다.
