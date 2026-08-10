/**
 * 앱 전역 디자인 토큰.
 *
 * 기준 디자인(탐색/피드 탭 + 배낭 패킹모드)에서 추출·정규화한 값이다.
 * 옛 화면들이 하드코딩하던 제각각의 색/모서리/여백을 이 토큰으로 통일한다.
 * 색상 값 성격상 enum 대신 `as const` 객체로 둔다.
 */

/**
 * 앱 공통 색.
 *
 * **ACG 리디자인 이후 이 그룹의 값은 `Acg` 팔레트를 따른다**(2026-08-03). 화면을 하나씩
 * 옮기는 대신 토큰 자체를 갈아 끼워, 아직 개별 적용하지 않은 화면도 같은 톤(따뜻한 회색
 * 계열 + 잉크)으로 읽히게 한다. 이름은 그대로 두어 120여 개 파일을 건드리지 않는다.
 *
 * 새 UI는 `Acg`를 직접 참조하는 쪽이 의도가 분명하다. 이 그룹은 옛 화면 호환용이다.
 */
export const Color = {
  // 배경 / 텍스트
  background: '#FFFFFF', // = Acg.paper
  textPrimary: '#1A1A1A', // = Acg.ink
  textSecondary: '#5F5D57', // AA 5.4 (= Acg.textSecondary)
  textTertiary: '#4A4A45', // AA 7.4 (= Acg.textTertiary)
  iconMuted: '#A8A69E', // 푸른 회색(#B0B8C1)은 따뜻한 지면 위에서 떠 보였다

  // 경계 / 구분선 — 지면(#F4F3EF)과 같은 계열의 따뜻한 회색
  borderLight: '#E8E6DF',
  divider: '#EDEBE4',

  // 칩 / 인풋 / 표면
  chipInactiveBg: '#E8E6DF',
  chipActiveBg: '#1A1A1A',
  chipBorder: '#E2E0D8', // 아웃라인 칩(비선택) 테두리
  // 인풋·보조 표면은 지면(#F4F3EF)보다 한 단계 어둡게 둔다. 지면색과 같게 두면 화면 루트가
  // 지면인 곳에서 입력 영역이 통째로 사라지고, 종이 면 위에서만 보이는 반쪽 값이 된다.
  inputBg: '#EAE8E1',
  surfaceMuted: '#EAE8E1',
  thumbBg: '#EDEBE4',

  // 토스트 배경 — 흰 텍스트 대비를 유지하는 진회색(검정보다 부드럽게)
  toastBg: '#2A2A28',

  // 오버레이
  overlay: 'rgba(0,0,0,0.5)',
} as const;

/**
 * 모서리.
 *
 * **ACG는 각진 면이 기본이다** — 카드·인풋·칩·모달·시트를 0으로 둔다(2026-08-03).
 * 예외는 `pill` 하나뿐이다: 원형 아이콘 버튼과 알약 버튼은 시안에서도 둥글다.
 */
export const Radius = {
  listThumb: 0,
  card: 0,
  input: 0,
  chip: 0,
  sheet: 0,
  modal: 0,
  pill: 32,
} as const;

export const Spacing = {
  screenH: 20,
  section: 24,
  item: 12,
} as const;

/**
 * ACG 라이트 리디자인 토큰 (2026-08-03 핸드오프).
 *
 * 컨셉은 "지형 위에 붙인 필드 노트" — 와이어프레임 지형 배경 위에 유리 면과 흰 종이 면을
 * 얹고, 라임 액센트 하나로 액션·진행·강조를 표시한다.
 *
 * **위 `Color`를 덮어쓰지 않고 별도 그룹으로 둔다.** `Color`는 앱 전 화면이 쓰는 값이라
 * 바꾸면 이번 범위(탭 5화면) 밖까지 전부 흔들린다. 리디자인이 적용된 화면만 `Acg`를 참조하고,
 * 나머지는 기존 토큰을 그대로 쓴다 — 범위를 넓힐 때 화면 단위로 옮겨 갈 수 있다.
 */
export const Acg = {
  // 지면 — 탭 화면과 상세 화면이 같은 값이다(차이는 지형 그래픽 유무).
  bg: '#F4F3EF',
  // 기본 텍스트이자 주 액션 면·활성 칩 면.
  ink: '#1A1A1A',
  textSecondary: '#5F5D57', // AA 5.4
  textTertiary: '#4A4A45', // AA 7.4
  paper: '#FFFFFF',
  // 유리 면 채움 — 실제 블러는 `expo-blur`가 담당한다(RN에 backdrop-filter가 없다).
  glassFill: 'rgba(255,255,255,0.5)',
  // 유리 광택 — CSS inset 그림자를 RN에서 낼 수 없어 헤어라인 테두리로 근사한다.
  glassStroke: 'rgba(255,255,255,0.9)',
  line: 'rgba(26,26,26,0.24)', // 섹션 경계
  line2: 'rgba(26,26,26,0.14)', // 항목 구분선, 진행 바 트랙
  // 액센트는 이 하나뿐 — 일정 카드, 진행 채움, 형광펜, 별표, 현재위치 버튼.
  lime: '#C8F244',
  limeText: '#4F6A04', // 밝은 면 위 라임 텍스트 (AA 5.2)
  warnBg: '#FFF4E5',
  warnText: '#9A4B00',
} as const;

/**
 * 액센트 체계 **밖**의 의미색. 뜻이 값에 묶여 있어 리디자인해도 바꾸지 않는다.
 * (핸드오프 명시: "의미색 — 변경 금지")
 */
export const AcgSemantic = {
  spotBackpacking: '#4A90E2',
  spotShelter: '#50C878',
  spotCamping: '#FFD700',
  favorite: '#FFD700',
  bagBase: '#2F6F8F',
  bagClothing: '#4E8C5A',
  bagCooking: '#C9A227',
  bagSafety: '#B2604F',
  bagEtc: '#7A6A8F',
} as const;

/**
 * 디스플레이·수치용 콘덴스드 서체. 본문·UI는 그대로 Pretendard를 쓴다.
 * `app/_layout.tsx`에서 로드하며, 로드 전에는 시스템 폰트로 떨어진다.
 */
export const AcgFont = {
  condensed: 'ArchivoNarrow_700Bold',
} as const;

// New Architecture의 `boxShadow`를 쓴다(RN 0.76+). 문자열 문법이 핸드오프 CSS와 1:1이라
// 값을 옮길 때 오차가 생기지 않는다.
export const AcgShadow = {
  paper: '0 1px 0 rgba(26,26,26,0.06)',
  glass: '0 6px 20px rgba(26,26,26,0.1)',
  card: '0 6px 20px rgba(26,26,26,0.12)',
  sticker: '0 4px 12px rgba(26,26,26,0.22)',
} as const;

export const AcgLayout = {
  screenH: 18, // 화면 좌우 패딩(핸드오프: 리스트 18px)
  section: 22,
  // 플로팅 탭바 아래로 콘텐츠가 흐르므로 스크롤 끝에 이만큼 비운다.
  scrollBottom: 130,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Liquid Depth (핸드오프 2026-08-10) — ACG와 나란히 두는 다음 세대 토큰.
// 이식이 끝난 화면만 Liquid를 참조한다. 정본: design_handoff_liquid_depth/rn/DesignTokens.liquid.ts
// ─────────────────────────────────────────────────────────────────────────────

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

  /**
   * ── 라임·유리 면 **위**에 얹는 값. 핸드오프 색 표에는 이름이 없지만 목업에서
   * 반복 등장한다(히어로 안쪽 유리 판, 그 위 진행 트랙·구분선). 컴포넌트에
   * 리터럴로 흩어지면 값이 갈리므로 여기에 모은다.
   */
  glassFillSoft: 'rgba(255,255,255,0.55)', // 라임 면 위 유리 판
  trackOnAccent: 'rgba(16,16,18,0.14)', // 라임·유리 면 위 진행 트랙
  hairlineOnAccent: 'rgba(16,16,18,0.16)', // 라임 면 위 세로 구분선

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
