import { FC } from 'react';
import { Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { Liquid } from '@/constants/DesignTokens';

interface Props {
  /** `useLiquidShimmer()`가 돌리는 값. 한 값을 여러 막대에 나눠 주면 같은 위상으로 숨 쉰다. */
  opacity: Animated.Value;
  /** 비우면 부모 폭을 채운다 — 한 줄을 통째로 차지하는 막대(진행 트랙·CTA 자리)가 그렇다. */
  width?: DimensionValue | undefined;
  height: number;
  radius?: number | undefined;
  color?: string | undefined;
  /**
   * 자리(margin·flex·alignSelf·position)는 여기로 넘긴다 — 막대의 **모양**은 props가,
   * **배치**는 부모의 스타일이 정한다.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * 스켈레톤 막대 하나(Liquid Depth). 도착할 텍스트·컨트롤의 라인박스와 같은 높이를 둬야
 * 로딩이 풀릴 때 자리가 튀지 않는다.
 *
 * 기본 색은 잉크 스케일의 가장 옅은 값이다 — 가라앉은 면(`surfaceSunken`)은 흰 카드와
 * 값이 붙어 막대 형태가 사라진다. 지면(canvas)과 흰 카드에 **동시에** 얹히는 골격은
 * 불투명 색으로 두면 한쪽에서 안 보이므로 반투명 잉크(`hairlineStrong`)를 넘긴다.
 */
const LiquidSkeletonBar: FC<Props> = ({
  opacity,
  width,
  height,
  radius = 4,
  color = Liquid.inkFaint,
  style,
}) => {
  return (
    // 골격은 **아직 없는 내용의 자리**라 스크린리더에 읽을 것이 없다 — 빈 요소로 초점을
    // 받으면 도착하지도 않은 값을 훑게 된다. 두 속성은 플랫폼이 갈린다(iOS / Android).
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    />
  );
};

export default LiquidSkeletonBar;
