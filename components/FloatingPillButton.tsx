import { FC, ReactNode } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import PretendardText from '@/components/PretendardText';

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
  const textStyle = isSecondary
    ? styles.secondaryLabel
    : styles.primaryLabel;

  return (
    <TouchableOpacity
      style={[styles.pill, pillStyle, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
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
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 6,
  },
  primaryPill: {
    backgroundColor: 'black',
    borderColor: 'black',
  },
  secondaryPill: {
    backgroundColor: 'white',
    borderColor: 'black',
  },
  primaryLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: 'white',
  },
  secondaryLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: 'black',
  },
});

export default FloatingPillButton;
