import { forwardRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  accessibilityLabel?: string;
  // 'primary'(기본): 큰 아웃라인 칩, 선택 시 검정 채움.
  // 'secondary': 2차(세분) 필터용 — 한 단계 작고 연한 톤(선택 시 연회색 채움)으로 1차와 위계 구분.
  variant?: 'primary' | 'secondary';
}

// 앱 공용 선택형 필터·카테고리 칩. 아웃라인 톤(비선택 테두리 / 선택 검정 채움),
// Dynamic Type 대응(고정 높이 없이 minHeight+패딩으로 확장), 44pt 터치(hitSlop).
//
// **Liquid Depth로 이식된 화면은 이 칩을 쓰지 않는다** — 유리·지도용 톤과 색 도트 범례는
// 공용 `components/liquid/LiquidChip`이 맡는다. 이 컴포넌트는 아직 이식하지 않은 화면
// (장비 편집·커스텀 장비·배낭 편집 필터)이 쓰는 이전 세대 문법이다.
const CategoryChipView = forwardRef<View, Props>(
  (
    {
      label,
      selected = false,
      onPress,
      count,
      accessibilityLabel,
      variant = 'primary',
    },
    ref
  ) => {
    const isSecondary = variant === 'secondary';

    return (
      <View ref={ref}>
        <TouchableOpacity
          style={[
            styles.chip,
            isSecondary && styles.chipSecondary,
            isSecondary
              ? selected
                ? styles.chipSecondarySelected
                : styles.chipSecondaryUnselected
              : selected
                ? styles.chipSelected
                : styles.chipUnselected,
          ]}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
          accessibilityRole='button'
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ selected }}
        >
          <PretendardText
            weight='medium'
            style={[
              styles.chipText,
              isSecondary && styles.chipTextSecondary,
              isSecondary
                ? selected
                  ? styles.chipTextSecondarySelected
                  : styles.chipTextUnselected
                : selected
                  ? styles.chipTextSelected
                  : styles.chipTextUnselected,
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
  // 2차(세분) 칩 — 한 단계 작게(높이·패딩·폰트↓).
  chipSecondary: {
    minHeight: 28,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 4,
  },
  // 선택 시 검정 대신 연회색 채움(테두리 없음) — 1차 검정 칩과 위계 구분.
  chipSecondarySelected: {
    backgroundColor: Color.chipInactiveBg,
    borderColor: Color.chipInactiveBg,
  },
  chipSecondaryUnselected: {
    backgroundColor: Color.background,
    borderColor: Color.chipBorder,
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSecondary: {
    fontSize: 13,
  },
  chipTextUnselected: {
    color: Color.textSecondary,
  },
  chipTextSelected: {
    color: Color.background,
  },
  // 2차 선택 시 연회색 채움 위 검정 텍스트(볼드감은 medium 유지).
  chipTextSecondarySelected: {
    color: Color.textPrimary,
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
