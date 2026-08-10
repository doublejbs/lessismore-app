/**
 * 숫자 하나 + 라벨 하나짜리 지표 타일. 2~3개를 가로로 나란히 둔다.
 * startingPoint(handoff copy) section="Core" subtitle="지표 타일" viewport="700x160"
 */
export interface StatTileProps {
  value: string | number;
  label: string;
  /** 강조할 지표 하나에만 'accent' */
  tone?: 'paper' | 'accent';
}
export function StatTile(props: StatTileProps): JSX.Element;
