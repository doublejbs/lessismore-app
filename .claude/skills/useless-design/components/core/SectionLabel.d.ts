/**
 * 섹션 머리 라벨. 대문자 + .16em 자간이 이 시스템의 서명이다.
 * startingPoint(handoff copy) section="Core" subtitle="섹션 라벨" viewport="700x110"
 */
export interface SectionLabelProps {
  children: React.ReactNode;
  /** 우측 보조 링크 (예: '전체 보기') */
  trailing?: React.ReactNode;
}
export function SectionLabel(props: SectionLabelProps): JSX.Element;
