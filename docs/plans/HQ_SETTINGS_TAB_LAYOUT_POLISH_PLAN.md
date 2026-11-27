# 본부 포털 `대회 설정` 탭 레이아웃 · 시인성 개선 계획서

## 1. 문제 확인 및 설계 원칙
1. **시험장별 접속 코드 혼재 및 폭 과다**: 단일 4열 그리드라 SPARKS와 T&T 시험장이 같은 줄에 섞이고, 항목 폭이 지나치게 넓어 시험장명과 PIN 입력칸 사이가 휑하게 벌어짐.
   - **동적 클럽 판별 원칙**: 대회마다 시험장 개수와 이름(예: `301호`, `비전홀`, `스팍스1`)이 달라질 수 있으므로, 시험장 이름 문자열에만 의존하지 않고 **`시간표`에 배정된 핸드북**으로 해당 시험장의 클럽(`SPARKS` / `T&T` / `혼합·기타`)을 자동 판별합니다.
     - 배정 핸드북이 모두 `행글라이더·윙러너·스카이스토머` → **SPARKS**
     - 배정 핸드북이 모두 `어드밴처·챌린지` → **T&T**
     - 둘 다 배정되었거나 시간표 미배정 → 이름에 `스팍스/SPARKS`·`티앤티/T&T`가 있으면 보조 판별, 없으면 **기타/공통**으로 분류.
2. **상단 우측 카드(`채점 규칙 & 메달 비율`) 불균형**: 좌측 카드 대비 하단이 비어 보이고, `3`, `30` 같은 짧은 숫자가 넓은 입력칸 왼쪽 끝에 작게 붙어 있어 시인성이 떨어짐.

---

## 2. 수정 방안 ([admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html))

### A. 시험장별 접속 코드 — `시간표` 기반 자동 부문 그룹 + 반응형 컴팩트 그리드
- `detectRoomClub(roomName)` 헬퍼를 추가하여 `HQ_DATA.timetable`의 배정 핸드북 기준으로 각 시험장을 `sparks` / `tnt` / `other`로 자동 분류.
- 존재하는 그룹만 섹션 헤더(`SPARKS 시험장 (N개)`, `T&T 시험장 (N개)`, 필요 시 `기타/공통 시험장 (N개)`)로 깔끔하게 분리하여 **SPARKS와 T&T가 같은 줄에 절대 섞이지 않도록** 구성.
- 각 그룹 내부에는 **`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`** 반응형 컴팩트 그리드를 적용해 시험장이 몇 개든, 이름이 무엇이든 균형 있게 배치.

### B. `채점 규칙 & 메달 비율` 카드 구조화 및 숫자 입력 개선
- 카드 내부를 **`스피드 퀴즈 채점 규칙`** / **`메달 시상 비율`** 2개 소섹션 + 하단 안내 박스로 균형 배치(`display: flex; flex-direction: column; justify-content: space-between;`)하여 좌측 카드와 하단 여백 균형 맞춤.
- 숫자 입력칸(`.settings-input-num`)에 **가운데 정렬 + 굵은 숫자(`0.96rem`, `800`) + 우측 단위(`회`, `%`)** 표시를 적용해 가독성 향상.

---

## 3. 검증 및 Git 반영
- `admin/index.html` 인라인 JS 문법 검증(Node) 후 아래 파일을 함께 커밋 및 `main` 푸시:
  - [admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html)
  - [TESTING_GUIDE.md](file:///e:/AwanaProject/AwanaQuizScore/docs/TESTING_GUIDE.md)
  - [HQ_SETTINGS_TAB_LAYOUT_POLISH_PLAN.md](file:///e:/AwanaProject/AwanaQuizScore/docs/plans/HQ_SETTINGS_TAB_LAYOUT_POLISH_PLAN.md)
