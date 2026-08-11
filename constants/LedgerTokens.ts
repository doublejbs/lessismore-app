import { StyleSheet } from 'react-native';

/**
 * Ledger — 장비 원장 디자인 시스템.
 *
 * 지면은 **흰 종이 하나**다. 유리·베일·라디얼 글로우·장식 그라디언트를 쓰지 않는다.
 * 구분은 `spacing → type → alignment → hairline` 순서로만 낸다 — 값을 카드로 감싸지 않고,
 * 목록은 카드가 아니라 **행**이며 행 사이는 헤어라인 하나다.
 *
 * `constants/DesignTokens.ts`의 `Liquid*` 그룹은 **그대로 둔다** — 아직 이식하지 않은
 * 나머지 화면이 쓴다. 한 화면 안에서 두 세대를 섞지는 않는다.
 *
 * 현재 이 파일을 쓰는 화면: 창고(`components/warehouse/`)뿐이다.
 */

/**
 * 4의 배수 계단 하나. 여백은 이 값들만 쓴다 — 임의값을 섞으면 "여백이 구분을 만든다"는
 * 이 시스템의 전제가 무너진다(같은 위계가 화면마다 3·5·6으로 갈린다).
 */
export const LedgerSpace = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * 모서리는 네 값뿐이다. **행·목록에는 쓰지 않는다** — 원장의 행은 카드가 아니라 줄이라
 * 모서리를 깎을 면이 없다. `full`은 알약이 아니라 원(아바타·점 지표)용이다.
 */
export const LedgerRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 999,
} as const;

/**
 * 잉크 스케일 하나 + 액센트 하나.
 *
 * 면은 `page`(종이)와 `raised`(꼭 필요한 최소한: 표 머리·입력) 둘뿐이고, 위계는 색이 아니라
 * **잉크 명도**가 낸다. 액센트(라임)는 **주 액션에 쓰지 않는다** — 선택 상태·활성 지표
 * 전용이다. 주 액션은 잉크 면이 든다.
 */
export const LedgerColor = {
  page: '#FFFFFF', // 지면. 종이 하나
  raised: '#F7F7F7', // 면 차이가 꼭 필요한 최소한(표 머리·입력)
  ink: '#111111',
  inkSecondary: '#4A4A4A', // 보조 본문
  inkTertiary: '#6E6E6E', // 메타 (흰 면 위 AA 4.9)
  inkQuiet: '#8E8E8E', // 12px 이상 비활성·플레이스홀더만
  line: '#E6E6E6', // 헤어라인
  lineStrong: '#CFCFCF', // 구역 경계
  accent: '#C8F244', // 브랜드 라임 — 선택 상태·활성 지표만
  accentInk: '#4A5F0F', // 흰 면 위 라임 계열 글자 (AA)
  danger: '#D93025',
  warnSurface: '#FFF8E6',
  warnInk: '#8A5A00',
} as const;

/**
 * 본문 서체(Pretendard) 스케일. 6단이 전부다 — `fontSize`를 직접 적지 않는다.
 *
 * `display`·`title`만 음수 letterSpacing을 준다. 큰 글자는 자간이 넓어 보여 조여야 하고,
 * 16 이하는 조이면 한글 받침이 붙는다.
 */
export const LedgerType = {
  display: { fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  title: { fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontSize: 16, lineHeight: 22 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

/**
 * 콘덴스드 수치 스케일. **무게가 이 앱의 통화**라 숫자만 별도 서체·별도 스케일을 갖는다 —
 * 폭이 좁아 우측 정렬축에서 자릿수가 표처럼 맞는다(시그니처 ①).
 *
 * 두 단뿐이다: 행의 수치와 합계. 숫자·라틴 전용이므로 한글이 섞인 문자열에는 쓰지 않는다.
 */
export const LedgerNumber = {
  row: { fontSize: 15, lineHeight: 20 },
  total: { fontSize: 24, lineHeight: 28 },
} as const;

/**
 * 선 두께. 행 사이는 `hairline`(기기 밀도에 맞는 최소 두께), 구역 경계는 `thin`(1px)이다 —
 * 굵기가 두 단이라 "행 경계"와 "구역 경계"가 두께만으로 갈린다.
 */
export const LedgerLine = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
} as const;

/**
 * 그림자는 **실제로 떠 있는 것에만** 쓴다. 2개가 전부다 — 목록·행·섹션에는 없다.
 * (현재 이식된 창고 화면에는 떠 있는 것이 없어 둘 다 쓰이지 않는다.)
 *
 * RN 0.76+ `boxShadow` 문자열 문법이다.
 */
export const LedgerElevation = {
  floating: '0 1px 2px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)',
  sheet: '0 -1px 0 rgba(0,0,0,0.06), 0 -8px 24px rgba(0,0,0,0.10)',
} as const;

/**
 * 지면 규격.
 *
 * - `pageX` 화면 좌우 거터. **행은 자기 가로 패딩을 갖지 않고 이 거터에 정렬한다** —
 *   행마다 패딩을 주면 헤어라인과 글자의 좌측 축이 갈린다.
 * - `rowMin` 최소 터치 타깃(HIG 44pt). 행 높이·탭 항목 높이의 하한이다.
 * - `scrollBottom` 스크롤 끝 여백. 마지막 행이 화면 밑단에 붙지 않게 비운다.
 */
export const LedgerLayout = {
  pageX: 16,
  rowMin: 44,
  scrollBottom: 88,
} as const;

/**
 * 콘덴스드 서체. **숫자·라틴 전용**이다 — Archivo Narrow에 한글 글리프가 없어 한글
 * 문자열에 걸면 글자가 깨진다. `무게 없음` 같은 한글 자리는 본문 서체로 둔다.
 */
export const LedgerFont = {
  condensed: 'ArchivoNarrow_700Bold',
} as const;
