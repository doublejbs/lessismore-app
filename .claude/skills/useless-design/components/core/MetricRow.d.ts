/**
 * 장비·배낭 목록의 한 행. 좌측은 정체(브랜드·이름·메타), 우측은 수치 하나.
 * 수치가 늘 같은 자리에 와야 세로로 비교된다.
 * startingPoint(handoff copy) section="Core" subtitle="장비 목록 행" viewport="700x200"
 */
export interface MetricRowProps {
  brand?: string;
  name: string;
  /** 색상 · 사용률 등을 ' · '로 이어 붙인 한 줄 */
  meta?: string;
  value?: string | number;
  unit?: string;
  /** 라임 텍스트로 강조 */
  accent?: boolean;
  trailing?: React.ReactNode;
}
export function MetricRow(props: MetricRowProps): JSX.Element;
