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
