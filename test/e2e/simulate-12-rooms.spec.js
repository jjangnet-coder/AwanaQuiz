// @ts-check
const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ROOM_LIMIT = Number(process.env.ROOM_LIMIT || 12);
const TARGET_ROOM = process.env.TARGET_ROOM || '';

// 12개 시험장 목록 및 기본 접속 코드 (실제 환경에 맞게 수정 가능)
const ROOMS = [
  { name: '스팍스1', code: process.env.CODE_SP01 || 'SP01' },
  { name: '스팍스2', code: process.env.CODE_SP02 || 'SP02' },
  { name: '스팍스3', code: process.env.CODE_SP03 || 'SP03' },
  { name: '스팍스4', code: process.env.CODE_SP04 || 'SP04' },
  { name: '스팍스5', code: process.env.CODE_SP05 || 'SP05' },
  { name: '티앤티1', code: process.env.CODE_TT01 || 'TT01' },
  { name: '티앤티2', code: process.env.CODE_TT02 || 'TT02' },
  { name: '티앤티3', code: process.env.CODE_TT03 || 'TT03' },
  { name: '티앤티4', code: process.env.CODE_TT04 || 'TT04' },
  { name: '티앤티5', code: process.env.CODE_TT05 || 'TT05' },
  { name: '티앤티6', code: process.env.CODE_TT06 || 'TT06' },
  { name: '티앤티7', code: process.env.CODE_TT07 || 'TT07' },
];

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
      await confirmBtn.click();
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
async function fillAndSubmitCurrentTab(page) {
  await dismissModalIfVisible(page);

  // 현재 테이블에 존재하는 문제 번호(data-q) 목록 추출 (0, 1, 2, ...)
  const qIndices = await page.locator('.quiz-cell:not(.locked):not(.vacant)').evaluateAll((els) => {
    const set = new Set(els.map((el) => Number(el.getAttribute('data-q'))).filter((n) => !Number.isNaN(n)));
    return Array.from(set).sort((a, b) => a - b);
  });

  if (qIndices.length === 0) return;

  // 1번 문제(q=0)부터 마지막 문제까지 문제 번호 순서대로 모든 선수 클릭
  for (const q of qIndices) {
    const cellIds = await page
      .locator(`.quiz-cell[data-q="${q}"]:not(.locked):not(.vacant)`)
      .evaluateAll((els) => els.map((el) => el.id).filter(Boolean));

    for (const cellId of cellIds) {
      const cell = page.locator(`#${cellId}`);
      const cls = (await cell.getAttribute('class')) || '';
      if (cls.includes('locked') || cls.includes('vacant')) continue;

      // 실제 클릭 이벤트 발생 (O 또는 X)
      await cell.click();
      // 30% 확률로 한 번 더 클릭해 X로 전환
      if (Math.random() < 0.3) {
        await randomDelay(80, 200);
        await cell.click();
      }
      await randomDelay(100, 350);
    }
  }

  // 제출 버튼 활성화 시 클릭
  const submitBtn = page.locator('#btnSubmit');
  if (await submitBtn.isEnabled()) {
    console.log(`[${page.url()}] 제출 버튼 클릭 (문항 수: ${qIndices.length})`);
    await submitBtn.click({ force: true });
    await dismissModalIfVisible(page);

    // 저장 완료 대기: 제출 버튼이 저장 완료(.state-saved) 또는 비활성화될 때까지 대기 (최대 20초)
    await page.waitForFunction(() => {
      const btn = document.getElementById('btnSubmit');
      if (!btn) return true;
      return btn.disabled || btn.classList.contains('state-saved');
    }, { timeout: 20_000 }).catch(() => { });

    // 저장 완료 안내 모달이 뜨면 닫기
    await dismissModalIfVisible(page);
    await randomDelay(500, 1000);
  }
}

/**
 * 단일 시험장 브라우저에서 로그인 후 교시별(오전 탭 → 오후 탭) 실제 클릭으로 점수 입력 및 제출
 */
async function simulateRoom(context, room, index) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });

  // 1. 게이트웨이(시험장 입장) 인증
  await page.selectOption('#gatewayRoomSelect', room.name);
  await page.fill('#gatewayRoomCode', room.code);
  await page.click('#btnGatewayEnter');

  // 입장 완료 대기 (교실 배지 표시 확인 및 초기 명단 로딩 완료 대기)
  await expect(page.locator('#currentRoomText')).toHaveText(room.name, { timeout: 15_000 });
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
    await randomDelay(400, 900);
    await dismissModalIfVisible(page);

    const tabMorning = page.locator('#tabMorning');
    if (await tabMorning.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabMorning.click();
      await waitForLoadingDone(page);
      await randomDelay(300, 600);
      await fillAndSubmitCurrentTab(page);
    }
  }

  // 2-2. 오후 세션 전체 교시 진행 (#tabAfternoon)
  for (const period of availablePeriods) {
    await waitForLoadingDone(page);
    await page.selectOption('#periodSelect', period);
    await waitForLoadingDone(page);
    await randomDelay(400, 900);
    await dismissModalIfVisible(page);

    const tabAfternoon = page.locator('#tabAfternoon');
    if (await tabAfternoon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabAfternoon.click();
      await waitForLoadingDone(page);
      await randomDelay(300, 600);
      await fillAndSubmitCurrentTab(page);
    }
  }

  return room.name;
}

test('시험장 실시간 클릭 시뮬레이션', async () => {
  const targetRooms = TARGET_ROOM
    ? ROOMS.filter((r) => r.name === TARGET_ROOM)
    : ROOMS.slice(0, ROOM_LIMIT);
  expect(targetRooms.length).toBeGreaterThan(0);

  // 각 시험장별 브라우저 창을 1번 모니터에 조금씩 엇갈리게 배치하여 실행
  const browsers = await Promise.all(
    targetRooms.map((_, idx) => {
      const x = 60 + (idx % 4) * 80;
      const y = 40 + Math.floor(idx / 4) * 60;
      return chromium.launch({
        headless: false,
        args: [`--window-position=${x},${y}`],
      });
    })
  );
  const roomContexts = await Promise.all(
    browsers.map((b) => b.newContext({ viewport: { width: 1280, height: 800 } }))
  );

  const results = await Promise.all(
    targetRooms.map((room, idx) => simulateRoom(roomContexts[idx], room, idx))
  );

  expect(results).toHaveLength(targetRooms.length);

  // 정리
  await Promise.all(browsers.map((b) => b.close()));
});

