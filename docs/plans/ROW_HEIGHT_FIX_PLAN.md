# [수정계획서] 문항 채점 시 행 높이 들썩거림(레이아웃 시프트) 방지

## 1. 현상 및 원인 분석
* **문제 현상:** 문제 번호를 눌러 전원 `O`가 들어가면 테이블 행 높이가 순간적으로 커졌다가, 다시 눌러 공백이 되면 행 높이가 줄어드는 흔들림(Layout Shift / Jank) 발생.
* **원인:**
  1. 공백일 때 셀(`<td>`)의 높이와, `O` 또는 `X` 글자가 들어갔을 때의 `font-size: 1.15rem` 및 폰트 고유의 `line-height`가 서로 일치하지 않음.
  2. 테이블 셀(`td`)에 고정 높이와 고정 `line-height`가 명시적으로 고정되어 있지 않아 텍스트 유무에 따라 브라우저가 행 높이를 재계산함.

---

## 2. 세부 수정 계획

### ① `index.html` CSS 스타일 보정
* **수정 위치:** `<style>` 태그 내 `.quiz-cell`, `tbody td`
* **변경 내용:**
  1. **고정 높이 및 라인 높이 강제:**
     ```css
     tbody td {
       height: 32px !important;
       max-height: 32px !important;
       line-height: 32px !important;
       padding: 0 2px !important;
       overflow: hidden;
     }
     ```
  2. **채점 셀(`.quiz-cell`) 폰트 높이 안정화:**
     ```css
     .quiz-cell {
       height: 32px !important;
       line-height: 32px !important;
       font-size: 1.1rem;
       box-sizing: border-box;
     }
     ```
  3. 빈 셀일 때도 동일한 세로 정렬과 높이를 유지하도록 `vertical-align: middle;` 및 `display: table-cell;` 기준 완벽 고정.

### ② 예상 효과 및 검증
* 문항 번호를 눌러 19~20명 전원에게 `O`를 채우거나 해제할 때, **테이블 전체 및 각 행의 높이가 1픽셀도 흔들리지 않고 완전 불변(Zero Layout Shift)으로 유지**됨.
* 22~23명 한 화면 무스크롤 수용 범위는 그대로 유지.

---

## 3. 작업 대상
* 대상 파일: `index.html` (CSS 스타일 영역)
* 소요 예상: 승인 즉시 1분 내 반영 가능
