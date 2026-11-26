# 모달 팝업 컴팩트화 · 이중 줄바꿈 버그 수정 및 프로 레이아웃 계획서

## 1. 원인
1. `.modal-message`의 **`white-space: pre-line;`** 때문에 HTML 줄바꿈(`\n`)과 `<br>`이 이중으로 적용되어 박스 위·아래와 줄 사이마다 불규칙한 빈 줄이 크게 생김.
2. `.custom-modal-card`가 `max-width: 480px`로 과하게 넓고, 이중 줄바꿈까지 겹쳐 팝업 전체 크기가 지나치게 커 보임.

---

## 2. 수정 방안 (`index.html` + `admin/index.html`)
1. **팝업 크기 컴팩트화 (Toss/Stripe 다이얼로그 규격)**:
   - `.custom-modal-card`: `max-width: 480px` → **`max-width: 390px`**, `padding: 20px 22px 18px`.
   - `.modal-icon-badge`: `40px × 40px`, `.modal-title`: `1.08rem`, `.modal-btn`: `padding: 9px 16px; font-size: 0.88rem`.
   - 이중 줄바꿈 제거와 합쳐 **세로 높이가 기존 대비 약 40% 컴팩트하게 축소**됨.
2. **이중 줄바꿈 버그 원천 제거**:
   - `.modal-callout-box`에 `white-space: normal;` 명시.
   - `showCustomAlert()` / `showCustomConfirm()`에서 HTML(`<div`, `<br`) 포함 시 `.modal-message`에 `white-space: normal;` 자동 적용 (순수 텍스트 `\n` 알림만 `pre-line` 유지).
3. **점수 전송 확인 모달 2열 키-값 그리드 정리 (`index.html`)**:
   - 시험장/교시 헤더 아래 얇은 구분선 + **좌측 라벨(회색) / 우측 값(진한 차콜 굵게)** 2열 정렬로 깔끔하게 마감.

---

## 3. Git 반영
- 승인 후 `index.html`, `admin/index.html`, `docs/plans/MODAL_TYPOGRAPHY_POLISH_PLAN.md` 커밋 및 `main` 푸시.
