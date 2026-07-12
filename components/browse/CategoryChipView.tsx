import { forwardRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  // 라벨 앞 색 도트 — 칩이 색 범례를 겸할 때 사용(예: 지도 유형 필터의 마커 색).
  dotColor?: string;
  accessibilityLabel?: string;
}

// 앱 공용 선택형 필터·카테고리 칩. 아웃라인 톤(비선택 테두리 / 선택 검정 채움),
// Dynamic Type 대응(고정 높이 없이 minHeight+패딩으로 확장), 44pt 터치(hitSlop).
const CategoryChipView = forwardRef<View, Props>(
  (
    { label, selected = false, onPress, count, dotColor, accessibilityLabel },
    ref
  ) => {
    return (
      <View ref={ref}>
        <TouchableOpacity
          style={[
            styles.chip,
            selected ? styles.chipSelected : styles.chipUnselected,
          ]}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
          accessibilityRole='button'
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ selected }}
        >
          {dotColor !== undefined && (
            <View
              style={[
                styles.dot,
                { backgroundColor: dotColor },
                // 선택(검정 채움) 상태에서 어두운 도트가 묻히지 않게 흰 테두리를 두른다.
                selected && styles.dotSelected,
              ]}
            />
          )}
          <PretendardText
            weight='medium'
            style={[
              styles.chipText,
              selected ? styles.chipTextSelected : styles.chipTextUnselected,
            ]}
          >
            {label}
          </PretendardText>
          {count !== undefined && (
            <View
              style={[
                styles.countBadge,
                selected
                  ? styles.countBadgeSelected
                  : styles.countBadgeUnselected,
              ]}
            >
              <PretendardText weight='medium' style={styles.countText}>
                {count}
              </PretendardText>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }
);

CategoryChipView.displayName = 'CategoryChipView';

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.chip,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipUnselected: {
    backgroundColor: Color.background,
    borderColor: Color.chipBorder,
  },
  chipSelected: {
    backgroundColor: Color.chipActiveBg,
    borderColor: Color.chipActiveBg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSelected: {
    borderWidth: 1,
    borderColor: Color.background,
  },
  chipText: {
    fontSize: 14,
  },
  chipTextUnselected: {
    color: Color.textSecondary,
  },
  chipTextSelected: {
    color: Color.background,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeUnselected: {
    backgroundColor: Color.chipInactiveBg,
  },
  countBadgeSelected: {
    backgroundColor: Color.background,
  },
  countText: {
    fontSize: 12,
    color: Color.textPrimary,
  },
});

export default CategoryChipView;
