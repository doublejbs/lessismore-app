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
 * ⚠️ **2026-08-11 현재 `Color`를 읽는 코드는 없다.** 마지막 참조(전역 오버레이 3종 —
 * 공지 시트·신기능 팝업·강제 업데이트 게이트 — 와 인앱 브라우저 툴바 색)가 Liquid Depth
 * 이식으로 사라졌다. 아래 `Radius`·`Spacing`은 공유 이미지 내보내기 캔버스
 * (`components/bag-film-card/*` — 앱 UI가 아니라 별도 팔레트를 쓰는 예외)만 읽는다.
 * 지우지 않는 것은 디자인 규칙(레포 `CLAUDE.md`)을 따른 것이며, 새 UI는 `Liquid*`만 쓴다.
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
 *
 * ⚠️ **2026-08-11 현재 이 그룹(`Acg`·`AcgSemantic`·`AcgShadow`·`AcgLayout`·`AcgFont`)을
 * 읽는 코드는 없다.** 전역 오버레이·공통 레이아웃까지 Liquid Depth로 옮기면서 마지막 참조
 * (`Layout`의 기본 지면)가 사라졌다. 지우지 않는 것은 디자인 규칙(레포 `CLAUDE.md`: "기존
 * `Acg*` 그룹은 지우지 않습니다")을 따른 것이며, 새 UI는 `Liquid*`만 쓴다 — 한 화면에서 두
 * 세대를 섞지 않는다.
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
  /**
   * ⚠️ **박지 유형색은 이 셋이 아니다.** 2026-08-04에 채도를 낮춘 값으로 바뀌고 2026-08-11
   * 지도 이식에서 `LiquidSemantic.spot*`으로 이름까지 옮겨, 지금 앱에서 참조하는 곳이 없다.
   * 마커·필터 도트 색을 찾는다면 `CampSiteLabels.TYPE_COLOR`를 보라.
   */
  spotBackpacking: '#4A90E2',
  spotShelter: '#50C878',
  spotCamping: '#FFD700',
  /**
   * ⚠️ **죽은 값이다.** 즐겨찾기 별은 2026-08-11 지도·박지 상세 이식에서 핸드오프가 지정한
   * `LiquidSemantic.favorite`(#FFC83D)로 옮겼고, 이 토큰을 읽는 곳은 남아 있지 않다
   * (미이식 여행지 선택기는 토큰이 아니라 자체 리터럴을 쓴다 — 그 화면 이식 시 정리된다).
   */
  favorite: '#FFD700',
  /**
   * ⚠️ **죽은 값들이다.** 배낭 카테고리 색은 `LiquidSemantic.cat*`(값 동일)으로 옮겨
   * 참조하는 곳이 없다 — `spot*`과 같은 처지다. 카테고리 색을 찾는다면 그쪽을 보라.
   */
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
  /**
   * 완료 처리된 항목 면. 목업 §7 패킹 모드의 체크된 행이 이 값이다 — 지난 항목
   * (`surfaceQuiet` .72)보다 한 단계 더 가라앉는다. 완료 항목은 목록에서 지우지 않고
   * 면과 투명도만 낮추므로(핸드오프 Interactions) 그 "낮춘 면"이 여기 해당한다.
   */
  surfaceDone: 'rgba(255,255,255,0.62)',
  hairline: 'rgba(16,16,18,0.08)',
  hairlineStrong: 'rgba(16,16,18,0.12)',
  /**
   * 점선 테두리. 목업 §9 장비 상세의 `사진 추가` 슬롯이 1.5px dashed로 이 값을 쓴다 —
   * 실선 헤어라인(0.5px)보다 굵게 그려지므로 같은 농도를 쓰면 실선보다 무거워 보인다.
   * `hairlineOnAccent`와 값은 같지만 뜻이 다르다(그쪽은 라임 면 위 세로 구분선).
   */
  dashedStroke: 'rgba(16,16,18,0.16)',
  /**
   * 전체 화면 오버레이 뒤 지면을 어둡히는 막. 잉크 계열이라 지면(`canvas`)과 같은
   * 색 계열로 가라앉는다 — 순수 검정은 이 팔레트에 없다.
   */
  scrim: 'rgba(16,16,18,0.4)',

  // ── 유리 — 실제 블러는 expo-blur의 BlurView가 담당한다(RN에 backdrop-filter가 없다).
  //    BlurView 위에 glassFill을 덮고, 0.5px glassStroke 보더로 광택을 근사한다.
  glassFill: 'rgba(255,255,255,0.66)', // 탭바·헤더 캡슐
  glassFillStrong: 'rgba(255,255,255,0.85)', // 검색 필드·시트
  // 빈 검색 필드. 목업 §2 탐색의 검색 필드가 `rgba(255,255,255,.75)`로, 탭바(glassFill)보다
  // 진하고 채워진 필드(glassFillStrong)보다 옅은 중간 값이다.
  glassFillField: 'rgba(255,255,255,0.75)',
  /**
   * 유리 **카드** 면. 목업 §7 패킹 진행 카드와 §11 내 정보 프로필 카드가 둘 다
   * `rgba(255,255,255,.82)`로, 시트(`glassFillStrong` .85)보다 옅고 필드(.75)보다 진하다 —
   * 카드는 뒤를 가리는 면이 아니라 지면 위에 얹힌 판이라 지형이 살짝 읽혀야 하고, 그렇다고
   * 필드만큼 옅으면 카드 안에 놓이는 흰 타일과 면이 갈리지 않는다.
   */
  glassFillCard: 'rgba(255,255,255,0.82)',
  glassStroke: 'rgba(255,255,255,0.95)',
  /**
   * **지도 타일 위** 유리 면. 지면 위 유리(.66~.85)보다 진하다 — 뒤가 단색 지면이 아니라
   * 지형·도로·라벨이라 옅은 유리로는 글자가 지도 글자와 겹쳐 읽힌다(2026-08-03 실기기 확인).
   * 목업 §4는 검색 필드 `.9` · 칩 `.92`로 그렸는데, 두 값의 차이는 눈에 보이지 않고 같은
   * 오버레이 스택에 얹히는 면이라 하나로 합쳤다.
   */
  glassFillOnMap: 'rgba(255,255,255,0.92)',
  // 비선택 칩·아웃라인 필터 버튼(핸드오프 Chip: `rgba(255,255,255,.8)` + 0.5px 보더).
  chipFill: 'rgba(255,255,255,0.8)',
  chipStroke: 'rgba(16,16,18,0.06)',
  glassBlurIntensity: 70, // BlurView intensity (tint: 'light')
  /**
   * 바텀 시트의 유리. 목업 §12 로그인 시트는 blur36으로, 지면 위에 뜬 유리(blur30 =
   * `glassBlurIntensity`)보다 한 단계 두껍다 — 시트는 뒤 화면을 **가리는** 면이라
   * 뒤 형태가 읽히면 시트가 얇은 막처럼 보인다.
   */
  glassBlurIntensityStrong: 85,

  /**
   * 중립 배지 면. 흰 카드 위에서 라임·잉크 배지보다 한 단계 낮은 자리에 쓴다 —
   * 목업 §5 배낭 목록의 `D-21`(임박하지 않은 예정)·패킹 진행 배지가 이 값이다.
   * 카드 면과 구분은 되지만 시선을 끌지 않는 최소 대비다.
   */
  badgeFill: 'rgba(16,16,18,0.07)',

  // ── 액센트 — 이 하나뿐. 면으로만 쓰고 글자는 ink를 얹는다.
  lime: '#C8F244',
  limeOn: '#101012',
  limeOnQuiet: '#3E4A16', // 라임 면 위 보조 글자 (AA 6.4)
  // 밝은 면 위 라임 계열 글자. **흰 면 기준 4.9:1**이라 본문 크기에는 AA를 넘지만
  // 라임 틴트 면 위에서는 4.16:1로 떨어진다 — 그 위에서는 `limeOnQuiet`를 쓴다.
  limeInk: '#5C7A12',

  /**
   * 라임 **틴트** 면과 그 테두리. 목업 §8 창고의 알림 칩(`안 쓴 장비 7`)이 이 값이다 —
   * 라임 원색 면(`lime`)이 아니라 지면 위에 옅게 깐 틴트라, 주 액센트 면 하나 규칙과
   * 자리를 다투지 않는다. 글자·아이콘은 `limeOnQuiet`를 얹는다 — 이 면 위에서 `limeInk`는
   * 4.16:1로 작은 글자의 AA(4.5)에 못 미친다.
   */
  limeTint: 'rgba(200,242,68,0.35)',
  limeTintStroke: 'rgba(160,200,40,0.5)',

  /**
   * 잉크 면 위 보조 글자. 흰 글자(=`surface`)가 주 정보를 맡고 그 아래 한 단계 낮은
   * 줄이 이 값이다 — 목업 §6 배낭 상세의 잉크 타일 부제가 여기 해당한다(잉크 위 6.8:1).
   * `inkSubtle`을 그대로 쓰면 밝은 면 위 단위 색과 뜻이 갈린다.
   */
  inkOnQuiet: '#9A9AA4',

  /**
   * ── 라임·유리 면 **위**에 얹는 값. 핸드오프 색 표에는 이름이 없지만 목업에서
   * 반복 등장한다(히어로 안쪽 유리 판, 그 위 진행 트랙·구분선). 컴포넌트에
   * 리터럴로 흩어지면 값이 갈리므로 여기에 모은다.
   */
  glassFillSoft: 'rgba(255,255,255,0.55)', // 라임 면 위 유리 판
  trackOnAccent: 'rgba(16,16,18,0.14)', // 라임·유리 면 위 진행 트랙
  hairlineOnAccent: 'rgba(16,16,18,0.16)', // 라임 면 위 세로 구분선

  /**
   * 콘텐츠 **위에 떠 있는** 잉크 알약 면(목업 §2 탐색의 `인기 순위` 버튼 `rgba(16,16,18,.88)`).
   * 불투명 `ink`가 아닌 이유는 지면 위에 얹힌 유리 크롬과 같은 층에 있어서다 — 뒤 카드가
   * 살짝 비쳐야 목록 위에 떠 있는 것으로 읽힌다. 유리(`glassFill*`)의 반대쪽 짝이다.
   */
  inkFloating: 'rgba(16,16,18,0.88)',

  // ── 탭바
  tabInactive: '#8A8A94',
  tabActiveBg: '#101012',
  tabActiveIcon: '#C8F244',
} as const;

/**
 * 액센트 체계 밖의 의미색. 뜻이 값에 묶여 있어 리디자인해도 바꾸지 않는다.
 *
 * **이 그룹이 의미색의 현행 단일 소스다**(2026-08-11). `spot*`는 지도·박지 상세가
 * `CampSiteLabels.TYPE_COLOR`를 통해 쓰고 있고, `cat*`은 배낭 무게 분해가 쓴다 —
 * 채도를 낮춘 박지 유형색(#2F6F8F / #4E8C5A / #C9A227)이 목업 값과 이미 같아 이름만
 * 옮겼으므로 통일 여부를 따질 것이 남아 있지 않다. `cat*`도 `AcgSemantic.bag*`과 값이
 * 같다. 옛 `AcgSemantic.spot*`(#4A90E2 / #50C878 / #FFD700)·`bag*`·`favorite`는
 * 참조가 끊긴 죽은 값이다.
 */
export const LiquidSemantic = {
  spotBackpacking: '#2F6F8F',
  spotShelter: '#4E8C5A',
  spotCampground: '#C9A227',
  favorite: '#FFC83D',
  warnBg: '#FFF3DC',
  warnInk: '#B65A00',
  /**
   * 경고 면 위 **본문** 글자. `warnInk`는 아이콘·강조용이고, 이 값이 문장용이다 —
   * `warnBg` 위에서 `warnInk`는 4.29:1로 작은 글자의 AA(4.5)에 못 미치는데 이 값은 6.2:1이다.
   * 목업 §10의 경고 배너도 아이콘만 `warnInk`, 문장은 이 값으로 그려져 있다.
   */
  warnInkStrong: '#8A4A00',
  danger: '#FF3B30',
  /**
   * 좋아요(하트) 켜진 색. 액센트 체계 밖의 의미색이라 라임으로 바꾸지 않는다.
   * **`danger`와 갈라 둔다** — 파괴적 액션(삭제·탈퇴)과 좋아요가 같은 빨강이면
   * 하트를 누르는 것이 되돌릴 수 없는 일처럼 읽힌다. 값은 리디자인 전 리뷰 화면이
   * 쓰던 것을 그대로 옮겼다(세 파일에 흩어져 있던 리터럴을 여기로 모았다).
   */
  like: '#FF6B6B',

  // 배낭 카테고리 데이터 시각화 (기존 AcgSemantic.bag*과 동일한 값)
  catBase: '#2F6F8F',
  catClothing: '#4E8C5A',
  catCooking: '#C9A227',
  catSafety: '#B2604F',
  catEtc: '#7A6A8F',
} as const;

/**
 * 데이터 시각화 전용 팔레트. 액센트 체계 밖(그래프 선·추이)이라 라임·잉크 스케일을 쓰지 않는다.
 *
 * `LiquidSemantic.cat*`과 값이 겹치지만 **뜻은 분리한다** — 카테고리 색은 배낭 무게 분해가
 * 소유한 의미색이고, 이 값들은 그래프 선 색일 뿐이다. 한쪽을 바꿔도 다른 쪽이 끌려가지 않게
 * 이름부터 갈라 둔다.
 */
export const LiquidViz = {
  heartRate: '#B2604F',
  pace: '#2F6F8F',
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
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  title1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1,
  },
  title2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  title3: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  bodySm: { fontSize: 13.5, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '400' },
  // 섹션은 큰 제목 대신 대문자 마이크로 라벨로 연다 — 이 시스템의 서명.
  micro: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.76,
  },
  numHero: {
    fontFamily: 'ArchivoNarrow_700Bold',
    fontSize: 72,
    lineHeight: 64,
    letterSpacing: -2.5,
  },
  numXl: {
    fontFamily: 'ArchivoNarrow_700Bold',
    fontSize: 42,
    lineHeight: 38,
    letterSpacing: -1.2,
  },
  numLg: {
    fontFamily: 'ArchivoNarrow_700Bold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  numMd: { fontFamily: 'ArchivoNarrow_700Bold', fontSize: 22, lineHeight: 26 },
  numSm: {
    fontFamily: 'ArchivoNarrow_700Bold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.7,
  },
} as const;

/** 칩·버튼은 완전한 알약(height/2), 카드는 20~26, 시트는 상단만 28. 각진 면은 없다. */
export const LiquidRadius = {
  chip: 17, // h34 칩
  chipSm: 14, // h28 2차 칩
  /**
   * 목록 행 썸네일(44). 각진 면은 이 시스템에 없어 0을 쓸 수 없고, 카드값(20~26)을 44에
   * 그대로 얹으면 사진이 원에 가깝게 깎인다 — 카드와 같은 비율(≈ 한 변의 1/4)로 낮춘다.
   */
  thumb: 12,
  tile: 20, // 지표 타일, 리스트 카드
  /**
   * 카드 **안**에 겹쳐 놓는 작은 타일(목업 §11 내 정보 프로필 카드의 지표 3개).
   * 부모 카드(26)보다 낮아야 안쪽 면이 카드 모서리를 밀어내지 않는다.
   */
  tileSm: 18,
  card: 22,
  hero: 26, // 히어로·유리 카드
  sheet: 28,
  /**
   * 바텀 시트 상단(목업 §12 로그인). 화면 폭을 꽉 채운 채 아래가 잘린 면이라
   * `sheet`(28)보다 한 단계 크다 — 콘텐츠를 감싸는 시트(박지 상세)와 화면을 덮는
   * 시트(로그인)의 차이다.
   */
  sheetLg: 32,
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
  // 검색 필드. 목업 §2·§3의 필드는 유리 캡슐(glassSm)보다 낮고 넓게 깔려, 지면 위에
  // 살짝 떠 있는 정도로만 읽힌다.
  field: '0 6px 20px rgba(16,16,18,0.07)',
  cta: '0 12px 30px rgba(16,16,18,0.26)',
  /**
   * 콘텐츠 위에 떠 있는 알약(목업 §2 `인기 순위`). `cta`와 값이 가깝지만 뜻이 다르다 —
   * `cta`는 하단 고정 주 액션이고 이쪽은 목록 위를 떠다니는 보조 진입점이라, 한쪽 무게를
   * 조정할 때 다른 쪽이 끌려가지 않게 갈라 둔다.
   */
  floatingPill: '0 10px 26px rgba(16,16,18,0.28)',
  accent: '0 12px 32px rgba(160,200,40,0.35)',
  sheet: '0 -12px 44px rgba(16,16,18,0.14)',
  /**
   * **지도 타일 위** 마커를 지형에서 떼어 놓는 그림자(목업 §4 `0 2px 6px rgba(0,0,0,.2)`).
   * 위 값들은 뒤가 단색 지면인 것을 전제로 잉크 계열(rgba(16,16,18,…))로 옅게 깔려 있어
   * 지형·도로·라벨 위에서는 묻힌다 — 검정 계열로 진하게 가는 지도 예외다
   * ([CampSite.md](../specs/CampSite.md) §2.1).
   */
  markerOnMap: '0 2px 6px rgba(0,0,0,0.2)',
} as const;

export const LiquidLayout = {
  screenH: 20, // 화면 좌우 패딩
  cardPad: 16,
  cardPadLg: 20, // 히어로 카드
  listGap: 10, // 카드 사이
  section: 26, // 섹션 사이
  navBar: 44, // 투명 네이티브 헤더
  // 주 액션 알약 높이. 화면마다 버튼 키가 다르면 주 액션의 무게가 흔들리므로
  // `LiquidPillButton`과 그 자리를 대신하는 비활성 면이 같은 값을 참조한다.
  pillHeight: 54,
  // 플로팅 탭바 아래로 콘텐츠가 흐르므로 스크롤 끝에 이만큼 비운다.
  scrollBottom: 130,
  touchMin: 44,
  /**
   * 장비 목록 한 행의 **본문 최소 높이**(`LiquidMetricRow`의 `minContentHeight`).
   *
   * 정체 컬럼이 두 줄(이름 + 메타)일 때와 세 줄(브랜드·이름·메타)일 때 행 키가 갈리지
   * 않게 창고·배낭 상세·배낭 편집·패킹·사용 기록·탐색 목록이 같은 값을 넘긴다.
   * 세로 패딩은 프리미티브가 더하므로 호출부는 이 값만 넘긴다.
   *
   * 44는 원래 목록 행 썸네일 한 변이었다 — 썸네일을 걷어낸 뒤에도(2026-08-11 디자인 리뷰,
   * [Warehouse.md](../specs/Warehouse.md) WH-1) 행 리듬을 정하는 값으로 남아 스켈레톤
   * (도착할 행과 같은 키)까지 이 하나를 참조한다.
   */
  rowMinContent: 44,
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
    home: {
      colors: [
        'rgba(242,242,246,0.10)',
        'rgba(242,242,246,0.36)',
        'rgba(242,242,246,0.52)',
      ],
      locations: [0, 0.45, 1],
    },
    bagDetail: {
      colors: [
        'rgba(242,242,246,0.14)',
        'rgba(242,242,246,0.42)',
        'rgba(242,242,246,0.58)',
      ],
      locations: [0, 0.45, 1],
    },
    packing: {
      colors: [
        'rgba(242,242,246,0.16)',
        'rgba(242,242,246,0.50)',
        'rgba(242,242,246,0.70)',
      ],
      locations: [0, 0.4, 1],
    },
    info: {
      colors: [
        'rgba(242,242,246,0.14)',
        'rgba(242,242,246,0.50)',
        'rgba(242,242,246,0.72)',
      ],
      locations: [0, 0.4, 1],
    },
    login: {
      colors: [
        'rgba(242,242,246,0.30)',
        'rgba(242,242,246,0.60)',
        'rgba(242,242,246,0.80)',
      ],
      locations: [0, 0.5, 1],
    },
  },
  // 라임 라디얼 글로우 하나를 지면 모서리에 둔다 — 브랜드 색이 UI를 지배하지 않으면서 온기를 준다.
  glow: { size: 340, color: 'rgba(200,242,68,0.5)', fade: 0.7 },
  /**
   * 하단 고정 CTA를 받치는 지면 그라디언트(목업 §9 `to top, #F2F2F6 60%, transparent`).
   * 아래는 지면색으로 꽉 채워 뒤 콘텐츠를 끊고, 위로 갈수록 사라져 띠 경계가 보이지 않는다 —
   * 불투명 띠를 두면 버튼 주위에 각진 면이 생겨 콘텐츠가 그 뒤에서 잘려 보인다.
   * 위→아래 순서라 CSS의 `to top`을 뒤집어 둔 값이다.
   */
  ctaVeil: {
    colors: ['rgba(242,242,246,0)', 'rgba(242,242,246,1)'],
    locations: [0, 0.4],
  },
  /**
   * 가로 스크롤 칩 줄의 **우측 끝**을 지면색으로 흘려 보내는 마스크(좌→우 순서).
   * 칩이 화면 가장자리에서 그냥 잘리면 스크롤 가능이 아니라 레이아웃이 깨진 것처럼 보인다
   * (2026-08-11 디자인 리뷰). `ctaVeil`과 방향·용도가 달라 갈라 둔다.
   */
  edgeFade: {
    colors: ['rgba(242,242,246,0)', 'rgba(242,242,246,1)'],
    width: 12,
  },
  /**
   * **지도 타일 위** 상태바를 받치는 스크림(CS-2). 지도 위 시각·배터리는 뒤가 지면이 아니라
   * 지형·물·라벨이라, 흰 지형 위에서는 읽히다가 초록 숲·물 위로 팬하면 판독이 불가능해진다
   * (2026-08-11 디자인 리뷰). 위는 거의 지면색이고 상태바 높이 안에서 완전히 사라져 띠 경계가
   * 남지 않는다 — 위아래 방향이 `ctaVeil`의 반대인 짝이다.
   */
  statusVeil: {
    colors: [
      'rgba(242,242,246,0.94)',
      'rgba(242,242,246,0.72)',
      'rgba(242,242,246,0)',
    ],
    locations: [0, 0.6, 1],
  },
  /**
   * 스크롤 끝 푸터 구간에서 지면(지형 등고선)을 걷어내는 그라디언트(AU-4). 등고선이 푸터
   * 글자와 대비를 다퉈 읽기 흐름을 끊었다(2026-08-11 디자인 리뷰). 푸터와 **함께 스크롤**되는
   * 면이라 화면 하단에 고정되는 `ctaVeil`과 뜻이 갈린다 — 위는 투명하게 시작해 아래로 갈수록
   * 지면색으로 덮는다.
   */
  footerVeil: {
    colors: ['rgba(242,242,246,0)', 'rgba(242,242,246,1)'],
    locations: [0, 0.45],
  },
} as const;

/** 전환은 스프링, 오버슈트 없음 — 진행 바가 목표를 지나쳤다 돌아오면 값이 틀린 것처럼 보인다. */
export const LiquidMotion = {
  spring: { damping: 22, stiffness: 220, mass: 1, overshootClamping: true },
  pressOpacity: 0.8, // activeOpacity 0.7~0.85
  doneOpacity: 0.6, // 완료 항목은 지우지 않고 낮춘다
  // 누를 수 없는 컨트롤 — 면·모서리는 그대로 두고 투명도만 낮춘다.
  // `doneOpacity`와 값은 같지만 뜻이 다르다(완료된 기록 vs 지금 못 누르는 버튼) —
  // 한쪽 값을 조정할 때 다른 쪽이 끌려가지 않도록 이름을 갈라 둔다.
  disabledOpacity: 0.6,
} as const;
