// @ts-check
const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const GAS_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwtGz5tGcXgJt-VJsYFaHOkPULVX1XOuYtTnZY2u6-6sgRXHOqWJRRcK6jkdz815yQ3Yw/exec';
const ROOM_LIMIT = Number(process.env.ROOM_LIMIT || 0); // 0 = 시트의 전체 시험장 동적 로드
const TARGET_ROOM = process.env.TARGET_ROOM || '';

function randomDelay(minMs = 25, maxMs = 60) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDynamicConfig() {
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

  return {
    rooms: sorted.map((name) => ({
      name,
      code: String(settings['CODE_' + name] || '').trim(),
    })),
    adminPin: String(process.env.ADMIN_PIN || settings['ADMIN_PIN'] || 'AWANA2026').trim(),
    speedMaxO: Number(settings['스피드_최대정답수'] || 3),
  };
}

async function dismissModalIfVisible(page) {
  const overlay = page.locator('#customModalOverlay');
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    const confirmBtn = page.locator('#modalBtnConfirm');
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
      await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
    }
  }
}

async function waitForLoadingDone(page) {
  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('#loadingOverlay, .loading-overlay, #hqLoadingOverlay');
    for (const el of overlays) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        return false;
      }
    }
    return true;
  }, { timeout: 60_000 }).catch(() => { });
}

/**
 * [트랙 1] 시험장 점수 직접 입력 모드로 현재 탭 채점 및 제출 검증
 */
async function fillDirectAndSubmit(page, roomName, period, sessionLabel, speedMaxO) {
  await dismissModalIfVisible(page);

  // 점수 직접 입력 모드로 전환되어 있는지 확인 (허용된 경우)
  const btnDirect = page.locator('#btnModeDirect');
  if (await btnDirect.isVisible({ timeout: 1000 }).catch(() => false)) {
    const isActive = await btnDirect.evaluate((el) => el.classList.contains('active'));
    if (!isActive) {
      await btnDirect.click({ force: true });
      await dismissModalIfVisible(page);
    }
  }

  const isSpeed = await page.evaluate(() => typeof CURRENT_SESSION_TYPE !== 'undefined' && CURRENT_SESSION_TYPE === 'speed');
  const maxPersonal = isSpeed ? 20 * speedMaxO : 80;

  // 브라우저 내부에서 직접 입력 인풋 일괄 채움 (객관식 0~80 10점 단위 / 스피드 0~maxPersonal 20점 단위, 조 합계 <= 200)
  const inputCount = await page.evaluate(({ isSpeed, maxPersonal }) => {
    const inputs = Array.from(document.querySelectorAll('.direct-score-input:not([disabled])'));
    if (inputs.length === 0) return 0;

    if (!isSpeed) {
      inputs.forEach((el) => {
        const val = (Math.floor(Math.random() * 7) + 2) * 10; // 20~80점 (10점 단위)
        el.value = String(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    } else {
      // 스피드 퀴즈: 전원 0으로 초기화 후 무작위 득점자에게 20점씩 총 최대 200점(10문항) 분배
      const scores = new Array(inputs.length).fill(0);
      const totalQuestions = Math.floor(Math.random() * 5) + 6; // 6~10문항 득점 (120~200점)
      for (let q = 0; q < totalQuestions; q++) {
        const candidates = [];
        for (let i = 0; i < scores.length; i++) {
          if (scores[i] + 20 <= maxPersonal) candidates.push(i);
        }
        if (candidates.length === 0) break;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        scores[pick] += 20;
      }
      inputs.forEach((el, idx) => {
        el.value = String(scores[idx]);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    return inputs.length;
  }, { isSpeed, maxPersonal });

  if (inputCount === 0) return;

  const submitBtn = page.locator('#btnSubmit');
  if (await submitBtn.isEnabled()) {
    await submitBtn.click({ force: true });
    await dismissModalIfVisible(page);

    await page.waitForFunction(() => {
      const loading = document.getElementById('loadingOverlay');
      const loadingHidden = !loading || window.getComputedStyle(loading).display === 'none';
      const modal = document.getElementById('customModalOverlay');
      const modalVisible = modal && window.getComputedStyle(modal).display !== 'none';
      const btn = document.getElementById('btnSubmit');
      const saved = btn && (btn.disabled || btn.classList.contains('state-saved'));
      return loadingHidden && (modalVisible || saved);
    }, { timeout: 120_000 });

    const modalTitle = await page.locator('#modalTitle').textContent().catch(() => '');
    if (modalTitle && (modalTitle.includes('실패') || modalTitle.includes('오류'))) {
      const modalMsg = await page.locator('#modalMessage').textContent().catch(() => '');
      throw new Error(`[${roomName}] ${period}교시 ${sessionLabel} 저장 실패: ${modalTitle} - ${modalMsg}`);
    }

    const isActuallySaved = await page.evaluate(() => {
      const btn = document.getElementById('btnSubmit');
      return Boolean(btn && (btn.disabled || btn.classList.contains('state-saved')));
    });
    if (!isActuallySaved) {
      throw new Error(`[${roomName}] ${period}교시 ${sessionLabel} 저장 완료 상태 미확인`);
    }

    await dismissModalIfVisible(page);
    await waitForLoadingDone(page);
    console.log(`[시험장:${roomName}] ${period}교시 ${sessionLabel} 직접입력 제출 완료 (${inputCount}명)`);
  }
}

async function simulateDirectRoom(context, room, index, speedMaxO) {
  try {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, index * 600));
    }

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
    await waitForLoadingDone(page);

    await page.selectOption('#gatewayRoomSelect', room.name);
    await page.fill('#gatewayRoomCode', room.code);
    await page.click('#btnGatewayEnter');

    await expect(page.locator('#currentRoomText')).toHaveText(room.name, { timeout: 60_000 });
    await waitForLoadingDone(page);
    await dismissModalIfVisible(page);
    console.log(`🚪 [시험장:${room.name}] 입장 완료`);

    await page.fill('#recorderName', `기록관${index + 1}`);

    const availablePeriods = await page
      .locator('#periodSelect option')
      .evaluateAll((opts) => opts.map((o) => o.value).filter((v) => v !== ''));

    // 오전 세션 전 교시
    for (const period of availablePeriods) {
      await waitForLoadingDone(page);
      await page.selectOption('#periodSelect', period);
      await waitForLoadingDone(page);
      await dismissModalIfVisible(page);

      const tabMorning = page.locator('#tabMorning');
      if (await tabMorning.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabMorning.click();
        await waitForLoadingDone(page);
        await fillDirectAndSubmit(page, room.name, period, '오전', speedMaxO);
      }
    }

    // 오후 세션 전 교시
    for (const period of availablePeriods) {
      await waitForLoadingDone(page);
      await page.selectOption('#periodSelect', period);
      await waitForLoadingDone(page);
      await dismissModalIfVisible(page);

      const tabAfternoon = page.locator('#tabAfternoon');
      if (await tabAfternoon.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabAfternoon.click();
        await waitForLoadingDone(page);
        await fillDirectAndSubmit(page, room.name, period, '오후', speedMaxO);
      }
    }

    console.log(`✅ [시험장:${room.name}] 오전·오후 전 교시 완료!`);
    return room.name;
  } catch (err) {
    console.error(`❌ [시험장:${room.name}] 중단 원인:`, err && err.message ? err.message : err);
    throw err;
  }
}

/**
 * [트랙 2] 본부 관리 포털 필기 채점 (Headed 1개 창, 1번 모니터에서 눈으로 확인)
 */
async function simulateHqWrittenScoring(adminPin) {
  const headedBrowser = await chromium.launch({
    headless: false,
    args: [
      '--window-position=-3400,40',
      '--window-size=1400,900',
      '--disable-extensions',
    ],
  });

  try {
    const context = await headedBrowser.newContext({ viewport: { width: 1360, height: 840 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/index.html`, { waitUntil: 'domcontentloaded' });

    // 관리자 PIN 로그인
    await page.locator('#adminPinInput').waitFor({ state: 'visible', timeout: 30_000 });
    await page.fill('#adminPinInput', adminPin);
    await page.keyboard.press('Enter');

    await page.locator('#adminPinModalOverlay').waitFor({ state: 'hidden', timeout: 30_000 });
    await waitForLoadingDone(page);

    // 필기 채점 탭 이동
    await page.locator('button[onclick="switchHqTab(\'written\')"]').click();
    await page.locator('#writtenHandbookSelect').waitFor({ state: 'visible', timeout: 15_000 });

    const handbooks = await page
      .locator('#writtenHandbookSelect option')
      .evaluateAll((opts) => opts.map((o) => o.value).filter((v) => v !== ''));

    console.log(`📝 [본부 필기 채점] 총 ${handbooks.length}개 핸드북 자동 입력 시작!`);
    let totalSavedTeams = 0;

    for (const hb of handbooks) {
      await page.selectOption('#writtenHandbookSelect', hb);
      await randomDelay(100, 200);

      const teams = await page
        .locator('#writtenTeamSelect option')
        .evaluateAll((opts) => opts.map((o) => o.value).filter((v) => v !== ''));

      for (const team of teams) {
        await page.selectOption('#writtenTeamSelect', team);
        await randomDelay(120, 220);

        const inputIds = await page
          .locator('.input-written-score:not([disabled])')
          .evaluateAll((els) => els.map((el) => el.id).filter(Boolean));

        if (inputIds.length === 0) continue;

        // 눈으로 볼 수 있는 속도로 각 단원 필기점수(50~150점, 10점 단위) 입력
        for (const id of inputIds) {
          const score = (Math.floor(Math.random() * 11) + 5) * 10; // 50~150점
          const inp = page.locator(`#${id}`);
          await inp.fill(String(score));
          await randomDelay(20, 45);
        }

        // 필기점수 저장 버튼 클릭 → 확인 모달 클릭
        await page.locator('#btnSaveWrittenBatch').click({ force: true });
        await dismissModalIfVisible(page);

        // 저장 완료 모달 대기 (최대 120초, 자동 재시도 포함)
        await page.waitForFunction(() => {
          const overlay = document.getElementById('customModalOverlay');
          const visible = overlay && window.getComputedStyle(overlay).display !== 'none';
          const title = document.getElementById('modalTitle')?.textContent || '';
          return visible && (title.includes('저장 완료') || title.includes('실패') || title.includes('오류'));
        }, { timeout: 120_000 });

        const title = await page.locator('#modalTitle').textContent().catch(() => '');
        if (title && (title.includes('실패') || title.includes('오류'))) {
          const msg = await page.locator('#modalMessage').textContent().catch(() => '');
          throw new Error(`[필기 채점] ${hb} ${team}조 저장 실패: ${title} - ${msg}`);
        }

        await dismissModalIfVisible(page);
        totalSavedTeams++;
        console.log(`📝 [필기 채점] ${hb} ${team}조 저장 완료 (${inputIds.length}명 / 누적 ${totalSavedTeams}조)`);
      }
    }

    console.log(`✅ [본부 필기 채점] 전체 ${totalSavedTeams}개 조 완료!`);
    return `필기채점(${totalSavedTeams}조)`;
  } catch (err) {
    console.error('❌ [본부 필기 채점] 중단 원인:', err && err.message ? err.message : err);
    throw err;
  } finally {
    await headedBrowser.close().catch(() => { });
  }
}

test('전 종목 통합 시뮬레이션 (전체 시험장 직접입력 백그라운드 + 본부 필기채점 화면표시)', async () => {
  const cfg = await fetchDynamicConfig();
  const targetRooms = TARGET_ROOM
    ? cfg.rooms.filter((r) => r.name === TARGET_ROOM)
    : (ROOM_LIMIT > 0 ? cfg.rooms.slice(0, ROOM_LIMIT) : cfg.rooms);
  expect(targetRooms.length).toBeGreaterThan(0);

  console.log(`🚀 전 종목 통합 시뮬레이션 시작: 시험장 ${targetRooms.length}개(Headless 직접입력) + 본부 필기채점(Headed 1번 모니터)`);

  // 트랙 1용 Headless 단일 브라우저
  const headlessBrowser = await chromium.launch({
    headless: true,
    args: [
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-extensions',
    ],
  });

  const roomContexts = await Promise.all(
    targetRooms.map(() => headlessBrowser.newContext({ viewport: { width: 1280, height: 800 } }))
  );

  // 트랙 1(전체 시험장) + 트랙 2(본부 필기채점) 동시 실행
  const tasks = [
    ...targetRooms.map((room, idx) => simulateDirectRoom(roomContexts[idx], room, idx, cfg.speedMaxO)),
    simulateHqWrittenScoring(cfg.adminPin),
  ];

  const settled = await Promise.allSettled(tasks);

  const failed = [];
  settled.forEach((res, idx) => {
    const label = idx < targetRooms.length ? targetRooms[idx].name : '본부 필기채점';
    if (res.status === 'rejected') {
      console.error(`❌ [${label}] 실패:`, res.reason);
      failed.push({ label, reason: String(res.reason) });
    }
  });

  await headlessBrowser.close().catch(() => { });

  console.log(`🏁 전 종목 통합 시뮬레이션 종료: 성공 ${settled.length - failed.length} / 전체 ${settled.length}`);
  expect(failed, `실패 항목: ${JSON.stringify(failed)}`).toHaveLength(0);
});

