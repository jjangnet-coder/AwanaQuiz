/**
 * Awana 성경퀴즈대회 구글 스프레드시트 초기화 스크립트
 * 
 * 스프레드시트의 '확장 프로그램' > 'Apps Script'에 붙여넣고
 * setupAwanaSheets() 함수를 1회 실행하면 7개 시트 탭과 1행 헤더,
 * 기본 설정값 및 더미 테스트 데이터가 자동으로 구성됩니다.
 */

function setupAwanaSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 시트 탭 목록 및 헤더 정의
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
      initialData: generateDummyParticipants()
    },
    {
      name: '시간표',
      headers: ['교실명', '교시', '핸드북', '조'],
      initialData: generateDummyTimetable()
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

  // 2. 시트 생성 및 서식 지정
  sheetDefinitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    } else {
      sheet.clear();
    }

    // 1행 헤더 작성
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    sheet.getRange(1, 1, 1, def.headers.length)
      .setFontWeight('bold')
      .setBackground('#EFEFEF')
      .setHorizontalAlignment('center');
    
    // 행 고정
    sheet.setFrozenRows(1);

    // 초기 데이터 입력
    if (def.initialData && def.initialData.length > 0) {
      sheet.getRange(2, 1, def.initialData.length, def.headers.length).setValues(def.initialData);
    }
  });

  // 3. '최종집계' 시트에 '참가자명단' 기반 초기 데이터 채우기 (필기/객관식/스피드 점수 공란, 최종총점은 =SUM(H2:K2) 수식 적용)
  populateFinalSummarySheet(ss);

  // 불필요한 기본 시트(예: Sheet1, 시트1)가 비어있다면 삭제
  const defaultSheets = ['시트1', 'Sheet1'];
  defaultSheets.forEach(name => {
    const defaultSheet = ss.getSheetByName(name);
    if (defaultSheet && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (e) {
        // 무시
      }
    }
  });

  SpreadsheetApp.flush();
  Logger.log('✅ Awana 성경퀴즈대회 시트 초기화가 완료되었습니다.');
}

/**
 * '참가자명단' 데이터를 바탕으로 '최종집계' 시트를 초기화합니다.
 * H(8)~K(11) 점수는 비워두고, L(12)열은 =SUM(H2:K2) 수식을 작성합니다.
 */
function populateFinalSummarySheet(ss) {
  const pSheet = ss.getSheetByName('참가자명단');
  const fSheet = ss.getSheetByName('최종집계');
  if (!pSheet || !fSheet) return;

  const lastRow = pSheet.getLastRow();
  if (lastRow < 2) return;

  const participants = pSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const summaryRows = participants.map((p, index) => {
    const rowNum = index + 2;
    return [
      p[0], // 참가자ID
      p[1], // 핸드북
      p[2], // 학년 (숫자)
      p[3], // 조 (숫자)
      p[4], // 번호 (숫자)
      p[5], // 교회명
      p[6], // 이름
      '',   // 필기점수
      '',   // 객관식(오전)
      '',   // 객관식(오후)
      '',   // 스피드(오후)
      `=SUM(H${rowNum}:K${rowNum})` // 최종총점 수식
    ];
  });

  fSheet.getRange(2, 1, summaryRows.length, 12).setValues(summaryRows);
  fSheet.getRange(2, 1, summaryRows.length, 5).setHorizontalAlignment('center');
  fSheet.getRange(2, 8, summaryRows.length, 5).setHorizontalAlignment('right');
}

/**
 * 11개 공식 핸드북별 더미 참가자 데이터 생성
 * SPARKS: 행글라이더 1학년, 행글라이더 2학년, 윙러너 1학년, 윙러너 2학년, 스카이스토머 2학년
 * T&T: 어드밴처1권 3학년, 어드밴처1권 4학년, 어드밴처2권 4학년, 챌린지1권 5학년, 챌린지1권 6학년, 챌린지2권 6학년
 */
function generateDummyParticipants() {
  const dummyConfigs = [
    // [핸드북명, 학년(숫자), 조(숫자), 인원수]
    ['행글라이더 1학년', 1, 1, 10],
    ['행글라이더 2학년', 2, 1, 10],
    ['윙러너 1학년', 1, 1, 10],
    ['윙러너 2학년', 2, 1, 10],
    ['스카이스토머 2학년', 2, 1, 10],
    ['어드밴처1권 3학년', 3, 1, 12],
    ['어드밴처1권 4학년', 4, 1, 12],
    ['어드밴처2권 4학년', 4, 1, 12],
    ['챌린지1권 5학년', 5, 1, 12],
    ['챌린지1권 6학년', 6, 1, 12],
    ['챌린지2권 6학년', 6, 1, 12]
  ];

  const churches = ['서울중앙교회', '빛과소금교회', '은혜교회', '소망교회', '사랑의교회', '분당우리교회'];
  const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '신'];
  const lastNames = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '서아', '하윤', '지우', '서윤', '지유'];

  const rows = [];
  let idCounter = 1;

  dummyConfigs.forEach(cfg => {
    const handbook = cfg[0];
    const grade = cfg[1];
    const team = cfg[2];
    const count = cfg[3];

    for (let i = 1; i <= count; i++) {
      const pid = 'P' + String(idCounter).padStart(4, '0');
      const church = churches[(idCounter - 1) % churches.length];
      const name = firstNames[(idCounter - 1) % firstNames.length] + lastNames[(i - 1) % lastNames.length];
      rows.push([pid, handbook, grade, team, i, church, name]);
      idCounter++;
    }
  });

  return rows;
}

/**
 * 12개 교실(스팍스1~5, 티앤티1~7) 및 1~7교시 매핑 더미 시간표 데이터 생성
 */
function generateDummyTimetable() {
  const timetable = [
    // 스팍스 교실 (스팍스1 ~ 스팍스5)
    ['스팍스1', 1, '행글라이더 1학년', 1],
    ['스팍스1', 2, '행글라이더 1학년', 1],
    ['스팍스2', 1, '행글라이더 2학년', 1],
    ['스팍스2', 2, '행글라이더 2학년', 1],
    ['스팍스3', 1, '윙러너 1학년', 1],
    ['스팍스3', 2, '윙러너 1학년', 1],
    ['스팍스4', 1, '윙러너 2학년', 1],
    ['스팍스4', 2, '윙러너 2학년', 1],
    ['스팍스5', 1, '스카이스토머 2학년', 1],
    ['스팍스5', 2, '스카이스토머 2학년', 1],

    // 티앤티 교실 (티앤티1 ~ 티앤티7)
    ['티앤티1', 1, '어드밴처1권 3학년', 1],
    ['티앤티1', 2, '어드밴처1권 3학년', 1],
    ['티앤티2', 1, '어드밴처1권 4학년', 1],
    ['티앤티2', 2, '어드밴처1권 4학년', 1],
    ['티앤티3', 1, '어드밴처2권 4학년', 1],
    ['티앤티3', 2, '어드밴처2권 4학년', 1],
    ['티앤티4', 1, '챌린지1권 5학년', 1],
    ['티앤티4', 2, '챌린지1권 5학년', 1],
    ['티앤티5', 1, '챌린지1권 6학년', 1],
    ['티앤티5', 2, '챌린지1권 6학년', 1],
    ['티앤티6', 1, '챌린지2권 6학년', 1],
    ['티앤티6', 2, '챌린지2권 6학년', 1],
    ['티앤티7', 1, '어드밴처1권 3학년', 1],
    ['티앤티7', 2, '어드밴처1권 3학년', 1]
  ];

  return timetable;
}

