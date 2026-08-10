import { FC, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Liquid, LiquidMotion, LiquidShadow } from '@/constants/DesignTokens';

interface Props {
  onPressBack: () => void;
  /** 복사·공유·필름 카드 — 유리 캡슐 안에 나란히 앉는다 */
  actions: ReactNode;
}

// 유리 크롬 지오메트리(목업 §6). 원·캡슐 높이 38, 캡슐 안 아이콘 칸 34.
const CHROME_HEIGHT = 38;

/** 캡슐 안 아이콘 칸 한 변. 헤더가 액션을 이 칸에 담아야 캡슐 내부 여백이 맞는다. */
export const HEADER_ICON_BOX = 34;

/**
 * Android·Web용 배낭 상세 헤더 (Liquid Depth).
 *
 * iOS는 네이티브 투명 헤더가 같은 모양(원형 글래스 back + 글래스 바 버튼)을 시스템에서
 * 내주므로 이 컴포넌트를 쓰지 않는다(LG-1). 두 플랫폼이 같은 그림을 보되 만드는 주체만 다르다.
 */
const BagDetailHeaderView: FC<Props> = ({ onPressBack, actions }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.chrome, styles.backButton]}
        onPress={onPressBack}
        activeOpacity={LiquidMotion.pressOpacity}
        // 시각 지름은 38이라 여유로 44pt 터치를 채운다.
        hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
        accessibilityRole='button'
        accessibilityLabel='뒤로가기'
      >
        <BlurView
          tint='light'
          intensity={Liquid.glassBlurIntensity}
          style={StyleSheet.absoluteFill}
        />
        {/* 블러 위 유리 채움 — BlurView 배경색은 블러를 가리므로 별도 레이어로 얹는다. */}
        <View style={[StyleSheet.absoluteFill, styles.glassFill]} />
        <Ionicons name='chevron-back' size={20} color={Liquid.ink} />
      </TouchableOpacity>

      <View style={[styles.chrome, styles.actionsCapsule]}>
        <BlurView
          tint='light'
          intensity={Liquid.glassBlurIntensity}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.glassFill]} />
        {actions}
      </View>
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
  // 유리 면 공통 — 0.5px 광택 테두리 + 낮고 넓은 그림자. 채움 레이어를 알약으로 깎으려면
  // overflow: hidden이 필요한데, 같은 뷰의 boxShadow가 잘리지 않는 값(퍼짐이 작은 glassSm)이라
  // 함께 걸어도 유리가 지면에서 떠 보인다.
  chrome: {
    height: CHROME_HEIGHT,
    borderRadius: CHROME_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    boxShadow: LiquidShadow.glassSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFill: {
    backgroundColor: Liquid.glassFill,
  },
  backButton: {
    width: CHROME_HEIGHT,
  },
  // 아이콘 칸 34 + 캡슐 좌우 5 = 시스템 바 버튼 캡슐과 같은 내부 여백(목업 §6).
  actionsCapsule: {
    flexDirection: 'row',
    paddingHorizontal: 5,
    gap: 2,
  },
});

export default BagDetailHeaderView;
