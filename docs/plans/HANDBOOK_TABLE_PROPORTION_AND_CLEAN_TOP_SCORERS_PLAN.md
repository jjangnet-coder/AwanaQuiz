# 전체 시상 결과 개선 & 최고득점자 시인성·정리 계획서

## 1. 반영 요청 사항
1. **전체 시상 결과 조회 (`#hbAwardTable`)**:
   - `교회명` 열만 `auto`로 두어 화면의 40% 이상 비대하게 벌어지던 문제 해소.
   - 필터 드롭다운에 **`전체 핸드북`** 옵션을 추가하고 **기본값(default)** 으로 설정.
2. **최고득점자 모아보기 (화면 & 인쇄)**:
   - 시상 호명에 불필요한 **`시험장 · 조`** (`스팍스1 · 6조`, `· 스팍스1`) 완전 제거.
   - 화면에서 너무 작게 보이던 **단원 이름·교회명 글씨를 대폭 확대**하여 한눈에 잘 보이도록 개선.
   - 좌측(SPARKS 5행)·우측(T&T 6행) 패널 하단 높이를 동일하게 정렬.

---

## 2. 수정 방안 ([admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html))

### A. 전체 시상 결과 조회 (`#hbAwardFilterSelect`, `#hbAwardTable`)
1. **`전체 핸드북` 기본값 추가**:
   - `#hbAwardFilterSelect` 최상단에 `<option value="ALL">전체 핸드북</option>` 추가 및 초기값 `ALL` 설정.
   - `ALL` 선택 시 공식 11개 핸드북 순서대로 각 핸드북별 석차·메달을 계산하여 전체 명단 표시.
   - 오후 열 헤더(`#thHbAwardAfternoon`): `전체 핸드북`일 때 `오후 퀴즈`, SPARKS 핸드북일 때 `객관식(오후)`, T&T 핸드북일 때 `스피드(오후)`로 동적 표시.
2. **14열 균형 비율(%) 고정 (`table-layout: fixed`)**:
   - 합계 `100%`로 고르게 배분하여 핸드북 전환 시에도 흔들림·쏠림 방지:
     `No.`(`4%`), `핸드북`(`10%`), `석차`(`4.5%`), `메달`(`7%`), `시험장`(`6.5%`), `학년`(`4%`), `조`(`4%`), `번호`(`4.5%`), **`교회명`(`19%`)**, `이름`(`8.5%`), `필기`(`7%`), `객관식(오전)`(`7%`), `오후 퀴즈`(`7%`), `최종총점`(`7%`).

### B. 최고득점자 모아보기 (화면 & 인쇄)
1. **불필요한 `시험장 · 조` 완전 제거**:
   - 화면 칩: `🏆 이름  교회명` 만 표시 (`.w-meta` 제거).
   - 인쇄 표: 헤더 `최고득점자 (교회명)` + 본문 **`이름 (교회명)`** 만 출력 (`· 시험장` 제거).
2. **단원 이름·교회명 시인성 대폭 강화 (화면 & 인쇄)**:
   - 화면 수상자 칩(`.top-winner-chip`):
     - 단원 이름: `1.12rem` / `font-weight: 900` (`#0f172a`)
     - 교회명: `0.96rem` / `font-weight: 700` (`#334155`)
     - 패딩 확대(`9px 15px`), 은은한 골드 톤 배경(`#fffbeb`, 테두리 `#fde68a`)으로 수상자 강조.
   - 핸드북명(`.top-hb-name`): `1.02rem`, 점수 배지(`.top-score-pill`): `0.82rem`으로 비례 확대.
   - 인쇄 표도 A4 1장 안에 여유 있게 들어가는 선에서 수상자 이름(`13.5px` Bold)·교회명(`12.5px`) 가독성 상향.
3. **좌·우 2단 패널 바닥선 정렬**:
   - `.top-scorers-board`에 `align-items: stretch;`, 내부 행에 `flex: 1;`을 적용해 SPARKS(5행)와 T&T(6행) 패널의 높이를 동일하게 맞춤.

---

## 3. Git 반영
- 승인 후 [admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html) 및 [HANDBOOK_TABLE_PROPORTION_AND_CLEAN_TOP_SCORERS_PLAN.md](file:///e:/AwanaProject/AwanaQuizScore/docs/plans/HANDBOOK_TABLE_PROPORTION_AND_CLEAN_TOP_SCORERS_PLAN.md) 커밋 및 `main` 푸시.
