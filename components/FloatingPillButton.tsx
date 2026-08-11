import { FC, ReactNode } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, AcgShadow } from '@/constants/DesignTokens';

type FloatingPillVariant = 'primary' | 'secondary';

const PILL_HEIGHT = 48;

interface Props {
  label: string;
  onPress: () => void;
  variant?: FloatingPillVariant;
  style?: StyleProp<ViewStyle>;
  leadingIcon?: ReactNode;
  disabled?: boolean;
}

/**
 * 앱 전역 하단 플로팅 액션 알약의 단일 비주얼 소스.
 * 위치(position/bottom/right 등)는 포함하지 않는다 — 호출측 래퍼가 style prop으로 담당한다.
 *
 * **주 액션은 라임 면 + 잉크 글자다**(2026-08-11). 검정 채움이었는데, 새 문법에서 잉크는
 * 글자·구분선의 색이고 화면에서 눌러야 하는 하나만 라임 면을 갖는다 — 탐색 탭이 자체로
 * 그리던 라임 알약(FD-3)과 같은 값이라, 그 화면도 이 컴포넌트를 쓰게 됐다.
 * 그림자는 이 알약에만 둔다(목록·컨트롤에는 없다) — 콘텐츠 위에 떠 있는 유일한 요소다.
 */
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
      {leadingIcon}
      <PretendardText style={textStyle} weight='semibold'>
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    // 고정 높이 대신 최소 높이 — Dynamic Type에서 라벨이 잘리지 않게 한다.
    minHeight: PILL_HEIGHT,
    // 높이가 커져도 알약을 유지한다.
    borderRadius: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    boxShadow: AcgShadow.card,
  },
  // 라임 면에는 테두리를 두지 않는다 — 면과 테두리가 겹치면 알약이 두꺼워 보인다.
  primaryPill: {
    backgroundColor: Acg.lime,
  },
  // 보조 액션은 흰 면 + 잉크 테두리(라임은 화면당 하나).
  secondaryPill: {
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.ink,
  },
  primaryLabel: {
    fontSize: AcgFontSize.control,
    lineHeight: 20,
    color: Acg.ink,
  },
  secondaryLabel: {
    fontSize: AcgFontSize.control,
    lineHeight: 20,
    color: Acg.ink,
  },
});

export default FloatingPillButton;
