# 최고득점자 모아보기 핸드북별 시각 구분 강화 계획서

## 1. 문제 확인
- 현재 `.top-hb-row`가 흰 배경 위에 매우 흐린 구분선(`1px solid #f1f5f9`)만 있어, 모니터에서 핸드북 간 경계가 거의 보이지 않고 한 덩어리로 뭉쳐 보임.

---

## 2. 수정 방안 ([admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html))

### 핸드북별 독립 카드형 행 구조 적용 (`.top-club-panel`, `.top-hb-row`)
1. **패널 본문 배경 & 간격 분리**:
   - `.top-club-panel > div:last-child`에 연한 쿨그레이 배경(`#f1f5f9`) + 안쪽 여백(`10px 12px`) + 카드 간격(`gap: 8px`) 부여.
2. **핸드북별 독립 카드 스타일 (`.top-hb-row`)**:
   - 각 핸드북 행을 흰색 둥근 카드(`background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);`)로 명확히 분리.
   - 클럽별 좌측 포인트 바 부여:
     - SPARKS 핸드북 카드: `border-left: 4px solid #fb7185;`
     - T&T 핸드북 카드: `border-left: 4px solid #34d399;`
3. **카드 내부 좌·우 영역 구분**:
   - `.top-hb-meta`(핸드북명 · 최고점수) 우측에 연한 점선 구분선(`border-right: 1px dashed #cbd5e1; padding-right: 14px;`)을 추가해 핸드북 정보와 수상자 명단을 깔끔하게 분리.

---

## 3. Git 반영
- 승인 후 [admin/index.html](file:///e:/AwanaProject/AwanaQuizScore/admin/index.html) 및 [TOP_SCORERS_ROW_SEPARATION_PLAN.md](file:///e:/AwanaProject/AwanaQuizScore/docs/plans/TOP_SCORERS_ROW_SEPARATION_PLAN.md) 커밋 및 `main` 푸시.

