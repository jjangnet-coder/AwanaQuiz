# ExcelJS(`exceljs@4.4.0`) 교체 및 인쇄 설정 완벽 적용 계획서

## 1. 원인
`xlsx-js-style`은 SheetJS CE 기반으로 `!pageSetup`과 `!sheetPr`을 `.xlsx` XML에 기록하지 않아 가로 방향·한 페이지 맞춤이 적용되지 않았습니다.

## 2. 수정 내용 (`admin/index.html`)
1. **라이브러리 교체**:
   - `<head>`에서 `xlsx-js-style` 대신 **`exceljs@4.4.0`** (`https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js`) 로드
2. **`exportAllHandbooksToExcel()` 재작성 (ExcelJS 사용)**:
   - **인쇄 설정**: `pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: '1:1' }` (가로 방향 + A4 + 한 페이지에 모든 열 맞춤 + 1행 반복 인쇄)
   - **머리말·바닥글**: `headerFooter: { oddHeader: '&C' + titleText + ' - ' + hb + ' 시상 결과', oddFooter: '&C&P / &N' }`
   - **스타일**: `맑은 고딕` 10pt, 얇은 테두리, 1행 헤더(굵게·가운데·`#F1F5F9`), 데이터(가운데 / 점수 4개 열 오른쪽 정렬 + `numFmt: '#,##0_ '`로 오른쪽 여백 추가), 행 높이(26/22pt)
3. **Git 반영**:
   - `admin/index.html` 및 `docs/plans/SWITCH_TO_EXCELJS_PLAN.md` 커밋 및 `git push`

