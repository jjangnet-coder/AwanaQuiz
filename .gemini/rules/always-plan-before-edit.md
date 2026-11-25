---
description: Always present a modification plan artifact and wait for user approval before editing any code.
---

# 수정 전 계획서(Artifact) 필수 규칙

- 사용자의 코드 수정/기능 추가/버그 수정 요청을 받았을 때, **절대 바로 코드를 수정하지 않는다.**
- 반드시 먼저 **수정계획서 아티팩트(`RequestFeedback: true`)**를 작성해 사용자에게 보여준다.
- 사용자가 아티팩트를 검토하고 **진행(Proceed)** 또는 명시적 승인을 한 뒤에만 실제 파일 수정(`edit_file`, `write_file`) 및 `git commit`/`push`를 수행한다.
- 단, 사용자가 명시적으로 "계획서 없이 바로 수정해"라고 지시한 경우에만 예외로 한다.

