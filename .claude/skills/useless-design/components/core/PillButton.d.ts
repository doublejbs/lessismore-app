/**
 * 화면의 주 액션 버튼. 항상 알약이고 높이는 54px로 고정한다.
 * startingPoint(handoff copy) section="Core" subtitle="주 액션 버튼 4종" viewport="700x120"
 */
export interface PillButtonProps {
  label: string;
  /** primary=잉크 · accent=라임 · secondary=흰 아웃라인 · glass=유리 */
  variant?: 'primary' | 'accent' | 'secondary' | 'glass';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** 폭을 꽉 채운다 (하단 고정 바) */
  block?: boolean;
  onClick?: () => void;
}
export function PillButton(props: PillButtonProps): JSX.Element;
