# 엑셀 인쇄 '한 페이지에 모든 열 맞추기' 활성화 계획서

## 1. 원인
`ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }`만 설정하면 Excel의 `fitToPage` 플래그가 꺼져 있어 "실제 크기로 시트를 인쇄"로 열립니다.

## 2. 수정 내용 (`admin/index.html`)
- `exportAllHandbooksToExcel()`에서 각 시트(`ws`)에 아래 속성 추가:
  ```js
  ws['!sheetPr'] = { pageSetUpPr: { fitToPage: true } };
  ```
- `admin/index.html` 및 `docs/plans/EXCEL_FIT_TO_PAGE_PLAN.md` 커밋 및 `git push`

