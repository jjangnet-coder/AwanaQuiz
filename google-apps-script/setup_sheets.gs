/**
 * Awana 성경퀴즈대회 구글 스프레드시트 초기화 스크립트 (운영용 클린 버전)
 * 
 * [목적]: 실제 대회용 클린 초기화
 * - 7개 기본 시트 ('설정', '참가자명단', '시간표', '객관식_로그', '스피드_로그', '필기_로그', '최종집계')
 * - 설정 시트: 메달 비율(금: 0.3, 은: 0.4, 동: 0.3), 스피드 룰(3, 3), 12개 교실별 4자리 PIN 관리
 * - 구글 시트 테이블 변환 및 1행 헤더 고정 호환 보장
 */

function setupAwanaSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetDefinitions = [
    {
      name: '설정',
      headers: ['키', '값', '설명'],
      initialData: [
        ['스피드_최대정답수', 3, '스피드 퀴즈 만점 완료 기준'],
        ['스피드_최대오답수', 3, '스피드 퀴즈 도전 완료 기준'],
        ['금메달_비율', 30, '금메달 수여 비율 (30%)'],
        ['은메달_비율', 40, '은메달 수여 비율 (40%)'],
        ['동메달_비율', 30, '동메달 수여 비율 (30%)'],
        ['CODE_스팍스1', 'SP01', '스팍스1 교실 접속 코드'],
        ['CODE_스팍스2', 'SP02', '스팍스2 교실 접속 코드'],
        ['CODE_스팍스3', 'SP03', '스팍스3 교실 접속 코드'],
        ['CODE_스팍스4', 'SP04', '스팍스4 교실 접속 코드'],
        ['CODE_스팍스5', 'SP05', '스팍스5 교실 접속 코드'],
        ['CODE_티앤티1', 'TT01', '티앤티1 교실 접속 코드'],
        ['CODE_티앤티2', 'TT02', '티앤티2 교실 접속 코드'],
        ['CODE_티앤티3', 'TT03', '티앤티3 교실 접속 코드'],
        ['CODE_티앤티4', 'TT04', '티앤티4 교실 접속 코드'],
        ['CODE_티앤티5', 'TT05', '티앤티5 교실 접속 코드'],
        ['CODE_티앤티6', 'TT06', '티앤티6 교실 접속 코드'],
        ['CODE_티앤티7', 'TT07', '티앤티7 교실 접속 코드'],
        ['ADMIN_PIN', 'AWANA2026', '본부 관리 포털(admin/index.html) 접속 비밀번호'],
        ['대회제목', '2026 AWANA 성경퀴즈대회', '상단 헤더 및 엑셀 파일명에 표시될 대회 제목']
      ]
    },
    {
      name: '참가자명단',
      headers: ['참가자ID', '핸드북', '학년', '조', '번호', '교회명', '이름'],
      initialData: []
    },
    {
      name: '시간표',
      headers: ['교실명', '교시', '핸드북', '조'],
      initialData: []
    },
    {
      name: '객관식_로그',
      headers: ['입력시간', '세션', '교실명', '교시', '핸드북', '조', '참가자ID', '이름', '1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '총점', '기록관명'],
      initialData: []
    },
    {
      name: '스피드_로그',
      headers: ['입력시간', '교실명', '교시', '핸드북', '조', '참가자ID', '이름', '1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번', '10번', '총점', '기록관명'],
      initialData: []
    },
    {
      name: '필기_로그',
      headers: ['입력시간', '참가자ID', '핸드북', '조', '이름', '필기점수', '본부입력자'],
      initialData: []
    },
    {
      name: '최종집계',
      headers: ['참가자ID', '핸드북', '교실', '학년', '조', '번호', '교회명', '이름', '필기점수', '객관식(오전)', '객관식(오후)', '스피드(오후)', '최종총점'],
      initialData: []
    }
  ];

  const existingSheets = {};
  const currentSheets = ss.getSheets();
  for (let i = 0; i < currentSheets.length; i++) {
    existingSheets[currentSheets[i].getName()] = currentSheets[i];
  }

  sheetDefinitions.forEach(def => {
    let sheet = existingSheets[def.name];
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      existingSheets[def.name] = sheet;
    } else {
      sheet.clear();
    }

    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    sheet.getRange(1, 1, 1, def.headers.length)
      .setFontWeight('bold')
      .setBackground('#EFEFEF')
      .setHorizontalAlignment('center');
    
    sheet.setFrozenRows(1);

    if (def.initialData && def.initialData.length > 0) {
      sheet.getRange(2, 1, def.initialData.length, def.headers.length).setValues(def.initialData);
    }
  });

  SpreadsheetApp.flush();
  reorderAwanaSheets(ss);   // 7개 기본 시트 공식 순서 자동 재배치

  // 기존에 남아 있는 11개 핸드북 시트 자동 삭제
  const legacyHandbookSheets = [
    '행글라이더 1학년', '행글라이더 2학년', '윙러너 1학년', '윙러너 2학년', '스카이스토머 2학년',
    '어드밴처1권 3학년', '어드밴처1권 4학년', '어드밴처2권 4학년',
    '챌린지1권 5학년', '챌린지1권 6학년', '챌린지2권 6학년'
  ];
  legacyHandbookSheets.forEach(name => {
    const legacySheet = ss.getSheetByName(name);
    if (legacySheet && ss.getSheets().length > 1) {
      ss.deleteSheet(legacySheet);
    }
  });
  syncFinalSummaryFromParticipants(ss); // 참가자명단 데이터를 최종집계 시트에 자동 배치
  formatAllSheetsNicely(); // 7개 기본 시트 전체 열너비/정렬 전수 표준화 적용
  Logger.log('✅ [운영용 초기화 완료] 기본 7개 시트가 준비되었으며 명단 동기화가 완료되었습니다.');
}

/**
 * 기존 데이터를 건드리지 않고 시트 탭 순서만 즉시 공식 규격대로 정렬하는 단독 실행 함수
 */
function reorderSheetsOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  reorderAwanaSheets(ss);
  SpreadsheetApp.flush();
  Logger.log('🎉 [탭 순서 정렬 완료] 7개 기본 시트 탭이 공식 순서대로 재배치되었습니다.');
}

/**
 * 7개 전체 시트 탭을 사용자가 지정한 공식 순서대로 물리적 위치 재배치
 * 순서: 설정 -> 참가자명단 -> 시간표 -> 객관식_로그 -> 스피드_로그 -> 필기_로그 -> 최종집계
 */
function reorderAwanaSheets(ss) {
  const desiredOrder = [
    '설정',
    '참가자명단',
    '시간표',
    '객관식_로그',
    '스피드_로그',
    '필기_로그',
    '최종집계'
  ];

  let currentPosition = 1;
  desiredOrder.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(currentPosition);
      currentPosition++;
    }
  });

  // 정렬 후 첫 번째 '설정' 시트를 활성화
  const firstSheet = ss.getSheetByName('설정');
  if (firstSheet) {
    ss.setActiveSheet(firstSheet);
  }
}

/**
 * 참가자명단과 시간표를 기반으로 최종집계 시트 초기 연동
 */
function syncFinalSummaryFromParticipants(optionalSs) {
  const ss = optionalSs || SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName('참가자명단');
  const fSheet = ss.getSheetByName('최종집계');
  const tSheet = ss.getSheetByName('시간표') || ss.getSheetByName('교실순환시간표');

  if (!pSheet || !fSheet) {
    Logger.log("⚠️ '참가자명단' 또는 '최종집계' 시트가 없습니다.");
    return;
  }

  const lastRow = pSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("⚠️ '참가자명단'에 데이터가 없습니다.");
    return;
  }

  // 1. 시간표 기반 [핸드북_조 -> 교실명] 맵 생성
  const teamRoomMap = {};
  if (tSheet && tSheet.getLastRow() >= 2) {
    const tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 4).getValues();
    tData.forEach(row => {
      const room = String(row[0]).trim();
      const hb = String(row[2]).trim();
      const team = Number(row[3]);
      const key = hb + '_' + team;
      if (!teamRoomMap[key]) teamRoomMap[key] = room;
    });
  }

  // 2. 최종집계 시트 동기화 (C열에 교실명 배치, 총 13개 열)
  if (fSheet.getLastRow() >= 2) {
    fSheet.getRange(2, 1, fSheet.getLastRow() - 1, 13).clearContent();
  }

  const participants = pSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const summaryRows = participants.map((p, index) => {
    const rowNum = index + 2;
    const hb = String(p[1]).trim();
    const team = Number(p[3]);
    const roomName = teamRoomMap[hb + '_' + team] || '';
    // 컬럼: ID, 핸드북, 교실, 학년, 조, 번호, 교회, 이름, 필기(I), 객관오전(J), 객관오후(K), 스피드(L), 최종총점(M)
    return [
      p[0], p[1], roomName, p[2], p[3], p[4], p[5], p[6],
      '', '', '', '',
      '=SUM(I' + rowNum + ':L' + rowNum + ')'
    ];
  });

  const chunkSize = 500;
  for (let i = 0; i < summaryRows.length; i += chunkSize) {
    const slice = summaryRows.slice(i, i + chunkSize);
    fSheet.getRange(i + 2, 1, slice.length, 13).setValues(slice);
  }

  fSheet.getRange(2, 1, summaryRows.length, 6).setHorizontalAlignment('center');
  fSheet.getRange(2, 9, summaryRows.length, 5).setHorizontalAlignment('right');

  SpreadsheetApp.flush();
  formatAllSheetsNicely(); // 7개 기본 시트 전체 열너비/정렬 전수 표준화 적용
  Logger.log(`✅ [동기화 완료] ${summaryRows.length}명 단원이 최종집계 시트에 정상 반영되었습니다.`);
}

/**
 * =========================================================================
 * 7개 기본 시트 탭의 모든 열 너비(px) 및 수평 정렬 전수 표준화 함수
 * =========================================================================
 */
function formatAllSheetsNicely() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. '설정' (A: 160px, B: 260px, C: 320px)
  const sSheet = ss.getSheetByName('설정') || ss.getSheetByName('대회설정');
  if (sSheet) {
    sSheet.setColumnWidth(1, 160);
    sSheet.setColumnWidth(2, 260);
    sSheet.setColumnWidth(3, 320);
    if (sSheet.getLastRow() >= 1) {
      sSheet.getRange(1, 1, sSheet.getLastRow(), 2).setHorizontalAlignment('center');
      sSheet.getRange(1, 3, sSheet.getLastRow(), 1).setHorizontalAlignment('left');
      sSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#F1F5F9');
    }
  }

  // 2. '참가자명단' (ID:95, 핸드북:140, 학년:65, 조:60, 번호:60, 교회명:160, 이름:90)
  const pSheet = ss.getSheetByName('참가자명단');
  if (pSheet) {
    const widths = [95, 140, 65, 60, 60, 160, 90];
    widths.forEach((w, i) => pSheet.setColumnWidth(i + 1, w));
    if (pSheet.getLastRow() >= 1) {
      pSheet.getRange(1, 1, pSheet.getLastRow(), 7).setHorizontalAlignment('center');
      pSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#F1F5F9');
    }
  }

  // 3. '시간표' (교실:95, 교시:65, 핸드북:140, 조:60)
  const tSheet = ss.getSheetByName('시간표') || ss.getSheetByName('교실순환시간표');
  if (tSheet) {
    const widths = [95, 65, 140, 60];
    widths.forEach((w, i) => tSheet.setColumnWidth(i + 1, w));
    if (tSheet.getLastRow() >= 1) {
      tSheet.getRange(1, 1, tSheet.getLastRow(), 4).setHorizontalAlignment('center');
      tSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#F1F5F9');
    }
  }

  // 4. '객관식_로그' (입력시간:165, 세션:75, 교실:85, 교시:60, 핸드북:140, 조:55, ID:90, 이름:85, 1~8번:48, 총점:80, 기록관:95)
  const mLog = ss.getSheetByName('객관식_로그');
  if (mLog) {
    const widths = [165, 75, 85, 60, 140, 55, 90, 85, 48, 48, 48, 48, 48, 48, 48, 48, 80, 95];
    widths.forEach((w, i) => mLog.setColumnWidth(i + 1, w));
    if (mLog.getLastRow() >= 1) {
      mLog.getRange(1, 1, mLog.getLastRow(), 16).setHorizontalAlignment('center');
      mLog.getRange(1, 17, mLog.getLastRow(), 1).setHorizontalAlignment('right'); // 총점
      mLog.getRange(1, 18, mLog.getLastRow(), 1).setHorizontalAlignment('center'); // 기록관
      mLog.getRange(1, 1, 1, 18).setFontWeight('bold').setBackground('#F1F5F9');
    }
  }

  // 5. '스피드_로그' (입력시간:165, 교실:85, 교시:60, 핸드북:140, 조:55, ID:90, 이름:85, 1~10번:45, 총점:80, 기록관:95)
  const sLog = ss.getSheetByName('스피드_로그');
  if (sLog) {
    const widths = [165, 85, 60, 140, 55, 90, 85, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 80, 95];
    widths.forEach((w, i) => sLog.setColumnWidth(i + 1, w));
    if (sLog.getLastRow() >= 1) {
      sLog.getRange(1, 1, sLog.getLastRow(), 17).setHorizontalAlignment('center');
      sLog.getRange(1, 18, sLog.getLastRow(), 1).setHorizontalAlignment('right'); // 총점
      sLog.getRange(1, 19, sLog.getLastRow(), 1).setHorizontalAlignment('center'); // 기록관
      sLog.getRange(1, 1, 1, 19).setFontWeight('bold').setBackground('#F1F5F9');
    }
  }

  // 6. '필기_로그' (입력시간:165, ID:90, 핸드북:140, 조:55, 이름:85, 점수:85, 입력자:100)
  const wLog = ss.getSheetByName('필기_로그');
  if (wLog) {
    const widths = [165, 90, 140, 55, 85, 85, 100];
    widths.forEach((w, i) => wLog.setColumnWidth(i + 1, w));
    if (wLog.getLastRow() >= 1) {
      wLog.getRange(1, 1, wLog.getLastRow(), 5).setHorizontalAlignment('center');
      wLog.getRange(1, 6, wLog.getLastRow(), 1).setHorizontalAlignment('right'); // 점수
      wLog.getRange(1, 7, wLog.getLastRow(), 1).setHorizontalAlignment('center'); // 입력자
      wLog.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#F1F5F9');
    }
  }

  // 7. '최종집계' (ID:90, 핸드북:140, 교실:85, 학년:60, 조:55, 번호:55, 교회명:160, 이름:90, 필기:80, 오전:95, 오후:95, 스피드:95, 총점:100)
  const fSheet = ss.getSheetByName('최종집계');
  if (fSheet) {
    const widths = [90, 140, 85, 60, 55, 55, 160, 90, 80, 95, 95, 95, 100];
    widths.forEach((w, i) => fSheet.setColumnWidth(i + 1, w));
    if (fSheet.getLastRow() >= 1) {
      fSheet.getRange(1, 1, fSheet.getLastRow(), 8).setHorizontalAlignment('center');
      fSheet.getRange(1, 9, fSheet.getLastRow(), 5).setHorizontalAlignment('right'); // 점수 컬럼들
      fSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#F1F5F9');
      if (fSheet.getLastRow() >= 2) {
        fSheet.getRange(2, 13, fSheet.getLastRow() - 1, 1).setFontWeight('bold'); // 최종총점 강조
      }
    }
  }



  SpreadsheetApp.flush();
  Logger.log('🎉 [서식 표준화 완료] 7개 기본 시트의 열 너비 및 정렬이 완벽하게 정리되었습니다.');
}
