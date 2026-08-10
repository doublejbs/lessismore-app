/**
 * 패킹 진행률 바. 라운드 트랙 + 라운드 채움.
 * startingPoint(handoff copy) section="Core" subtitle="진행률" viewport="700x110"
 */
export interface ProgressBarProps {
  percent: number;
  /** 라임 면 위에서는 'ink', 흰 면 위에서는 'accent' */
  tone?: 'ink' | 'accent';
  height?: number;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;
