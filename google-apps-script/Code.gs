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

    // 1. 설정 시트 읽기 (설정 또는 대회설정 호환)
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

    // 2. 참가자명단 시트 읽기
    // 컬럼: 참가자ID(0) | 핸드북(1) | 학년(2) | 조(3) | 번호(4) | 교회명(5) | 이름(6)
    const pSheet = ss.getSheetByName('참가자명단');
    const participants = [];
    if (pSheet && pSheet.getLastRow() >= 2) {
      const pData = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, 7).getValues();
      pData.forEach(row => {
        if (row[0]) {
          participants.push({
            id: String(row[0]).trim(),
            handbook: String(row[1]).trim(),
            grade: Number(row[2]),
            team: Number(row[3]),
            num: Number(row[4]),
            church: String(row[5]).trim(),
            name: String(row[6]).trim()
          });
        }
      });
    }

    // 3. 시간표 시트 읽기 (시간표 또는 교실순환시간표 호환)
    // 컬럼: 교실명(0) | 교시(1) | 핸드북(2) | 조(3)
    const tSheet = ss.getSheetByName('시간표') || ss.getSheetByName('교실순환시간표');
    const timetable = [];
    if (tSheet && tSheet.getLastRow() >= 2) {
      const tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 4).getValues();
      tData.forEach(row => {
        if (row[0]) {
          timetable.push({
            room: String(row[0]).trim(),
            period: Number(row[1]),
            handbook: String(row[2]).trim(),
            team: Number(row[3])
          });
        }
      });
    }

    // 4. 최종집계 시트 점수 현황 읽기
    // 컬럼: 참가자ID(0) | 핸드북(1) | 학년(2) | 조(3) | 번호(4) | 교회명(5) | 이름(6) | 필기점수(7) | 객관식(오전)(8) | 객관식(오후)(9) | 스피드(오후)(10) | 최종총점(11)
    const fSheet = ss.getSheetByName('최종집계');
    const scores = {};
    if (fSheet && fSheet.getLastRow() >= 2) {
      const fData = fSheet.getRange(2, 1, fSheet.getLastRow() - 1, 12).getValues();
      fData.forEach(row => {
        const pid = String(row[0]).trim();
        if (pid) {
          scores[pid] = {
            written: row[7] === '' ? null : Number(row[7]),
            multipleMorning: row[8] === '' ? null : Number(row[8]),
            multipleAfternoon: row[9] === '' ? null : Number(row[9]),
            speedAfternoon: row[10] === '' ? null : Number(row[10]),
            total: row[11] === '' ? null : Number(row[11])
          };
        }
      });
    }

    const response = {
      status: 'success',
      data: {
        settings: settings,
        participants: participants,
        timetable: timetable,
        scores: scores
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
    const finalLastRow = finalSheet.getLastRow();
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
      const scoreColIndex = payload.session === '오전' ? 9 : 10; // 9열: '객관식(오전)', 10열: '객관식(오후)'

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
      const scoreColIndex = 11; // 11열: '스피드(오후)'

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
      const scoreColIndex = 8; // 8열: '필기점수'

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

