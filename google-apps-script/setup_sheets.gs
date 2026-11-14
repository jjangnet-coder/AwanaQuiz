/**
 * Awana 성경퀴즈대회 구글 스프레드시트 초기화 스크립트 (운영용 클린 버전)
 * 
 * [목적]: 실제 대회용 클린 초기화
 * - 7개 시트 탭('설정', '참가자명단', '시간표', '객관식_로그', '스피드_로그', '필기_로그', '최종집계') 생성
 * - 1행 헤더 서식 및 행 고정 설정
 * - 기본 '설정' 값(스피드_최대정답수: 3, 스피드_최대오답수: 3) 세팅
 * - 기존 데이터가 있다면 2행 이하의 모든 데이터를 깨끗이 초기화(삭제)
 */

function setupAwanaSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetDefinitions = [
    {
      name: '설정',
      headers: ['키', '값'],
      initialData: [
        ['스피드_최대정답수', 3],
        ['스피드_최대오답수', 3]
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

  // 기존 시트들을 맵으로 미리 확보 (인덱스 탐색 에러 원천 방지)
  const existingSheets = {};
  const currentSheets = ss.getSheets();
  for (let i = 0; i < currentSheets.length; i++) {
    existingSheets[currentSheets[i].getName()] = currentSheets[i];
  }

  // 7개 필수 시트 순차 생성 및 포맷 세팅
  sheetDefinitions.forEach(def => {
    let sheet = existingSheets[def.name];
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      existingSheets[def.name] = sheet;
    } else {
      sheet.clear();
    }

    // 1행 헤더 작성
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

  // 7개 시트 외의 불필요한 시트 삭제
  const keepNames = {'설정': true, '참가자명단': true, '시간표': true, '객관식_로그': true, '스피드_로그': true, '필기_로그': true, '최종집계': true};
  const sheetsToInspect = ss.getSheets();
  for (let i = 0; i < sheetsToInspect.length; i++) {
    const s = sheetsToInspect[i];
    if (!keepNames[s.getName()] && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(s);
      } catch (e) {}
    }
  }

  SpreadsheetApp.flush();
  Logger.log('✅ [운영용 초기화 완료] 7개 시트 탭이 깨끗하게 준비되었습니다.');
}

function syncFinalSummaryFromParticipants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName('참가자명단');
  const fSheet = ss.getSheetByName('최종집계');

  if (!pSheet || !fSheet) {
    Logger.log("⚠️ '참가자명단' 또는 '최종집계' 시트가 없습니다.");
    return;
  }

  const lastRow = pSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("⚠️ '참가자명단'에 데이터가 없습니다.");
    return;
  }

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

  SpreadsheetApp.flush();
  Logger.log('✅ [동기화 완료] 총 ' + summaryRows.length + '명의 선수가 최종집계 시트에 반영되었습니다.');
}
