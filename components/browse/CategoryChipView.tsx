import { forwardRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '../PretendardText';
import { Acg, Color, Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  // 라벨 앞 색 도트 — 칩이 색 범례를 겸할 때 사용(예: 지도 유형 필터의 마커 색).
  dotColor?: string;
  accessibilityLabel?: string;
  // 'primary'(기본): 큰 아웃라인 칩, 선택 시 검정 채움.
  // 'secondary': 2차(세분) 필터용 — 한 단계 작고 연한 톤(선택 시 연회색 채움)으로 1차와 위계 구분.
  variant?: 'primary' | 'secondary';
  // 'acg': ACG 리디자인 화면(홈·탐색)용 톤. 비선택은 유리 면(반투명 흰 채움 + 광택 테두리),
  //   선택은 잉크 채움이다. 지면이 흰색이 아니라(#F4F3EF) 기본 톤의 흰 칩은 배경과 붙어 보였다.
  //   실제 블러는 쓰지 않는다 — 가로 스크롤에 칩 수만큼 BlurView를 얹는 비용이 얻는 것보다 크다.
  // 'acgSolid': 지도 위처럼 뒤가 단색이 아닌 곳용. 비선택도 불투명 종이 면이라 지도 라벨이
  //   비쳐 겹치지 않는다. 선택은 'acg'와 같은 잉크 채움 — 2차 칩도 회색이 아니라 잉크다.
  tone?: 'default' | 'acg' | 'acgSolid';
}

// 앱 공용 선택형 필터·카테고리 칩. 아웃라인 톤(비선택 테두리 / 선택 검정 채움),
// Dynamic Type 대응(고정 높이 없이 minHeight+패딩으로 확장), 44pt 터치(hitSlop).
const CategoryChipView = forwardRef<View, Props>(
  (
    {
      label,
      selected = false,
      onPress,
      count,
      dotColor,
      accessibilityLabel,
      variant = 'primary',
      tone = 'default',
    },
    ref
  ) => {
    const isSecondary = variant === 'secondary';
    // 선택 시 잉크 채움은 두 ACG 톤이 공유한다. 비선택 채움만 갈린다(유리 / 불투명).
    const isAcg = tone === 'acg' || tone === 'acgSolid';
    const isGlass = tone === 'acg';

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
            isAcg &&
              (selected
                ? styles.chipAcgSelected
                : isGlass
                  ? styles.chipAcgUnselected
                  : styles.chipAcgSolidUnselected),
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
                // 선택(잉크 채움) 상태에서 어두운 도트가 묻히지 않게 흰 테두리를 두른다.
                // 2차 칩은 기본 톤에서 연회색 채움이라 예외지만, ACG 톤은 2차도 잉크라 필요하다.
                selected && (!isSecondary || isAcg) && styles.dotSelected,
              ]}
            />
          )}
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
              isAcg &&
                (selected
                  ? styles.chipTextAcgSelected
                  : styles.chipTextAcgUnselected),
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
  // ACG 유리 칩 — 채움은 시안(흰 50%)보다 올린다. RN에는 backdrop-filter가 없어
  // 블러가 만들던 밝기를 채움으로 대신 낸다.
  chipAcgUnselected: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: Acg.glassStroke,
  },
  chipAcgSelected: {
    backgroundColor: Acg.ink,
    borderColor: Acg.ink,
  },
  chipAcgSolidUnselected: {
    backgroundColor: Acg.paper,
    borderColor: Acg.line2,
  },
  // 지도 마커가 각진 사각이라 범례도 같은 형태로 둔다 — 원이면 범례와 마커가 따로 논다.
  dot: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
  dotSelected: {
    borderWidth: 1,
    borderColor: Color.background,
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
  chipTextAcgUnselected: {
    color: Acg.textSecondary,
  },
  chipTextAcgSelected: {
    color: Acg.paper,
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
