import { FC, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

interface Props {
  label: string;
  onPress: () => void;
  leadingIcon?: ReactNode;
  accessibilityLabel?: string;
}

const MIN_HEIGHT = 44;

/**
 * 본문 안에 놓이는 보조 알약 — 흰 면 + 잉크 테두리, 최소 높이 44(라임은 화면당 하나라 보조는 이 모양).
 * `FloatingPillButton variant='secondary'`와 면·테두리는 같지만, 그쪽은 콘텐츠 위에 떠 있는 버튼이라
 * 그림자가 있다. 목록·빈 상태 블록 아래처럼 지면에 놓이는 자리에는 그림자 없는 이 알약을 쓴다.
 */
const SecondaryPillButtonView: FC<Props> = ({
  label,
  onPress,
  leadingIcon,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {leadingIcon}
      <PretendardText style={styles.label} weight='semibold'>
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: MIN_HEIGHT,
    borderRadius: MIN_HEIGHT,
    borderWidth: 1,
    borderColor: Acg.ink,
    backgroundColor: Acg.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default SecondaryPillButtonView;
