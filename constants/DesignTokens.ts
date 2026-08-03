/**
 * 앱 전역 디자인 토큰.
 *
 * 기준 디자인(탐색/피드 탭 + 배낭 패킹모드)에서 추출·정규화한 값이다.
 * 옛 화면들이 하드코딩하던 제각각의 색/모서리/여백을 이 토큰으로 통일한다.
 * 색상 값 성격상 enum 대신 `as const` 객체로 둔다.
 */

export const Color = {
  // 배경 / 텍스트
  background: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#767676', // WCAG AA(4.5:1) 충족 — 흰 배경 보조 텍스트
  textTertiary: '#555555',
  iconMuted: '#B0B8C1',

  // 경계 / 구분선
  borderLight: '#F0F0F0',
  divider: '#F2F4F6',

  // 칩 / 인풋 / 표면
  chipInactiveBg: '#EBEBEB',
  chipActiveBg: '#000000',
  chipBorder: '#E5E5E5', // 아웃라인 칩(비선택) 테두리
  inputBg: '#F5F5F5',
  surfaceMuted: '#F5F5F5',
  thumbBg: '#F1F1F1',

  // 토스트 배경 — 흰 텍스트 대비를 유지하는 진회색(검정보다 부드럽게)
  toastBg: '#333333',

  // 오버레이
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const Radius = {
  listThumb: 4,
  card: 8,
  input: 8,
  chip: 8,
  sheet: 20,
  modal: 16,
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
