import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';

interface Props {
  onPressBack: () => void;
  /** 복사·공유·필름 카드 — 유리 캡슐 안에 나란히 앉는다 */
  actions: ReactNode;
}

/** 캡슐 안 아이콘 칸 한 변. 헤더가 액션을 이 칸에 담아야 캡슐 내부 여백이 맞는다. */
export const HEADER_ICON_BOX = 34;

// 아이콘 칸 34 + 캡슐 좌우 5 = 시스템 바 버튼 캡슐과 같은 내부 여백(목업 §6).
const ACTIONS_PAD_H = 5;
const ACTIONS_GAP = 2;

/**
 * Android·Web용 배낭 상세 헤더 (Liquid Depth).
 *
 * iOS는 네이티브 투명 헤더가 같은 모양(원형 글래스 back + 글래스 바 버튼)을 시스템에서
 * 내주므로 이 컴포넌트를 쓰지 않는다(LG-1). 두 플랫폼이 같은 그림을 보되 만드는 주체만 다르다.
 */
const BagDetailHeaderView: FC<Props> = ({ onPressBack, actions }) => {
  return (
    <View style={styles.header}>
      <LiquidGlassCircleButton
        icon='chevron-back'
        onPress={onPressBack}
        accessibilityLabel='뒤로가기'
      />

      <LiquidGlassCapsule paddingHorizontal={ACTIONS_PAD_H} gap={ACTIONS_GAP}>
        {actions}
      </LiquidGlassCapsule>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
});

export default BagDetailHeaderView;
