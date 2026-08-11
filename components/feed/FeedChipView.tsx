import { forwardRef, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, AcgRadius } from '@/constants/DesignTokens';

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

// FD-3: 필터 칩(레퍼런스 톤). 연회색 채움 + 둥근 사각(`AcgRadius.chip`), 선택 시 잉크 채움 + 흰 글자.
// 탐색 탭에서 시작해 홈·배낭 상세로 넓혔다 — 같은 동작에는 같은 컨트롤이어야 한다.
// 아웃라인 톤의 공용 `CategoryChipView`는 아직 이식하지 않은 화면들이 쓴다.
//
// **ref를 받는다**: 배낭 상세(BD-2)는 선택한 칩이 가로 스크롤 밖일 때 보이도록 스크롤하는데,
// 그 계산이 칩의 화면 좌표를 재야 한다 — 계산은 모델이 하고 여기서는 노드만 넘긴다.
const CHIP_HEIGHT = 36;

const COMPACT_CHIP_HEIGHT = 32;

const FeedChipView = forwardRef<View, Props>(function FeedChipView(
  {
    label,
    onPress,
    selected = false,
    leadingIcon,
    compact = false,
    accessibilityLabel,
  },
  ref
) {
  return (
    <TouchableOpacity
      ref={ref}
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
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // 고정 높이 대신 최소 높이 — Dynamic Type에서 라벨이 잘리지 않게 한다.
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  chipCompact: {
    minHeight: COMPACT_CHIP_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: AcgRadius.chip,
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
    fontSize: AcgFontSize.meta,
  },
  labelSelected: {
    color: Acg.paper,
  },
});

export default FeedChipView;
