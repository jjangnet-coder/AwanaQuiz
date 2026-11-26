# 점수 입력칸 정중앙 정렬 & 스피드 빈칸 0 자동 복원 계획서

## 1. 수정 내역

### A. 점수 입력칸 가로 정중앙 정렬 (`index.html`, `admin/index.html`)
- `<input type="number">` 우측에 브라우저가 예약하는 스핀 버튼(위·아래 화살표) 영역 때문에 `0`과 `0~80`이 왼쪽으로 치우쳐 보이던 현상 해결.
- `.direct-score-input` (`index.html`) 및 `.input-written-score` (`admin/index.html`)에 스핀 버튼 숨김 CSS(`-webkit-appearance: none; appearance: textfield;`) 적용 → 숫자/플레이스홀더 **가로 정중앙(0px 오차)** 정렬.

### B. 스피드 퀴즈 직접 입력 빈칸 `0` 자동 복원 (`index.html`)
- 스피드 퀴즈(`CURRENT_SESSION_TYPE === 'speed'`)에서 `60`을 입력했다가 지우고 포커스를 벗어날 때(`onblur`), 빈칸(`0~60`)으로 남지 않고 **자동으로 기본값 `0`으로 복원** (`handleDirectScoreBlur(this)`).
- *(객관식은 누락 검증을 위해 기존대로 빈칸 유지)*

---

## 2. Git 반영
- 승인 후 `index.html`, `admin/index.html`, `docs/plans/SCORE_INPUT_CENTER_ALIGN_FIX_PLAN.md` 커밋 및 `main` 푸시.
