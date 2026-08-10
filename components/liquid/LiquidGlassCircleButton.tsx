import { ComponentProps, FC } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiquidGlassCapsule, {
  LIQUID_CHROME_HEIGHT,
} from '@/components/liquid/LiquidGlassCapsule';
import { Liquid } from '@/constants/DesignTokens';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** 아이콘 전용 컨트롤이라 라벨이 필수다(HIG) */
  accessibilityLabel: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 유리 원형 버튼(목업 §6·§7의 뒤로가기 원 38).
 *
 * 캡슐 셸을 폭까지 고정해 원으로 쓴다 — 같은 유리 문법을 두 벌 유지하지 않는다.
 * 시각 지름은 38이고 터치 타깃은 셸이 붙이는 여유로 44pt를 채운다.
 */
const LiquidGlassCircleButton: FC<Props> = ({
  icon,
  onPress,
  accessibilityLabel,
  iconSize = 20,
  style,
}) => (
  <LiquidGlassCapsule
    width={LIQUID_CHROME_HEIGHT}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    style={style}
  >
    <Ionicons name={icon} size={iconSize} color={Liquid.ink} />
  </LiquidGlassCapsule>
);

export default LiquidGlassCircleButton;
