/**
 * Awana 성경퀴즈대회 구글 스프레드시트 초기화 스크립트 (운영용 클린 버전)
 * 
 * [목적]: 실제 대회용 클린 초기화
 * - 7개 기본 시트 ('설정', '참가자명단', '시간표', '객관식_로그', '스피드_로그', '필기_로그', '최종집계')
 * - 11개 공식 핸드북별 시상 시트 (컬럼: 참가자ID, 핸드북, 교실, 학년, 조, 번호, 교회명, 이름, 필기, 객관(오전), 객관/스피드(오후), 최종총점, 석차, 메달, 최고득점상)
 * - 설정 시트: 메달 비율(금: 0.3, 은: 0.4, 동: 0.3), 스피드 룰(3, 3), 12개 교실별 4자리 PIN 관리
 * - 구글 시트 테이블 변환 및 1행 헤더 고정 호환 보장
 */

const OFFICIAL_11_HANDBOOKS = [
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
        ['CODE_스팍스1', 'SP01', '스팍스1 교실 접속 코드 (URL 파라미터 ?code=SP01 또는 팝업 입력)'],
        ['CODE_스팍스2', 'SP02', '스팍스2 교실 접속 코드'],
        ['CODE_스팍스3', 'SP03', '스팍스3 교실 접속 코드'],
        ['CODE_스팍스4', 'SP04', '스팍스4 교실 접속 코드'],
        ['CODE_스팍스5', 'SP05', '스팍스5 교실 접속 코드'],
        ['CODE_티앤티1', 'TT01', '티앤티1 교실 접속 코드 (URL 파라미터 ?code=TT01 또는 팝업 입력)'],
        ['CODE_티앤티2', 'TT02', '티앤티2 교실 접속 코드'],
        ['CODE_티앤티3', 'TT03', '티앤티3 교실 접속 코드'],
        ['CODE_티앤티4', 'TT04', '티앤티4 교실 접속 코드'],
        ['CODE_티앤티5', 'TT05', '티앤티5 교실 접속 코드'],
        ['CODE_티앤티6', 'TT06', '티앤티6 교실 접속 코드'],
        ['CODE_티앤티7', 'TT07', '티앤티7 교실 접속 코드']
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
      headers: ['참가자ID', '핸드북', '학년', '조', '번호', '교회명', '이름', '필기점수', '객관식(오전)', '객관식(오후)', '스피드(오후)', '최종총점'],
      initialData: []
    }
  ];

  // 11개 공식 핸드북별 시상 시트 정의 추가
  const awardHeaders = [
    '참가자ID', '핸드북', '교실', '학년', '조', '번호', '교회명', '이름',
    '필기점수', '객관식(오전)', '객관식(오후)', '스피드(오후)', '최종총점', '석차', '메달', '최고득점상'
  ];

  OFFICIAL_11_HANDBOOKS.forEach(hb => {
    sheetDefinitions.push({
      name: hb,
      headers: awardHeaders,
      initialData: []
    });
  });

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
  Logger.log('✅ [운영용 초기화 완료] 기본 7개 시트 및 11개 공식 핸드북 시상 시트가 준비되었습니다.');
}

/**
 * 참가자명단과 시간표를 기반으로 최종집계 및 11개 핸드북별 시상 시트 초기 연동
 */
function syncFinalSummaryFromParticipants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

  // 2. 최종집계 시트 동기화
  if (fSheet.getLastRow() >= 2) {
    fSheet.getRange(2, 1, fSheet.getLastRow() - 1, 12).clearContent();
  }

  const participants = pSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const summaryRows = participants.map((p, index) => {
    const rowNum = index + 2;
    return [
      p[0], p[1], p[2], p[3], p[4], p[5], p[6],
      '', '', '', '',
      '=SUM(H' + rowNum + ':K' + rowNum + ')'
    ];
  });

  const chunkSize = 500;
  for (let i = 0; i < summaryRows.length; i += chunkSize) {
    const slice = summaryRows.slice(i, i + chunkSize);
    fSheet.getRange(i + 2, 1, slice.length, 12).setValues(slice);
  }

  fSheet.getRange(2, 1, summaryRows.length, 5).setHorizontalAlignment('center');
  fSheet.getRange(2, 8, summaryRows.length, 5).setHorizontalAlignment('right');

  // 3. 11개 공식 핸드북별 시상 시트 동기화
  OFFICIAL_11_HANDBOOKS.forEach(hb => {
    const hbSheet = ss.getSheetByName(hb);
    if (!hbSheet) return;

    if (hbSheet.getLastRow() >= 2) {
      hbSheet.getRange(2, 1, hbSheet.getLastRow() - 1, 16).clearContent();
    }

    const hbRows = [];
    participants.forEach(p => {
      if (String(p[1]).trim() === hb) {
        const teamKey = hb + '_' + Number(p[3]);
        const roomName = teamRoomMap[teamKey] || '';
        // 컬럼: ID, 핸드북, 교실, 학년, 조, 번호, 교회, 이름, 필기, 객관오전, 객관오후, 스피드, 총점, 석차, 메달, 최고득점상
        hbRows.push([
          p[0], p[1], roomName, p[2], p[3], p[4], p[5], p[6],
          '', '', '', '', 0, '', '', ''
        ]);
      }
    });

    if (hbRows.length > 0) {
      hbSheet.getRange(2, 1, hbRows.length, 16).setValues(hbRows);
      hbSheet.getRange(2, 1, hbRows.length, 6).setHorizontalAlignment('center');
      hbSheet.getRange(2, 9, hbRows.length, 8).setHorizontalAlignment('center');
    }
  });

  SpreadsheetApp.flush();
  Logger.log('✅ [동기화 완료] 1376명 단원이 최종집계 및 11개 공식 핸드북 시상 시트에 정상 반영되었습니다.');
}
