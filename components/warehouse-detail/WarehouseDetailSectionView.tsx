import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  title: string;
  // 제목 줄 우측에 붙는 요약(예: 리뷰 평점). 제목이 면 밖에 있으므로 제목과 짝지어
  // 읽히던 요약도 같이 밖으로 나와야 한다.
  accessory?: ReactNode;
  // 'card'(기본): 내용 전체를 흰 카드 하나에 담는다 — 표·지표처럼 한 덩어리인 내용용.
  // 'list': 면을 두지 않고 자식이 각자 면을 갖는다(목록·외부 후기).
  variant?: 'card' | 'list';
  children: ReactNode;
}

/**
 * 장비 상세의 섹션 껍데기 (Liquid Depth, 목업 §9).
 *
 * 섹션은 큰 제목이 아니라 **대문자 마이크로 라벨**로 연다 — 이 시스템의 서명이라
 * 제목 크기로 위계를 내던 ACG 문법(18pt/700)을 그대로 옮기지 않는다.
 * 라벨은 지면 위에 두고 내용만 흰 면에 얹는다.
 */
const WarehouseDetailSectionView: FC<Props> = ({
  title,
  accessory,
  variant = 'card',
  children,
}) => {
  return (
    <View style={styles.section}>
      <LiquidSectionLabel trailing={accessory}>{title}</LiquidSectionLabel>

      {variant === 'card' ? (
        // 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 그림자를
        // 걸면 자기 경계에서 잘린다(창고 목록과 같은 구조).
        <View style={styles.cardShell}>
          <View style={styles.cardClip}>{children}</View>
        </View>
      ) : (
        <View style={styles.list}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginHorizontal: LiquidLayout.screenH,
    marginBottom: LiquidLayout.section,
  },
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
    backgroundColor: Liquid.surface,
    paddingHorizontal: LiquidLayout.cardPad,
    // 첫 행·마지막 행이 모서리에 붙지 않을 정도만 — 행 자체가 세로 여백을 갖는다(목업 §9).
    paddingVertical: 4,
  },
  list: {
    gap: LiquidLayout.listGap,
  },
});

export default WarehouseDetailSectionView;
