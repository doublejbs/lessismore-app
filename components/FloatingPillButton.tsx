import { FC, ReactNode } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import AcgGlassView from '@/components/acg/AcgGlassView';
import AcgGlassTint from '@/components/acg/AcgGlassTint';
import { Acg, AcgShadow, Color, Radius } from '@/constants/DesignTokens';

type FloatingPillVariant = 'primary' | 'secondary';

interface Props {
  label: string;
  onPress: () => void;
  variant?: FloatingPillVariant;
  style?: StyleProp<ViewStyle>;
  leadingIcon?: ReactNode;
  disabled?: boolean;
}

// 앱 전역 하단 플로팅 액션 pill의 단일 비주얼 소스.
// 위치(position/bottom/right 등)는 포함하지 않는다 — 호출측 래퍼가 style prop으로 위치를 담당한다.
const FloatingPillButton: FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  style,
  leadingIcon,
  disabled = false,
}) => {
  const isSecondary = variant === 'secondary';
  const pillStyle = isSecondary ? styles.secondaryPill : styles.primaryPill;
  const textStyle = isSecondary ? styles.secondaryLabel : styles.primaryLabel;

  return (
    <TouchableOpacity
      style={[styles.pill, pillStyle, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      {/* 채움을 내는 유리 레이어. 알약 지오메트리(높이·패딩·정렬)는 이 버튼이 그대로
          들고 있고, 유리는 뒤에 깔리기만 한다 — 레이어를 더할 뿐 배치를 바꾸지 않는다.
          그림자는 이 버튼이 내므로(overflow로 잘리지 않게) 유리는 elevated를 끈다. */}
      <AcgGlassView
        tint={isSecondary ? AcgGlassTint.Clear : AcgGlassTint.Ink}
        elevated={false}
        // 면 자체가 컨트롤이라 시스템 유리의 터치 반응(빛이 손가락 쪽으로 휘는 것)을 켠다.
        interactive
        style={styles.glassLayer}
      />
      {leadingIcon}
      <PretendardText style={textStyle} weight='semibold'>
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 6,
    // 유리는 단색 면과 달리 뒤가 비쳐 경계가 약하다 — 콘텐츠 위에 떠 있다는 것을
    // 그림자로 알린다. 좌표·크기가 아니라 깊이(재질)에 속하는 값이다.
    // 여기에 `overflow: 'hidden'`을 주면 iOS에서 이 그림자까지 잘린다 — 유리 레이어는
    // 자기 borderRadius로 스스로 잘리므로 알약 쪽에서 자를 필요가 없다.
    boxShadow: AcgShadow.glass,
  },
  // 채움은 유리 레이어가 낸다. 여기 남는 건 스펙큘러 엣지뿐이다.
  primaryPill: {
    backgroundColor: 'transparent',
    borderColor: Acg.glassInkStroke,
    borderTopColor: Acg.glassInkStrokeTop,
  },
  secondaryPill: {
    backgroundColor: 'transparent',
    borderColor: Acg.glassStroke,
    borderTopColor: Acg.glassStrokeTop,
  },
  glassLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // 테두리는 알약 쪽이 그린다 — 여기서 또 그리면 두 겹이 된다.
    borderWidth: 0,
    borderRadius: Radius.pill,
  },
  primaryLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: Color.background,
  },
  secondaryLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: Color.textPrimary,
  },
});

export default FloatingPillButton;
