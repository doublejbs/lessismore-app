/**
 * 필터·카테고리 칩. 완전한 알약 형태이며 선택 시 잉크 채움.
 * startingPoint(handoff copy) section="Core" subtitle="필터 칩 행" viewport="700x120"
 */
export interface ChipProps {
  label: string;
  /** 선택 상태 — 잉크 채움 + 흰 글자 */
  selected?: boolean;
  /** 'sm'은 2차(세분) 필터용 */
  size?: 'md' | 'sm';
  /** 라벨 앞 색 도트 — 지도 마커 색 범례를 겸할 때 */
  dotColor?: string;
  onClick?: () => void;
}
export function Chip(props: ChipProps): JSX.Element;
