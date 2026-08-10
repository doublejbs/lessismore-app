import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidType } from '@/constants/DesignTokens';

interface Props {
  children: string;
  /** 우측 보조 링크 (예: '전체 보기') */
  trailing?: ReactNode;
}

/**
 * Liquid Depth 섹션 머리 라벨(핸드오프 SectionLabel).
 * 대문자 + 0.16em 자간의 마이크로 라벨 — 이 시스템의 서명이라 값 변형 금지.
 */
const LiquidSectionLabel: FC<Props> = ({ children, trailing }) => {
  return (
    <View style={styles.row}>
      <PretendardText weight='semibold' style={styles.label}>
        {children.toUpperCase()}
      </PretendardText>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: LiquidType.micro.fontSize,
    lineHeight: LiquidType.micro.lineHeight,
    letterSpacing: LiquidType.micro.letterSpacing,
    color: Liquid.inkMuted,
  },
});

export default LiquidSectionLabel;
