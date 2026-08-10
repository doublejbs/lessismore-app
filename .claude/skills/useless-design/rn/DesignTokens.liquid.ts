/**
 * Liquid Depth 디자인 토큰 (핸드오프 2026-08-10).
 *
 * 기존 `Acg` 그룹을 **덮어쓰지 않고 나란히 둔다**. 화면을 하나씩 옮기기 위해서다 —
 * 이식이 끝난 화면만 `Liquid`를 참조하고, 나머지는 `Acg`를 그대로 쓴다.
 *
 * 컨셉: iOS 26 리퀴드 글래스. 중성 회색 지면 위에 20~28px 라운드 카드를 얹고,
 * 반투명 유리 크롬이 콘텐츠 위를 떠다닌다. 라임은 액센트 하나로 남되 면으로만 쓴다.
 */

export const Liquid = {
  // ── 잉크 스케일 — 색상 계열이 아니라 명도만으로 위계를 낸다.
  ink: '#101012',
  inkSecondary: '#5E5E68', // AA 7.0
  inkTertiary: '#78787F', // AA 4.9
  inkMuted: '#8A8A94', // AA 3.9 — 12px 이상 보조용
  inkSubtle: '#B4B4BC', // 단위·쉐브론
  inkFaint: '#D4D4DC', // 빈 체크 원 테두리

  // ── 지면 / 면
  canvas: '#F2F2F6',
  surface: '#FFFFFF',
  surfaceSunken: '#EDEDF2', // 진행 트랙, 카드 안 타일
  surfaceQuiet: 'rgba(255,255,255,0.72)', // 지난 항목·비활성 카드
  hairline: 'rgba(16,16,18,0.08)',
  hairlineStrong: 'rgba(16,16,18,0.12)',

  // ── 유리 — 실제 블러는 expo-blur의 BlurView가 담당한다(RN에 backdrop-filter가 없다).
  //    BlurView 위에 glassFill을 덮고, 0.5px glassStroke 보더로 광택을 근사한다.
  glassFill: 'rgba(255,255,255,0.66)', // 탭바·헤더 캡슐
  glassFillStrong: 'rgba(255,255,255,0.85)', // 검색 필드·시트
  glassStroke: 'rgba(255,255,255,0.95)',
  glassBlurIntensity: 70, // BlurView intensity (tint: 'light')

  // ── 액센트 — 이 하나뿐. 면으로만 쓰고 글자는 ink를 얹는다.
  lime: '#C8F244',
  limeOn: '#101012',
  limeOnQuiet: '#3E4A16', // 라임 면 위 보조 글자 (AA 6.4)
  limeInk: '#5C7A12', // 밝은 면 위 라임 계열 글자 (AA 4.6)

  // ── 탭바
  tabInactive: '#8A8A94',
  tabActiveBg: '#101012',
  tabActiveIcon: '#C8F244',
} as const;

/**
 * 액센트 체계 밖의 의미색. 뜻이 값에 묶여 있어 리디자인해도 바꾸지 않는다.
 *
 * ⚠️ 기존 `AcgSemantic.spot*`(#4A90E2 / #50C878 / #FFD700)과 값이 다르다.
 * 목업은 아래 차분한 값으로 그려져 있다 — 어느 쪽으로 통일할지 먼저 정하고 쓸 것.
 */
export const LiquidSemantic = {
  spotBackpacking: '#2F6F8F',
  spotShelter: '#4E8C5A',
  spotCampground: '#C9A227',
  favorite: '#FFC83D',
  warnBg: '#FFF3DC',
  warnInk: '#B65A00',
  danger: '#FF3B30',

  // 배낭 카테고리 데이터 시각화 (기존 AcgSemantic.bag*과 동일한 값)
  catBase: '#2F6F8F',
  catClothing: '#4E8C5A',
  catCooking: '#C9A227',
  catSafety: '#B2604F',
  catEtc: '#7A6A8F',
} as const;

/**
 * 타입 스케일. 한글·UI는 Pretendard, 숫자·라틴만 Archivo Narrow 700.
 *
 * **Archivo Narrow에는 한글 글리프가 없다** — 무게·D-day·기간·진행률·버전에만 쓴다.
 * CSS의 em 자간은 px로 환산해 두었다(micro = 11 × 0.16 ≈ 1.76).
 */
export const LiquidFont = {
  ui: 'Pretendard',
  condensed: 'ArchivoNarrow_700Bold',
} as const;

export const LiquidType = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1.2 },
  title1: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1 },
  title2: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.9 },
  title3: { fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: -0.6 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  bodySm: { fontSize: 13.5, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '400' },
  // 섹션은 큰 제목 대신 대문자 마이크로 라벨로 연다 — 이 시스템의 서명.
  micro: { fontSize: 11, lineHeight: 16, fontWeight: '600', letterSpacing: 1.76 },
  numHero: { fontFamily: 'ArchivoNarrow_700Bold', fontSize: 72, lineHeight: 64, letterSpacing: -2.5 },
  numXl: { fontFamily: 'ArchivoNarrow_700Bold', fontSize: 42, lineHeight: 38, letterSpacing: -1.2 },
  numLg: { fontFamily: 'ArchivoNarrow_700Bold', fontSize: 32, lineHeight: 36, letterSpacing: -0.5 },
  numMd: { fontFamily: 'ArchivoNarrow_700Bold', fontSize: 22, lineHeight: 26 },
  numSm: { fontFamily: 'ArchivoNarrow_700Bold', fontSize: 14, lineHeight: 18, letterSpacing: 0.7 },
} as const;

/** 칩·버튼은 완전한 알약(height/2), 카드는 20~26, 시트는 상단만 28. 각진 면은 없다. */
export const LiquidRadius = {
  chip: 17, // h34 칩
  chipSm: 14, // h28 2차 칩
  tile: 20, // 지표 타일, 리스트 카드
  card: 22,
  hero: 26, // 히어로·유리 카드
  sheet: 28,
  pill: 999, // CTA, 탭바, 검색 필드
} as const;

/**
 * New Architecture의 `boxShadow`(RN 0.76+)를 쓴다. 문자열 문법이 핸드오프 CSS와 1:1이라
 * 값을 옮길 때 오차가 생기지 않는다. 종이 카드는 접지 1px + 넓은 확산 두 겹이 기본이다.
 */
export const LiquidShadow = {
  card: '0 1px 2px rgba(16,16,18,0.04), 0 10px 26px rgba(16,16,18,0.05)',
  tile: '0 1px 2px rgba(16,16,18,0.04), 0 8px 22px rgba(16,16,18,0.05)',
  glass: '0 10px 30px rgba(16,16,18,0.14)',
  glassSm: '0 4px 14px rgba(16,16,18,0.08)',
  cta: '0 12px 30px rgba(16,16,18,0.26)',
  accent: '0 12px 32px rgba(160,200,40,0.35)',
  sheet: '0 -12px 44px rgba(16,16,18,0.14)',
} as const;

export const LiquidLayout = {
  screenH: 20, // 화면 좌우 패딩
  cardPad: 16,
  cardPadLg: 20, // 히어로 카드
  listGap: 10, // 카드 사이
  section: 26, // 섹션 사이
  navBar: 44, // 투명 네이티브 헤더
  // 플로팅 탭바 아래로 콘텐츠가 흐르므로 스크롤 끝에 이만큼 비운다.
  scrollBottom: 130,
  touchMin: 44,
} as const;

/**
 * 지면 레이어. 지형 이미지 위에 위→아래로 짙어지는 베일을 겹친다.
 * 위쪽에서는 산세가 읽히고 아래 목록 구간은 조용해진다.
 */
export const LiquidBackdrop = {
  terrain: {
    home: 0.85,
    bagDetail: 0.8,
    packing: 0.8,
    info: 0.8,
    login: 0.7,
  },
  // expo-linear-gradient colors/locations. canvas(#F2F2F6)의 알파만 바뀐다.
  veil: {
    home: { colors: ['rgba(242,242,246,0.10)', 'rgba(242,242,246,0.36)', 'rgba(242,242,246,0.52)'], locations: [0, 0.45, 1] },
    bagDetail: { colors: ['rgba(242,242,246,0.14)', 'rgba(242,242,246,0.42)', 'rgba(242,242,246,0.58)'], locations: [0, 0.45, 1] },
    packing: { colors: ['rgba(242,242,246,0.16)', 'rgba(242,242,246,0.50)', 'rgba(242,242,246,0.70)'], locations: [0, 0.4, 1] },
    info: { colors: ['rgba(242,242,246,0.14)', 'rgba(242,242,246,0.50)', 'rgba(242,242,246,0.72)'], locations: [0, 0.4, 1] },
    login: { colors: ['rgba(242,242,246,0.30)', 'rgba(242,242,246,0.60)', 'rgba(242,242,246,0.80)'], locations: [0, 0.5, 1] },
  },
  // 라임 라디얼 글로우 하나를 지면 모서리에 둔다 — 브랜드 색이 UI를 지배하지 않으면서 온기를 준다.
  glow: { size: 340, color: 'rgba(200,242,68,0.5)', fade: 0.7 },
} as const;

/** 전환은 스프링, 오버슈트 없음 — 진행 바가 목표를 지나쳤다 돌아오면 값이 틀린 것처럼 보인다. */
export const LiquidMotion = {
  spring: { damping: 22, stiffness: 220, mass: 1, overshootClamping: true },
  pressOpacity: 0.8, // activeOpacity 0.7~0.85
  doneOpacity: 0.6, // 완료 항목은 지우지 않고 낮춘다
} as const;
