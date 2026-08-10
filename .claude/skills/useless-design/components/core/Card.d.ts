/**
 * 콘텐츠 면. 이 시스템에서 구획은 그림자가 아니라 면이 맡는다.
 * startingPoint(handoff copy) section="Core" subtitle="면 5종 — 종이·조용함·유리·라임·잉크" viewport="700x180"
 */
export interface CardProps {
  children?: React.ReactNode;
  /** paper=흰 카드 · quiet=지난 항목 · glass=떠 있는 면 · accent=라임 · ink=잉크 */
  tone?: 'paper' | 'quiet' | 'glass' | 'accent' | 'ink';
  radius?: 'tile' | 'card' | 'hero' | 'sheet';
  padding?: number;
}
export function Card(props: CardProps): JSX.Element;
