/**
 * Awana 성경퀴즈대회 백엔드 API (Google Apps Script)
 * 
 * - doGet(e): 마스터 데이터('설정', '참가자명단', '시간표') 및 '최종집계' 실시간 점수 현황 통합 반환
 * - doPost(e): LockService 기반 원자적(Atomic) 트랜잭션 동시성 제어
 *              로그 시트(객관식/스피드/필기) Append + '최종집계' 시트 실시간 직접 갱신 (하이브리드 고속 갱신)
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || '').trim();

    // 1. 설정 시트 읽기 (설정 또는 대회설정 호환, 설명 컬럼 호환)
    const settingsSheet = ss.getSheetByName('설정') || ss.getSheetByName('대회설정');
    const settings = {};
    if (settingsSheet && settingsSheet.getLastRow() >= 2) {
      const sData = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getValues();
      sData.forEach(row => {
        if (row[0]) {
          settings[String(row[0]).trim()] = row[1];
        }
      });
    }

    // 2. 시간표 시트 읽기 (시간표 또는 교실순환시간표 호환, 테이블 변환 방어)
    // 컬럼: 교실명(0) | 교시(1) | 핸드북(2) | 조(3)
    const tSheet = ss.getSheetByName('시간표') || ss.getSheetByName('교실순환시간표');
    const timetable = [];
    if (tSheet && tSheet.getLastRow() >= 2) {
      const tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 4).getValues();
      tData.forEach(row => {
        const room = String(row[0] || '').trim();
        if (room) {
          timetable.push({
            room: room,
            period: Number(row[1]),
            handbook: String(row[2] || '').trim(),
            team: Number(row[3])
          });
        }
      });
    }

    // [경량 온디맨드(On-Demand) 분기 처리]
    // A. 초기 진입 (action === 'init'): 설정과 시간표만 0.1초 만에 초경량 반환 (1,376명 전원 다운로드 차단)
    if (action === 'init') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        mode: 'init',
        data: {
          settings: settings,
          timetable: timetable
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. 특정 교실 전체 1~7교시 일괄 프리패치 (action === 'getRoomStudents' 또는 room만 전달 시)
    //    또는 특정 교실/교시 온디맨드 단원 조회 (action === 'getStudents' && period !== null)
    const reqRoom = decodeURIComponent(params.room || '').trim();
    const reqPeriod = params.period !== undefined && params.period !== '' ? Number(params.period) : null;
    const isFiltered = Boolean(reqRoom);

    // 해당 교실(또는 특정 교시)에 배정된 [핸드북_조] 목록 추출
    const targetSchedulePairs = {};
    if (isFiltered) {
      timetable.forEach(t => {
        if (t.room === reqRoom) {
          if (reqPeriod === null || Number(t.period) === reqPeriod) {
            targetSchedulePairs[t.handbook + '_' + t.team] = true;
          }
        }
      });
    }

    // 3. 참가자명단 시트 읽기 (필터링 적용)
    // 컬럼: 참가자ID(0) | 핸드북(1) | 학년(2) | 조(3) | 번호(4) | 교회명(5) | 이름(6)
    const pSheet = ss.getSheetByName('참가자명단');
    const participants = [];
    const targetStudentIdSet = {};

    if (pSheet && pSheet.getLastRow() >= 2) {
      const pData = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, 7).getValues();
      pData.forEach(row => {
        const pid = String(row[0] || '').trim();
        if (!pid) return;

        const hb = String(row[1] || '').trim();
        const team = Number(row[3]);
        const key = hb + '_' + team;

        // 교실 프리패치 모드일 때는 해당 교실에 배정된 핸드북_조 학생들만 선별
        if (isFiltered) {
          if (targetSchedulePairs[key]) {
            participants.push({
              id: pid,
              handbook: hb,
              grade: Number(row[2]),
              team: team,
              num: Number(row[4]),
              church: String(row[5] || '').trim(),
              name: String(row[6] || '').trim()
            });
            targetStudentIdSet[pid] = true;
          }
        } else {
          // all=1 또는 레거시 전원 로드 모드 (본부 hq.html 등)
          participants.push({
            id: pid,
            handbook: hb,
            grade: Number(row[2]),
            team: team,
            num: Number(row[4]),
            church: String(row[5] || '').trim(),
            name: String(row[6] || '').trim()
          });
        }
      });
    }

    // 4. 최종집계 시트 점수 현황 읽기 (온디맨드 대상자만 핀포인트 선별)
    // 컬럼: 참가자ID(0) | 핸드북(1) | 교실(2) | 학년(3) | 조(4) | 번호(5) | 교회명(6) | 이름(7) | 필기점수(8) | 객관식(오전)(9) | 객관식(오후)(10) | 스피드(오후)(11) | 최종총점(12)
    const fSheet = ss.getSheetByName('최종집계');
    const scores = {};
    if (fSheet && fSheet.getLastRow() >= 2) {
      const fData = fSheet.getRange(2, 1, fSheet.getLastRow() - 1, 13).getValues();
      fData.forEach(row => {
        const pid = String(row[0]).trim();
        if (!pid) return;

        // 온디맨드 모드일 때는 선별된 학생들의 점수만 핀포인트 수집
        if (isFiltered && !targetStudentIdSet[pid]) return;

        scores[pid] = {
          written: row[8] === '' ? null : Number(row[8]),
          multipleMorning: row[9] === '' ? null : Number(row[9]),
          multipleAfternoon: row[10] === '' ? null : Number(row[10]),
          speedAfternoon: row[11] === '' ? null : Number(row[11]),
          total: row[12] === '' ? null : Number(row[12])
        };
      });
    }

    // 5. [서버 직결 답안 복원 엔진] 로그 시트(객관식_로그, 스피드_로그)에서 최신 O/X 문항 답안 수집
    // Key: studentId + '_' + period + '_' + session (예: 'P1186_1_오전')
    const submittedAnswers = {};

    // 5-1. 객관식_로그 순회 (단일 1회 일괄 메모리 읽기: 0.05초 소요)
    const mLogSheet = ss.getSheetByName('객관식_로그');
    if (mLogSheet && mLogSheet.getLastRow() >= 2) {
      const mRows = mLogSheet.getRange(2, 1, mLogSheet.getLastRow() - 1, 17).getValues();
      mRows.forEach(r => {
        const session = String(r[1] || '').trim(); // '오전' | '오후'
        const room = String(r[2] || '').trim();
        const period = Number(r[3]);
        const pid = String(r[6] || '').trim();

        // 현재 요청된 교실 데이터만 선별 (또는 전체)
        if (!isFiltered || room === reqRoom) {
          if (pid) {
            const key = pid + '_' + period + '_' + session;
            // 8문항 답안: r[8] ~ r[15]
            submittedAnswers[key] = [
              String(r[8] || ''), String(r[9] || ''), String(r[10] || ''), String(r[11] || ''),
              String(r[12] || ''), String(r[13] || ''), String(r[14] || ''), String(r[15] || '')
            ];
          }
        }
      });
    }

    // 5-2. 스피드_로그 순회 (단일 1회 일괄 메모리 읽기)
    const sLogSheet = ss.getSheetByName('스피드_로그');
    if (sLogSheet && sLogSheet.getLastRow() >= 2) {
      const sRows = sLogSheet.getRange(2, 1, sLogSheet.getLastRow() - 1, 18).getValues();
      sRows.forEach(r => {
        const room = String(r[1] || '').trim();
        const period = Number(r[2]);
        const pid = String(r[5] || '').trim();

        if (!isFiltered || room === reqRoom) {
          if (pid) {
            const key = pid + '_' + period + '_오후';
            // 10문항 답안: r[7] ~ r[16]
            submittedAnswers[key] = [
              String(r[7] || ''), String(r[8] || ''), String(r[9] || ''), String(r[10] || ''), String(r[11] || ''),
              String(r[12] || ''), String(r[13] || ''), String(r[14] || ''), String(r[15] || ''), String(r[16] || '')
            ];
          }
        }
      });
    }

    const response = {
      status: 'success',
      mode: isFiltered ? 'filtered' : 'full',
      data: {
        settings: settings,
        participants: participants,
        timetable: timetable,
        scores: scores,
        submittedAnswers: submittedAnswers
      }
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const errorResponse = {
      status: 'error',
      message: err.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  // 동시성 제어를 위한 ScriptLock 획득 (최대 30초 대기)
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000);

  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: '서버가 혼잡하여 잠금을 획득하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const rawPostData = e.postData.contents;
    const payload = JSON.parse(rawPostData);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const finalSheet = ss.getSheetByName('최종집계');
    if (!finalSheet) {
      throw new Error("'최종집계' 시트를 찾을 수 없습니다.");
    }

    const timestamp = new Date();
    const type = payload.type; // 'multiple' | 'speed' | 'written'

    // '최종집계' 시트 참가자ID 행 맵핑 캐시 생성 (Key: 참가자ID, Value: 시트 실제 행 번호 rowNum)
    let finalLastRow = finalSheet.getLastRow();

    // [자가 치유 방어 (Self-Healing)]: 최종집계 시트에 학생 데이터가 없는 경우 자동 동기화 1회 발동
    if (finalLastRow < 2) {
      Logger.log("⚠️ '최종집계' 시트가 비어있어 참가자명단으로부터 자동 동기화를 실행합니다.");
      if (typeof syncFinalSummaryFromParticipants === 'function') {
        syncFinalSummaryFromParticipants(ss);
        finalLastRow = finalSheet.getLastRow();
      }
    }

    const idToRowMap = {};
    if (finalLastRow >= 2) {
      const idColumnValues = finalSheet.getRange(2, 1, finalLastRow - 1, 1).getValues();
      for (let i = 0; i < idColumnValues.length; i++) {
        const id = String(idColumnValues[i][0]).trim();
        if (id) {
          idToRowMap[id] = i + 2; // 2행부터 시작
        }
      }
    }

    // 1. 객관식 점수 저장 처리
    if (type === 'multiple') {
      const logSheet = ss.getSheetByName('객관식_로그');
      if (!logSheet) throw new Error("'객관식_로그' 시트를 찾을 수 없습니다.");

      const logRows = [];
      const scoreColIndex = payload.session === '오전' ? 10 : 11; // 교실 열 추가로 10열: '객관식(오전)', 11열: '객관식(오후)'

      // [배치 최적화] 최종집계 점수 컬럼 전체를 메모리로 1회 읽기
      const totalRowsCount = finalLastRow - 1;
      let scoreColumnValues = [];
      if (totalRowsCount > 0) {
        scoreColumnValues = finalSheet.getRange(2, scoreColIndex, totalRowsCount, 1).getValues();
      }

      payload.records.forEach(r => {
        // 감사 로그 행 생성
        const answers = r.answers || [];
        const ans8 = [
          answers[0] || '', answers[1] || '', answers[2] || '', answers[3] || '',
          answers[4] || '', answers[5] || '', answers[6] || '', answers[7] || ''
        ];

        logRows.push([
          timestamp,
          payload.session,
          payload.room,
          Number(payload.period),
          payload.handbook,
          Number(payload.team),
          r.id,
          r.name,
          ans8[0], ans8[1], ans8[2], ans8[3], ans8[4], ans8[5], ans8[6], ans8[7],
          Number(r.score),
          payload.recorder || ''
        ]);

        // 메모리 상에서 점수 치환 (0.0001초 소요)
        const rowNum = idToRowMap[r.id];
        if (rowNum && rowNum >= 2 && (rowNum - 2) < scoreColumnValues.length) {
          scoreColumnValues[rowNum - 2][0] = Number(r.score);
        }
      });

      // [배치 최적화] 메모리에서 바뀐 점수 컬럼 전체를 단 1회의 setValues로 시트에 쓰기
      if (scoreColumnValues.length > 0) {
        finalSheet.getRange(2, scoreColIndex, scoreColumnValues.length, 1).setValues(scoreColumnValues);
      }

      if (logRows.length > 0) {
        logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, 18).setValues(logRows);
      }

    // 2. 스피드 퀴즈 점수 저장 처리 (T&T 오후 전용)
    } else if (type === 'speed') {
      const logSheet = ss.getSheetByName('스피드_로그');
      if (!logSheet) throw new Error("'스피드_로그' 시트를 찾을 수 없습니다.");

      const logRows = [];
      const scoreColIndex = 12; // 교실 열 추가로 12열: '스피드(오후)'

      // [배치 최적화] 최종집계 점수 컬럼 전체를 메모리로 1회 읽기
      const totalRowsCount = finalLastRow - 1;
      let scoreColumnValues = [];
      if (totalRowsCount > 0) {
        scoreColumnValues = finalSheet.getRange(2, scoreColIndex, totalRowsCount, 1).getValues();
      }

      payload.records.forEach(r => {
        // 감사 로그 행 생성
        const answers = r.answers || [];
        const ans10 = [
          answers[0] || '', answers[1] || '', answers[2] || '', answers[3] || '', answers[4] || '',
          answers[5] || '', answers[6] || '', answers[7] || '', answers[8] || '', answers[9] || ''
        ];

        logRows.push([
          timestamp,
          payload.room,
          Number(payload.period),
          payload.handbook,
          Number(payload.team),
          r.id,
          r.name,
          ans10[0], ans10[1], ans10[2], ans10[3], ans10[4], ans10[5], ans10[6], ans10[7], ans10[8], ans10[9],
          Number(r.score),
          payload.recorder || ''
        ]);

        // 메모리 상에서 점수 치환 (0.0001초 소요)
        const rowNum = idToRowMap[r.id];
        if (rowNum && rowNum >= 2 && (rowNum - 2) < scoreColumnValues.length) {
          scoreColumnValues[rowNum - 2][0] = Number(r.score);
        }
      });

      // [배치 최적화] 단 1회의 setValues로 시트에 쓰기
      if (scoreColumnValues.length > 0) {
        finalSheet.getRange(2, scoreColIndex, scoreColumnValues.length, 1).setValues(scoreColumnValues);
      }

      if (logRows.length > 0) {
        logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, 19).setValues(logRows);
      }

    // 3. 필기 점수 저장 처리 (본부 입력)
    } else if (type === 'written') {
      const logSheet = ss.getSheetByName('필기_로그');
      if (!logSheet) throw new Error("'필기_로그' 시트를 찾을 수 없습니다.");

      const logRows = [];
      const scoreColIndex = 9; // 교실 열 추가로 9열: '필기점수'

      // [배치 최적화] 최종집계 점수 컬럼 전체를 메모리로 1회 읽기
      const totalRowsCount = finalLastRow - 1;
      let scoreColumnValues = [];
      if (totalRowsCount > 0) {
        scoreColumnValues = finalSheet.getRange(2, scoreColIndex, totalRowsCount, 1).getValues();
      }

      payload.records.forEach(r => {
        // 감사 로그 행 생성
        logRows.push([
          timestamp,
          r.id,
          r.handbook || '',
          r.team !== undefined ? Number(r.team) : '',
          r.name || '',
          Number(r.score),
          payload.recorder || ''
        ]);

        // 메모리 상에서 점수 치환 (0.0001초 소요)
        const rowNum = idToRowMap[r.id];
        if (rowNum && rowNum >= 2 && (rowNum - 2) < scoreColumnValues.length) {
          scoreColumnValues[rowNum - 2][0] = Number(r.score);
        }
      });

      // [배치 최적화] 단 1회의 setValues로 시트에 쓰기
      if (scoreColumnValues.length > 0) {
        finalSheet.getRange(2, scoreColIndex, scoreColumnValues.length, 1).setValues(scoreColumnValues);
      }

      if (logRows.length > 0) {
        logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, 7).setValues(logRows);
      }

    } else {
      throw new Error(`지원하지 않는 저장 타입입니다: ${type}`);
    }

    // 변경사항 즉시 시트에 반영
    SpreadsheetApp.flush();

    // [초고속 핀포인트 시상 시트 동기화]
    // 11개 시트 전수를 매번 무식하게 돌지 않고, 지금 점수가 제출된 딱 그 1개 핸드북만 0.2초 만에 초고속 갱신!
    try {
      if (payload.handbook) {
        updateSingleHandbookAward(ss, payload.handbook);
      } else {
        updateHandBookAwards(ss);
      }
    } catch (awardErr) {
      Logger.log('시상 시트 갱신 중 경고: ' + awardErr.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      type: type,
      updatedCount: payload.records ? payload.records.length : 0,
      timestamp: timestamp.toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    // 트랜잭션 종료 후 Lock 반드시 해제
    lock.releaseLock();
  }
}

/**
 * 11개 공식 핸드북별 시상 시트 실시간 점수, 공동 석차, 메달 및 최고득점상 산출 엔진
 */
function getOfficial11Handbooks() {
  return [
    '행글라이더 1학년',
    '행글라이더 2학년',
    '윙러너 1학년',
    '윙러너 2학년',
    '스카이스토머 2학년',
    '어드밴처1권 3학년',
    '어드밴처1권 4학년',
    '어드밴처2권 4학년',
    '챌린지1권 5학년',
    '챌린지1권 6학년',
    '챌린지2권 6학년'
  ];
}

/**
 * [초고속 핀포인트 시상 갱신] 단 1개 타겟 핸드북만 초경량 연산 (0.2초 컷)
 */
function updateSingleHandbookAward(ss, targetHandbook) {
  if (!targetHandbook) return;
  const hbSheet = ss.getSheetByName(targetHandbook);
  if (!hbSheet || hbSheet.getLastRow() < 2) return;

  const finalSheet = ss.getSheetByName('최종집계');
  if (!finalSheet || finalSheet.getLastRow() < 2) return;

  const settingsSheet = ss.getSheetByName('설정') || ss.getSheetByName('대회설정');
  let goldRatio = 0.3;
  let silverRatio = 0.4;
  let bronzeRatio = 0.3;

  if (settingsSheet && settingsSheet.getLastRow() >= 2) {
    const sData = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getValues();
    sData.forEach(r => {
      const k = String(r[0] || '').trim();
      const v = Number(r[1]);
      if (k === '금메달_비율' && !isNaN(v)) goldRatio = v > 1 ? v / 100 : v;
      if (k === '은메달_비율' && !isNaN(v)) silverRatio = v > 1 ? v / 100 : v;
      if (k === '동메달_비율' && !isNaN(v)) bronzeRatio = v > 1 ? v / 100 : v;
    });
  }

  // 최종집계에서 해당 핸드북 학생 점수만 매핑
  const finalRows = finalSheet.getRange(2, 1, finalSheet.getLastRow() - 1, 13).getValues();
  const scoreMap = {};
  finalRows.forEach(r => {
    if (String(r[1] || '').trim() === targetHandbook) {
      const pid = String(r[0] || '').trim();
      if (pid) {
        scoreMap[pid] = {
          written: r[8] === '' ? '' : Number(r[8]),
          morning: r[9] === '' ? '' : Number(r[9]),
          afternoon: r[10] === '' ? '' : Number(r[10]),
          speed: r[11] === '' ? '' : Number(r[11]),
          total: r[12] === '' ? 0 : Number(r[12])
        };
      }
    }
  });

  const hbData = hbSheet.getRange(2, 1, hbSheet.getLastRow() - 1, 16).getValues();
  const students = [];

  hbData.forEach((row, idx) => {
    const pid = String(row[0] || '').trim();
    if (!pid) return;

    const sc = scoreMap[pid] || { written: '', morning: '', afternoon: '', speed: '', total: 0 };
    row[8] = sc.written;
    row[9] = sc.morning;
    row[10] = sc.afternoon;
    row[11] = sc.speed;
    row[12] = sc.total;

    const hasParticipated = (sc.written !== '' || sc.morning !== '' || sc.afternoon !== '' || sc.speed !== '');
    students.push({
      idx: idx,
      id: pid,
      total: sc.total,
      hasParticipated: hasParticipated
    });
  });

  const validStudents = students.filter(s => s.hasParticipated);
  validStudents.sort((a, b) => b.total - a.total);

  const N = validStudents.length;
  if (N === 0) {
    hbSheet.getRange(2, 1, hbData.length, 16).setValues(hbData);
    return;
  }

  let currentRank = 1;
  const maxScore = validStudents[0].total;

  for (let i = 0; i < N; i++) {
    if (i > 0 && validStudents[i].total < validStudents[i - 1].total) {
      currentRank = i + 1;
    }
    validStudents[i].rank = currentRank;
    validStudents[i].isTop = (validStudents[i].total === maxScore && maxScore > 0);
  }

  const targetGold = Math.max(1, Math.round(N * goldRatio));
  let goldCutScore = validStudents[Math.min(targetGold - 1, N - 1)].total;
  let goldCount = 0;
  validStudents.forEach(s => {
    if (s.total >= goldCutScore) {
      s.medal = '🥇 금메달';
      goldCount++;
    }
  });

  const targetSilver = Math.max(1, Math.round(N * silverRatio));
  const silverCutIndex = Math.min(goldCount + targetSilver - 1, N - 1);
  let silverCutScore = validStudents[silverCutIndex].total;
  let silverCount = 0;
  validStudents.forEach(s => {
    if (!s.medal && s.total >= silverCutScore) {
      s.medal = '🥈 은메달';
      silverCount++;
    }
  });

  validStudents.forEach(s => {
    if (!s.medal) {
      s.medal = '🥉 동메달';
    }
  });

  validStudents.forEach(s => {
    hbData[s.idx][13] = s.rank;
    hbData[s.idx][14] = s.medal || '';
    hbData[s.idx][15] = s.isTop ? '🏆 최고득점상' : '';
  });

  students.filter(s => !s.hasParticipated).forEach(s => {
    hbData[s.idx][13] = '';
    hbData[s.idx][14] = '';
    hbData[s.idx][15] = '';
  });

  hbSheet.getRange(2, 1, hbData.length, 16).setValues(hbData);
}

function updateHandBookAwards(ss) {
  const finalSheet = ss.getSheetByName('최종집계');
  if (!finalSheet || finalSheet.getLastRow() < 2) return;

  const settingsSheet = ss.getSheetByName('설정') || ss.getSheetByName('대회설정');
  let goldRatio = 0.3;
  let silverRatio = 0.4;
  let bronzeRatio = 0.3;

  if (settingsSheet && settingsSheet.getLastRow() >= 2) {
    const sData = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getValues();
    sData.forEach(r => {
      const k = String(r[0] || '').trim();
      const v = Number(r[1]);
      // 30(%), 40(%), 30(%) 정수 입력과 0.3, 0.4 소수점 입력 모두 지원
      if (k === '금메달_비율' && !isNaN(v)) goldRatio = v > 1 ? v / 100 : v;
      if (k === '은메달_비율' && !isNaN(v)) silverRatio = v > 1 ? v / 100 : v;
      if (k === '동메달_비율' && !isNaN(v)) bronzeRatio = v > 1 ? v / 100 : v;
    });
  }

  // 최종집계 전체 데이터 1회 읽기
  // 컬럼: ID(0), 핸드북(1), 교실(2), 학년(3), 조(4), 번호(5), 교회(6), 이름(7), 필기(8), 오전(9), 오후(10), 스피드(11), 총점(12)
  const finalRows = finalSheet.getRange(2, 1, finalSheet.getLastRow() - 1, 13).getValues();
  const scoreMap = {}; // ID -> { written, morning, afternoon, speed, total }
  finalRows.forEach(r => {
    const pid = String(r[0] || '').trim();
    if (pid) {
      scoreMap[pid] = {
        written: r[8] === '' ? '' : Number(r[8]),
        morning: r[9] === '' ? '' : Number(r[9]),
        afternoon: r[10] === '' ? '' : Number(r[10]),
        speed: r[11] === '' ? '' : Number(r[11]),
        total: r[12] === '' ? 0 : Number(r[12])
      };
    }
  });

  // 11개 핸드북 시트 각각 순회 갱신
  const officialHandbooks = getOfficial11Handbooks();
  officialHandbooks.forEach(hb => {
    const hbSheet = ss.getSheetByName(hb);
    if (!hbSheet || hbSheet.getLastRow() < 2) return;

    // 컬럼: ID(0), 핸드북(1), 교실(2), 학년(3), 조(4), 번호(5), 교회(6), 이름(7), 필기(8), 오전(9), 오후(10), 스피드(11), 총점(12), 석차(13), 메달(14), 최고득점상(15)
    const hbData = hbSheet.getRange(2, 1, hbSheet.getLastRow() - 1, 16).getValues();
    const students = [];

    hbData.forEach((row, idx) => {
      const pid = String(row[0] || '').trim();
      if (!pid) return;

      const sc = scoreMap[pid] || { written: '', morning: '', afternoon: '', speed: '', total: 0 };
      row[8] = sc.written;
      row[9] = sc.morning;
      row[10] = sc.afternoon;
      row[11] = sc.speed;
      row[12] = sc.total;

      const hasParticipated = (sc.written !== '' || sc.morning !== '' || sc.afternoon !== '' || sc.speed !== '');
      students.push({
        idx: idx,
        id: pid,
        total: sc.total,
        hasParticipated: hasParticipated
      });
    });

    // 1. 유효 참가자만 추출하여 총점 내림차순 정렬
    const validStudents = students.filter(s => s.hasParticipated);
    validStudents.sort((a, b) => b.total - a.total);

    const N = validStudents.length;
    if (N === 0) {
      hbSheet.getRange(2, 1, hbData.length, 16).setValues(hbData);
      return;
    }

    // 2. 공동 석차 (Standard Ranking: 1, 1, 3...) 및 최고득점상 계산
    let currentRank = 1;
    const maxScore = validStudents[0].total;

    for (let i = 0; i < N; i++) {
      if (i > 0 && validStudents[i].total < validStudents[i - 1].total) {
        currentRank = i + 1;
      }
      validStudents[i].rank = currentRank;
      validStudents[i].isTop = (validStudents[i].total === maxScore && maxScore > 0);
    }

    // 3. 메달 수여 및 동점자 컷오프 규칙 (금 30%, 은 40%, 동 30%)
    const targetGold = Math.max(1, Math.round(N * goldRatio));
    let goldCutScore = validStudents[Math.min(targetGold - 1, N - 1)].total;
    let goldCount = 0;
    validStudents.forEach(s => {
      if (s.total >= goldCutScore) {
        s.medal = '🥇 금메달';
        goldCount++;
      }
    });

    const targetSilver = Math.max(1, Math.round(N * silverRatio));
    const silverCutIndex = Math.min(goldCount + targetSilver - 1, N - 1);
    let silverCutScore = validStudents[silverCutIndex].total;
    let silverCount = 0;
    validStudents.forEach(s => {
      if (!s.medal && s.total >= silverCutScore) {
        s.medal = '🥈 은메달';
        silverCount++;
      }
    });

    validStudents.forEach(s => {
      if (!s.medal) {
        s.medal = '🥉 동메달';
      }
    });

    // 4. 원본 2차원 배열에 석차, 메달, 최고득점상 반영
    validStudents.forEach(s => {
      hbData[s.idx][13] = s.rank;
      hbData[s.idx][14] = s.medal || '';
      hbData[s.idx][15] = s.isTop ? '🏆 최고득점상' : '';
    });

    // 참가 기록 없는 학생 초기화
    students.filter(s => !s.hasParticipated).forEach(s => {
      hbData[s.idx][13] = '';
      hbData[s.idx][14] = '';
      hbData[s.idx][15] = '';
    });

    // 5. 시트에 단 1회의 setValues로 일괄 저장
    hbSheet.getRange(2, 1, hbData.length, 16).setValues(hbData);
  });
}

/**
 * =========================================================================
 * [소급 복구 함수] 기존 로그 시트(객관식/스피드/필기)의 점수를 최종집계 및 핸드북 시트로 즉시 소급 반영
 * =========================================================================
 * 관리자가 혹시 최종집계가 비어있던 시절에 입력했던 로그 데이터를 한 번에 복구할 때 사용합니다.
 */
function replayScoresFromLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const finalSheet = ss.getSheetByName('최종집계');
  if (!finalSheet) throw new Error("'최종집계' 시트를 찾을 수 없습니다.");

  // 1. 최종집계가 비어있다면 먼저 동기화
  if (finalSheet.getLastRow() < 2) {
    if (typeof syncFinalSummaryFromParticipants === 'function') {
      syncFinalSummaryFromParticipants(ss);
    }
  }

  const finalLastRow = finalSheet.getLastRow();
  if (finalLastRow < 2) {
    Logger.log("참가자 데이터가 없어 복구할 수 없습니다.");
    return;
  }

  // ID -> Row 맵 생성
  const idToRowMap = {};
  const idColumnValues = finalSheet.getRange(2, 1, finalLastRow - 1, 1).getValues();
  for (let i = 0; i < idColumnValues.length; i++) {
    const id = String(idColumnValues[i][0]).trim();
    if (id) idToRowMap[id] = i + 2;
  }

  // 필기(9), 객관오전(10), 객관오후(11), 스피드(12) 컬럼 메모리 로드
  const scoreMatrix = finalSheet.getRange(2, 9, finalLastRow - 1, 4).getValues();

  // 2. 객관식_로그 순회 (오전: 10열, 오후: 11열)
  const mLog = ss.getSheetByName('객관식_로그');
  if (mLog && mLog.getLastRow() >= 2) {
    // 컬럼: [0]시간, [1]세션, [2]교실, [3]교시, [4]핸드북, [5]조, [6]ID, [7]이름 ... [16]총점
    const mData = mLog.getRange(2, 1, mLog.getLastRow() - 1, 17).getValues();
    mData.forEach(r => {
      const session = String(r[1] || '').trim();
      const id = String(r[6] || '').trim();
      const score = Number(r[16]);
      const rowNum = idToRowMap[id];
      if (rowNum && (rowNum - 2) < scoreMatrix.length) {
        const colOffset = session === '오전' ? 1 : 2; // 1: 오전(10열), 2: 오후(11열)
        scoreMatrix[rowNum - 2][colOffset] = score;
      }
    });
  }

  // 3. 스피드_로그 순회 (스피드: 12열)
  const sLog = ss.getSheetByName('스피드_로그');
  if (sLog && sLog.getLastRow() >= 2) {
    // 컬럼: [0]시간, [1]교실, [2]교시, [3]핸드북, [4]조, [5]ID, [6]이름 ... [17]총점
    const sData = sLog.getRange(2, 1, sLog.getLastRow() - 1, 18).getValues();
    sData.forEach(r => {
      const id = String(r[5] || '').trim();
      const score = Number(r[17]);
      const rowNum = idToRowMap[id];
      if (rowNum && (rowNum - 2) < scoreMatrix.length) {
        scoreMatrix[rowNum - 2][3] = score; // 3: 스피드(12열)
      }
    });
  }

  // 4. 필기_로그 순회 (필기: 9열)
  const wLog = ss.getSheetByName('필기_로그');
  if (wLog && wLog.getLastRow() >= 2) {
    // 컬럼: [0]시간, [1]ID, [2]핸드북, [3]조, [4]이름, [5]점수
    const wData = wLog.getRange(2, 1, wLog.getLastRow() - 1, 6).getValues();
    wData.forEach(r => {
      const id = String(r[1] || '').trim();
      const score = Number(r[5]);
      const rowNum = idToRowMap[id];
      if (rowNum && (rowNum - 2) < scoreMatrix.length) {
        scoreMatrix[rowNum - 2][0] = score; // 0: 필기(9열)
      }
    });
  }

  // 5. 최종집계에 일괄 쓰기
  finalSheet.getRange(2, 9, scoreMatrix.length, 4).setValues(scoreMatrix);
  SpreadsheetApp.flush();

  // 6. 11개 핸드북 시상 시트 갱신
  updateHandBookAwards(ss);
  SpreadsheetApp.flush();

  Logger.log('🎉 [로그 소급 복구 완료] 기존 로그 시트의 점수가 최종집계 및 11개 핸드북 시트에 성공적으로 반영되었습니다.');
}


