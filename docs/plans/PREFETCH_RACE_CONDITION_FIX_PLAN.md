# 시험장 점수 입력 로딩 조기 종료 및 입력 초기화(레이스 컨디션) 수정 계획서

## 1. 정확한 원인 (`index.html`)
1. `fetchMasterData()`가 `action=init` 완료 직후 `checkGatewayAuth()` → `applyLockedRoom()` → `prefetchRoomStudents()`(**요청 #1**)를 **`await` 없이** 호출하고, 곧바로 `finally { hideLoading(); }`를 실행해 **명단 로딩이 끝나기도 전에 로딩 화면을 꺼버림**.
2. 로딩이 끝난 줄 안 사용자가 교시를 선택하면 `ROOM_PREFETCH_CACHE`가 아직 비어 있어 `onSelectionChange()`가 `prefetchRoomStudents()`(**요청 #2**)를 중복 호출하면서 로딩이 한 번 더 뜸.
3. 먼저 도착한 응답으로 명단이 표시되어 사용자가 1, 2, 3번을 입력하는 도중, **뒤늦게 도착한 나머지 중복 요청의 콜백(`onSelectionChange()` → `initGridAndRender()`)이 실행되면서 방금 입력한 O/X 점수를 전부 지워버림**.

---

## 2. 수정 방안 (`index.html`)
1. **초기 로딩 `await` 직렬화 (준비 100% 완료 후 로딩 종료)**:
   - `checkGatewayAuth()`, `applyLockedRoom()`을 `async`로 변경하고 `fetchMasterData()`에서 `await checkGatewayAuth()` 완료 후에만 `hideLoading()` 실행.
   - 새로고침 후 **시간표 + 시험장 전체 단원 명단**까지 모두 준비된 뒤에 로딩이 끝나므로, 이후 교시 선택 시 **추가 로딩 없이 0.001초 즉시 표시**.
2. **중복 프리패치 원천 차단 (`PREFETCH_PROMISE_MAP`)**:
   - 동일 시험장에 대한 `prefetchRoomStudents(roomName)` 요청이 이미 진행 중이면 중복 `fetch`를 보내지 않고 진행 중인 Promise를 공유.
3. **로딩 오버레이 참조 카운터 (`LOADING_DEPTH`) 적용**:
   - `showLoading()` / `hideLoading()`을 카운트 기반으로 관리해 중첩된 비동기 작업 중 하나가 먼저 끝나더라도 다른 작업이 끝나기 전에 로딩이 꺼지지 않도록 보장.
4. **수동 새로고침(`handleManualRefresh`) 시 `ROOM_PREFETCH_CACHE = null` 초기화**:
   - 수동 새로고침 시에도 캐시를 비운 뒤 `await checkGatewayAuth()`로 최신 명단까지 한 번에 안전하게 갱신.

---

## 3. Git 반영
- 승인 후 `index.html` 및 `docs/plans/PREFETCH_RACE_CONDITION_FIX_PLAN.md` 커밋 및 `main` 푸시.

