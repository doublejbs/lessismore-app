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
 * **레퍼런스 이식(2026-08-11) 이후 이 그룹의 값은 새 팔레트를 따른다.** 화면을 하나씩
 * 옮기는 대신 **토큰 자체를 갈아 끼워**, 아직 개별 이식하지 않은 화면도 같은 톤(순백 지면 +
 * 중성 회색 + 잉크)으로 읽히게 한다 — 이름을 그대로 둬 200여 참조를 건드리지 않는다.
 * (ACG 세대에는 같은 자리에 따뜻한 회색 계열이 들어 있었다: `textSecondary` #5F5D57,
 * `borderLight` #E8E6DF, `inputBg` #EAE8E1 …)
 *
 * 새 UI는 `Acg`를 직접 참조하는 쪽이 의도가 분명하다. 이 그룹은 옛 화면 호환용이다.
 */
export const Color = {
  // 배경 / 텍스트
  background: '#FFFFFF', // = Acg.paper
  textPrimary: '#1A1A1A', // = Acg.ink
  textSecondary: '#767676', // = Acg.textMuted (순백 위 AA 4.5)
  textTertiary: '#555555', // 순백 위 AA 7.4
  iconMuted: '#9E9E9E',

  // 경계 / 구분선 — 순백 위 중성 헤어라인
  borderLight: '#EDEDED', // = Acg.hairline
  divider: '#EDEDED',

  // 칩 / 인풋 / 표면 — 순백 위 연회색 면
  chipInactiveBg: '#F2F2F2', // = Acg.controlFill
  chipActiveBg: '#1A1A1A',
  chipBorder: '#E5E5E5',
  inputBg: '#F2F2F2',
  surfaceMuted: '#F2F2F2',
  thumbBg: '#F2F2F2',

  // 토스트 배경 — 흰 텍스트 대비를 유지하는 진회색
  toastBg: '#262626',

  // 오버레이
  overlay: 'rgba(0,0,0,0.5)',
} as const;

/**
 * 모서리.
 *
 * **레퍼런스 이식(2026-08-11)으로 다시 둥글어졌다.** ACG 세대에는 각진 면이 기본이라 카드·인풋·
 * 칩·모달·시트가 전부 0이었는데, 새 문법은 면 12 · 칩/버튼 알약 · 모달 16이다.
 * 여기 값을 갈아 끼우면 아직 개별 이식하지 않은 화면도 같은 모서리를 따른다
 * (이식한 화면은 `AcgRadius.thumb`를 직접 참조한다).
 */
export const Radius = {
  listThumb: 8,
  card: 12,
  input: 12,
  // 칩은 둥근 사각이다(= `AcgRadius.chip`) — 알약은 낱개 버튼처럼 읽혀 한 줄의 선택지에는 과했다.
  chip: 10,
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

  // ── 레퍼런스 탐색 화면(2026-08-11 이식) ──
  // 순백 지면(`paper`) 위에 놓이는 컨트롤 면과 그 위 보조 텍스트다. 위 `bg`·`line2` 계열은
  // 종이 지면(#F4F3EF) 기준으로 뽑은 따뜻한 회색이라 순백 위에서는 누렇게 뜬다.
  // `controlFill`은 검색 필드·필터 칩·담기 버튼의 채움.
  controlFill: '#F2F2F2',
  // 순백 위 중간 회색 — 플레이스홀더와 목록 행의 브랜드 줄. 대비 4.5:1로 AA를 넘긴다.
  textMuted: '#767676',
  /**
   * 순백 위 행 구분선. 위 `line2`는 종이 지면(#F4F3EF) 기준으로 뽑은 **잉크 알파**라
   * 순백 위에서는 필요보다 진하고 미세하게 따뜻하다 — 레퍼런스의 헤어라인은 중성 회색이다.
   * 면을 두르는 테두리가 아니라 **행 사이를 가르는 선**에만 쓴다.
   */
  hairline: '#EDEDED',
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

/**
 * 레퍼런스 탐색 화면의 타입 단계(2026-08-11 이식). 서체가 아니라 **크기**만 담는다
 * (서체는 위 `AcgFont`).
 *
 * **[정정 2026-08-11]** 처음에 24/19/17로 뒀는데 레퍼런스 스크린샷의 **픽셀을 그대로
 * pt로 읽은 실수**였다. 이미지 폭 923px ÷ 논리 폭 393pt ≈ 2.35배라, 실측을 환산하면
 * 이름 ~19 · 보조 ~15 · 메타 ~14다. 처음 값은 1.3~1.4배 커서 화면이 확대판으로 보였다.
 *
 * `control`(칩 라벨·정렬 라벨·검색 입력)을 `meta`와 갈라 둔다 — 컨트롤은 눌러야 하므로
 * 메타보다 한 단 위여야 하고, 한 값으로 묶으면 한쪽을 고칠 때 다른 쪽이 끌려온다.
 */
export const AcgFontSize = {
  rowTitle: 19,
  rowSubtitle: 15,
  meta: 14,
  control: 15,
} as const;

/**
 * 레퍼런스 탐색 화면의 모서리(2026-08-11).
 *
 * 앱 기본 `Radius`는 ACG의 각진 면이라 전부 0이다 — 그 그룹의 값을 올리면 아직 ACG인
 * 화면들이 같이 둥글어지므로 별 그룹으로 둔다. `thumb`는 썸네일 자리(사진이 없는 이 앱에서는
 * 브랜드·제품명을 담는 면)의 모서리다.
 */
export const AcgRadius = {
  thumb: 12,
  /**
   * 필터 칩 모서리(2026-08-11 사용자 결정). 완전한 알약(height/2)에서 **10**으로 줄였다 —
   * 알약은 낱개 버튼처럼 읽혀서, 여러 개가 한 줄로 늘어선 선택지에는 과했다.
   * 면(`thumb` 12)보다 살짝 작게 둬 칩이 면 안에 놓여도 두 모서리가 겹쳐 보이지 않는다.
   */
  chip: 10,
} as const;

// New Architecture의 `boxShadow`를 쓴다(RN 0.76+). 문자열 문법이 핸드오프 CSS와 1:1이라
// 값을 옮길 때 오차가 생기지 않는다.
export const AcgShadow = {
  paper: '0 1px 0 rgba(26,26,26,0.06)',
  glass: '0 6px 20px rgba(26,26,26,0.1)',
  card: '0 6px 20px rgba(26,26,26,0.12)',
  sticker: '0 4px 12px rgba(26,26,26,0.22)',
} as const;

/**
 * 목록 행 치수(레퍼런스 목록 문법, 2026-08-11).
 *
 * 홈·배낭·창고가 **같은 값**을 써야 탭을 옮겨도 목록의 리듬이 같다 — 화면마다 상수를 두면
 * 한쪽만 고쳐지고 그때부터 어긋난다.
 *
 * `minHeight`는 이름 한 줄(25) + 메타 한 줄(20)에 위아래 여유를 더한 값이고, 이름이 두 줄로
 * 늘면 행이 그만큼 자란다. 44pt 터치 타깃은 이 값으로 충분히 넘긴다.
 */
export const AcgRow = {
  minHeight: 72,
  paddingVertical: 14,
} as const;

export const AcgLayout = {
  screenH: 18, // [옛 ACG] 아직 이식하지 않은 화면의 좌우 패딩
  /**
   * 레퍼런스 이식 화면의 화면 좌우 패딩(2026-08-11). 탐색·홈·배낭·배낭 상세가 같은 값을 쓴다 —
   * 탭을 옮길 때 좌측 정렬선이 2px씩 움직이면 화면이 흔들려 보인다.
   */
  screenPadding: 16,
  /**
   * 필터 칩 사이 간격. 12 → 8 → **6**으로 두 번 줄였다(2026-08-11 사용자 지적 2회).
   *
   * 칩은 알약이라 자체 좌우 패딩(12)이 이미 시각 여백을 만든다. 거기에 간격을 더 얹으면
   * 칩들이 **한 줄의 선택지**가 아니라 서로 무관한 버튼처럼 흩어져 보인다.
   * **모든 칩 행이 이 값을 참조한다** — 화면마다 4·6·8·10·12로 갈려 있던 것을 모았다.
   */
  chipGap: 6,
  section: 22,
  // 플로팅 탭바 아래로 콘텐츠가 흐르므로 스크롤 끝에 이만큼 비운다.
  scrollBottom: 130,
} as const;
