# 본부 포털 `대회 설정` 탭 세부 마무리 계획서

## 1. 화면 점검 결과
1. **`합계 100%` 배지 위치 어색함**: 실시간 합계 배지(`#medalRatioSumBadge`)가 상단 카드 제목(`📊 채점 규칙 & 메달 비율`) 옆에 있어 `🏅 메달 시상 비율`의 `합계 100% 필수` 문구와 중복·분리되어 보임.
2. **숫자와 단위(`회`, `%`) 간격 벌어짐**: 입력칸 숫자는 가운데 정렬(`3`, `30`)이고 단위는 우측 끝(`right: 11px`)에 붙어 있어 숫자와 단위 사이가 넓게 떨어져 보임.
3. **좌·우 상단 카드 내부 대칭**: 우측 카드는 소섹션 박스로 정돈된 반면 좌측 카드 하단에 약간의 빈 공간이 생김.
4. **시험장 부문 개수 표기**: `5개`, `7개`가 일반 회색 텍스트로만 표시되어 대시보드·최고득점자 화면의 클럽 배지 톤과 통일하면 더 깔끔함.

---

## 2. 수정 방안 ([admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html))
1. **`#medalRatioSumBadge` 이동**: 상단 카드 제목 옆에서 제거하고 **`🏅 메달 시상 비율`** 소섹션 우측(`합계 100% 필수` 문구 자리)으로 이동.
2. **숫자 입력칸과 단위 밀착**: `.settings-input-num`을 우측 정렬(`text-align: right; padding-right: 34px;`)로 변경해 `3 회`, `30 %`가 하나의 단위로 자연스럽게 읽히도록 개선.
3. **좌측 카드(`대회 기본 정보 & 입력 모드 제어`) 수직 균형**: 좌측 카드에도 `.settings-card-flex`와 `기본 정보` 소섹션을 적용해 우측 카드와 1:1 시각적 대칭 맞춤.
4. **시험장 부문 개수 배지 통일**: `5개`, `7개`에 `.top-club-count` 스타일(SPARKS 로즈 / T&T 에메랄드 / 기타 슬레이트 필 배지) 적용.

---

## 3. Git 반영
- 승인 후 [admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html) 및 [HQ_SETTINGS_FINAL_POLISH_PLAN.md](file:///e:/AwanaProject/AwanaQuizScore/docs/plans/HQ_SETTINGS_FINAL_POLISH_PLAN.md) 커밋 및 `main` 푸시.

