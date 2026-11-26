// @ts-check
const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const GAS_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwtGz5tGcXgJt-VJsYFaHOkPULVX1XOuYtTnZY2u6-6sgRXHOqWJRRcK6jkdz815yQ3Yw/exec';
const ROOM_LIMIT = Number(process.env.ROOM_LIMIT || 0); // 0 = 시트의 전체 시험장 동적 로드
const TARGET_ROOM = process.env.TARGET_ROOM || '';
const HEADLESS = process.env.HEADLESS !== '0' && process.env.HEADLESS !== 'false';
const TURBO = process.env.TURBO === '1' || process.env.TURBO === 'true';

// 시트(시간표 + 설정 CODE_*)에서 실시간 시험장 목록 및 접속 코드 동적 로드
async function fetchDynamicRooms() {
  const resp = await fetch(`${GAS_URL}?action=init`);
  const json = await resp.json();
  if (json.status !== 'success') {
    throw new Error('GAS init 로드 실패: ' + (json.message || 'unknown'));
  }
  const settings = json.data.settings || {};
  const timetable = json.data.timetable || [];
  const roomSet = new Set();
  timetable.forEach((t) => {
    if (t && t.room) roomSet.add(String(t.room).trim());
  });
  Object.keys(settings).forEach((k) => {
    if (k.startsWith('CODE_')) {
      const rn = k.slice(5).trim();
      if (rn) roomSet.add(rn);
    }
  });
  const sorted = Array.from(roomSet).sort((a, b) => {
    const aSp = a.includes('스팍스') || a.toUpperCase().includes('SPARKS');
    const bSp = b.includes('스팍스') || b.toUpperCase().includes('SPARKS');
    if (aSp !== bSp) return aSp ? -1 : 1;
    return a.localeCompare(b, 'ko', { numeric: true });
  });
  return sorted.map((name) => ({
    name,
    code: String(settings['CODE_' + name] || '').trim(),
  }));
}

// 시뮬레이션할 교시 목록 (오전/오후 객관식 및 오후 스피드 퀴즈)
const PERIODS = ['1', '2', '3', '4', '5', '6', '7'];

function randomDelay(minMs = 250, maxMs = 900) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dismissModalIfVisible(page) {
  const overlay = page.locator('#customModalOverlay');
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    const confirmBtn = page.locator('#modalBtnConfirm');
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
      await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
    }
  }
}

async function waitForLoadingDone(page) {
  // 로딩 오버레이(#loadingOverlay 등)가 사라질 때까지 대기
  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('#loadingOverlay, .loading-overlay');
    for (const el of overlays) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        return false;
      }
    }
    return true;
  }, { timeout: 30_000 }).catch(() => { });
}

/**
 * 현재 열린 탭(객관식 또는 스피드)의 문제를 1번(data-q="0")부터 순서대로
 * 모든 선수에 대해 O/X 클릭 후 저장(제출)
 */
async function fillAndSubmitCurrentTab(page, roomName = '', period = '', sessionLabel = '') {
  await dismissModalIfVisible(page);

  // 현재 테이블에 존재하는 문제 번호(data-q) 목록 추출 (0, 1, 2, ...)
  const qIndices = await page.locator('.quiz-cell:not(.locked):not(.vacant)').evaluateAll((els) => {
    const set = new Set(els.map((el) => Number(el.getAttribute('data-q'))).filter((n) => !Number.isNaN(n)));
    return Array.from(set).sort((a, b) => a - b);
  });

  if (qIndices.length === 0) return;

  // 1번 문제(q=0)부터 마지막 문제까지 문제 번호 순서대로 모든 선수 클릭
  if (TURBO) {
    // [TURBO 모드] 브라우저 내부에서 단 1회 호출로 실제 DOM click() 일괄 실행 (0.05초, 스피드 자동 잠금 포함 100% 동일 동작)
    await page.evaluate((qs) => {
      for (const q of qs) {
        const cells = document.querySelectorAll(`.quiz-cell[data-q="${q}"]`);
        for (const el of cells) {
          if (el.classList.contains('locked') || el.classList.contains('vacant')) continue;
          el.click();
          if (Math.random() < 0.3 && !el.classList.contains('locked')) {
            el.click();
          }
        }
      }
    }, qIndices);
  } else {
    for (const q of qIndices) {
      const cellIds = await page
        .locator(`.quiz-cell[data-q="${q}"]:not(.locked):not(.vacant)`)
        .evaluateAll((els) => els.map((el) => el.id).filter(Boolean));

      for (const cellId of cellIds) {
        const cell = page.locator(`#${cellId}`);
        const cls = (await cell.getAttribute('class')) || '';
        if (cls.includes('locked') || cls.includes('vacant')) continue;

        // 실제 클릭 이벤트 발생 (O 또는 X) - 고속 모드 (기존 대비 10배 빠른 클릭)
        await cell.click({ force: true, timeout: 60_000 });
        // 30% 확률로 한 번 더 클릭해 X로 전환
        if (Math.random() < 0.3) {
          await randomDelay(8, 20);
          await cell.click({ force: true, timeout: 60_000 });
        }
        await randomDelay(10, 35);
      }
    }
  }

  // 제출 버튼 활성화 시 클릭 및 실제 저장 성공 엄격 검증
  const submitBtn = page.locator('#btnSubmit');
  if (await submitBtn.isEnabled()) {
    await submitBtn.click({ force: true });
    await dismissModalIfVisible(page);

    // 저장 완료 대기 (자동 재시도 포함 최대 90초 / TURBO 120초, 로딩 종료 + 결과 모달 또는 .state-saved 확인)
    await page.waitForFunction(() => {
      const loading = document.getElementById('loadingOverlay');
      const loadingHidden = !loading || window.getComputedStyle(loading).display === 'none';
      const modal = document.getElementById('customModalOverlay');
      const modalVisible = modal && window.getComputedStyle(modal).display !== 'none';
      const btn = document.getElementById('btnSubmit');
      const saved = btn && (btn.disabled || btn.classList.contains('state-saved'));
      return loadingHidden && (modalVisible || saved);
    }, { timeout: TURBO ? 120_000 : 90_000 });

    // 실패/오류 모달인지 확인 (가짜 제출 완료 로그 원천 차단)
    const modalTitle = await page.locator('#modalTitle').textContent().catch(() => '');
    if (modalTitle && (modalTitle.includes('실패') || modalTitle.includes('오류'))) {
      const modalMsg = await page.locator('#modalMessage').textContent().catch(() => '');
      throw new Error(`[${roomName}] ${period}교시 ${sessionLabel} 저장 실패: ${modalTitle} - ${modalMsg}`);
    }

    // 실제 저장 상태(.state-saved 또는 disabled) 확인
    const isActuallySaved = await page.evaluate(() => {
      const btn = document.getElementById('btnSubmit');
      return Boolean(btn && (btn.disabled || btn.classList.contains('state-saved')));
    });
    if (!isActuallySaved) {
      throw new Error(`[${roomName}] ${period}교시 ${sessionLabel} 저장 완료 상태(.state-saved) 미확인`);
    }

    // 저장 완료 안내 모달 닫기
    await dismissModalIfVisible(page);
    await waitForLoadingDone(page);
    console.log(`[${roomName}] ${period}교시 ${sessionLabel} 제출 완료 (문항 수: ${qIndices.length})`);
    await randomDelay(100, 250);
  }
}

/**
 * 단일 시험장 브라우저에서 로그인 후 교시별(오전 탭 → 오후 탭) 실제 클릭으로 점수 입력 및 제출
 */
async function simulateRoom(context, room, index) {
  // 초기 GAS 동시 로그인 요청 분산 (시험장별 0.7초 시차)
  if (index > 0) {
    await new Promise((resolve) => setTimeout(resolve, index * 700));
  }

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });

  // 1. 게이트웨이(시험장 입장) 인증
  await page.selectOption('#gatewayRoomSelect', room.name);
  await page.fill('#gatewayRoomCode', room.code);
  await page.click('#btnGatewayEnter');

  // 입장 완료 대기 (시험장 배지 표시 확인 및 초기 명단 로딩 완료 대기)
  await expect(page.locator('#currentRoomText')).toHaveText(room.name, { timeout: 45_000 });
  await waitForLoadingDone(page);
  await dismissModalIfVisible(page);

  // 점수기록관 성함 입력
  await page.fill('#recorderName', `테스터${index + 1}`);

  // 2. 교시 목록 조회
  const availablePeriods = await page
    .locator('#periodSelect option')
    .evaluateAll((opts) => opts.map((o) => o.value).filter((v) => v !== ''));

  // 2-1. 오전 세션 전체 교시 진행 (#tabMorning)
  for (const period of availablePeriods) {
    await waitForLoadingDone(page);
    await page.selectOption('#periodSelect', period);
    await waitForLoadingDone(page);
    await randomDelay(100, 250);
    await dismissModalIfVisible(page);

    const tabMorning = page.locator('#tabMorning');
    if (await tabMorning.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabMorning.click();
      await waitForLoadingDone(page);
      await randomDelay(80, 180);
      await fillAndSubmitCurrentTab(page, room.name, period, '오전');
    }
  }

  // 2-2. 오후 세션 전체 교시 진행 (#tabAfternoon)
  for (const period of availablePeriods) {
    await waitForLoadingDone(page);
    await page.selectOption('#periodSelect', period);
    await waitForLoadingDone(page);
    await randomDelay(100, 250);
    await dismissModalIfVisible(page);

    const tabAfternoon = page.locator('#tabAfternoon');
    if (await tabAfternoon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabAfternoon.click();
      await waitForLoadingDone(page);
      await randomDelay(80, 180);
      await fillAndSubmitCurrentTab(page, room.name, period, '오후');
    }
  }

  console.log(`✅ [${room.name}] 전체 교시 완료!`);
  return room.name;
}

test('시험장 실시간 클릭 시뮬레이션', async () => {
  const allRooms = await fetchDynamicRooms();
  const targetRooms = TARGET_ROOM
    ? allRooms.filter((r) => r.name === TARGET_ROOM)
    : (ROOM_LIMIT > 0 ? allRooms.slice(0, ROOM_LIMIT) : allRooms);
  expect(targetRooms.length).toBeGreaterThan(0);

  console.log(`🚀 ${targetRooms.length}개 시험장 동시 시뮬레이션 시작 (모드: ${HEADLESS ? 'Headless 초경량' : 'Headed 단일 브라우저 탭'}${TURBO ? ' / ⚡ TURBO 극한 동시 제출' : ''})`);

  // 단일 Chromium 브라우저 1개만 실행 + 시험장별 독립 BrowserContext (CPU/메모리 1/8 절감)
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      '--window-position=-3400,40',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-extensions',
    ],
  });

  const roomContexts = await Promise.all(
    targetRooms.map(() => browser.newContext({ viewport: { width: 1280, height: 800 } }))
  );

  // 1개 시험장 오류 시 나머지 시험장 연쇄 종료 방지
  const settled = await Promise.allSettled(
    targetRooms.map((room, idx) => simulateRoom(roomContexts[idx], room, idx))
  );

  const succeeded = [];
  const failed = [];
  settled.forEach((res, idx) => {
    const roomName = targetRooms[idx].name;
    if (res.status === 'fulfilled') {
      succeeded.push(roomName);
    } else {
      console.error(`[${roomName}] 시뮬레이션 실패:`, res.reason);
      failed.push({ roomName, reason: String(res.reason) });
    }
  });

  console.log(`시뮬레이션 결과: 성공 ${succeeded.length}개 / 실패 ${failed.length}개`);

  // 정리
  await browser.close().catch(() => { });

  expect(failed, `실패한 시험장: ${JSON.stringify(failed)}`).toHaveLength(0);
});

