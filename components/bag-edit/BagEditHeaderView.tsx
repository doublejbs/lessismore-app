import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import BagEditWeightTitleView from './BagEditWeightTitleView';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';

interface Props {
  // 배낭 총 무게의 저장값(g) — 서식은 타이틀 컴포넌트가 만든다(DM-26).
  weightGram: number;
  onPressBack: () => void;
  onPressAddGear: () => void;
}

/**
 * Android/Web 전용 배낭 편집 크롬 (Liquid Depth) — iOS는 네이티브 스택 헤더를 쓴다(LG-1).
 *
 * 좌우는 유리 원형 버튼이고 가운데는 무게 카운트업 타이틀이다. 지면이 비쳐야 하므로
 * 크롬에 면을 깔지 않는다(패킹·창고 크롬과 같은 처리). 무게 타이틀은 iOS
 * `headerTitle`과 같은 컴포넌트를 공유해 두 플랫폼이 같은 값을 같은 서체로 말한다.
 */
const BagEditHeaderView: FC<Props> = ({
  weightGram,
  onPressBack,
  onPressAddGear,
}) => {
  return (
    <View style={styles.header}>
      <LiquidGlassCircleButton
        icon='chevron-back'
        onPress={onPressBack}
        accessibilityLabel='뒤로가기'
      />
      <BagEditWeightTitleView
        weightGram={weightGram}
        fontSize={28}
        style={styles.weightText}
      />
      {/* 장비 추가 — 아이콘 전용 컨트롤이라 라벨을 붙인다(HIG). */}
      <LiquidGlassCircleButton
        icon='add'
        iconSize={22}
        onPress={onPressAddGear}
        accessibilityLabel='장비 추가'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  weightText: {
    flex: 1,
    textAlign: 'center',
  },
});

export default BagEditHeaderView;
