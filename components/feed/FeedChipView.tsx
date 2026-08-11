import { FC, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize } from '@/constants/DesignTokens';

interface Props {
  label: string;
  onPress: () => void;
  selected?: boolean;
  // 라벨 왼쪽 아이콘 — 필터 시트를 여는 칩이 필터 아이콘을 단다(레퍼런스).
  leadingIcon?: ReactNode;
  // 2차(세분) 카테고리 행용 — 한 단계 작게 줄여 1차 칩과 위계를 구분한다.
  compact?: boolean;
  accessibilityLabel?: string;
}

// FD-3: 탐색 탭 필터 칩(레퍼런스 톤). 연회색 채움 + 알약, 선택 시 잉크 채움 + 흰 글자.
// 공용 `CategoryChipView`는 앱 전 화면이 쓰는 아웃라인 칩이라 값이 다르고,
// 탐색 탭만 이 톤을 쓰므로 별도 컴포넌트로 둔다.
const CHIP_HEIGHT = 36;

const COMPACT_CHIP_HEIGHT = 32;

const FeedChipView: FC<Props> = ({
  label,
  onPress,
  selected = false,
  leadingIcon,
  compact = false,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        compact && styles.chipCompact,
        selected && styles.chipSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
    >
      {leadingIcon}
      <PretendardText
        style={[
          styles.label,
          compact && styles.labelCompact,
          selected && styles.labelSelected,
        ]}
        weight='semibold'
      >
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // 고정 높이 대신 최소 높이 — Dynamic Type에서 라벨이 잘리지 않게 한다.
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: 14,
    // 높이가 커져도 알약을 유지한다(레퍼런스: radius full).
    borderRadius: CHIP_HEIGHT,
    backgroundColor: Acg.controlFill,
  },
  chipCompact: {
    minHeight: COMPACT_CHIP_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: COMPACT_CHIP_HEIGHT,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: Acg.ink,
  },
  label: {
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
  labelCompact: {
    fontSize: 13,
  },
  labelSelected: {
    color: Acg.paper,
  },
});

export default FeedChipView;
