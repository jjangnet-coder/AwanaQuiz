# 엑셀(`.xlsx`) 인쇄·서식 완성도 개선 계획서

## 1. 수정 내용 (`admin/index.html` - `exportAllHandbooksToExcel()`)
1. **폰트 및 이모지 정리**:
   - 전체 셀 폰트를 **`맑은 고딕` (10pt)**으로 통일
   - 엑셀 내보내기 시 메달(`🥇/🥈/🥉`) 및 `🏆` 이모지 제거 (`금메달`, `은메달`, `동메달`, `최고득점상` 텍스트만 출력)
2. **열 너비 및 행 높이**:
   - `교회명` 열 너비를 `20` → **`26`**으로 확장
   - `ws['!rows']`로 헤더 행 높이 `26pt`, 데이터 행 높이 `22pt` 지정
3. **셀 테두리**:
   - 모든 데이터/헤더 셀에 얇은(`thin`) 테두리 적용
4. **가로 인쇄 1페이지 맞춤 + 1행 반복 인쇄**:
   - `ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }` (가로 방향, 모든 열 1페이지 맞춤)
   - `wb.Workbook.Names`에 시트별 `_xlnm.Print_Titles` (`$1:$1`) 등록해 인쇄 시 매 페이지 상단 1행 반복 출력
5. **Git 반영**:
   - `admin/index.html` 및 `docs/plans/EXCEL_POLISH_PLAN.md` 커밋 및 `git push`

