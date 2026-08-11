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

// 앱 공용 선택형 필터·카테고리 칩.
//
// **2026-08-11 레퍼런스 이식**: 아웃라인(흰 면 + 테두리)에서 **연회색 채움 알약**으로 바꿨다 —
// 탐색 탭의 `FeedChipView`와 같은 값이다. 두 칩이 같은 동작을 하는데 생김새가 달랐고, 순백
// 지면에서는 흰 칩이 지면과 붙어 테두리만 남았다. 여기 값을 갈아 끼우면 이 칩을 쓰는 화면
// (창고·지도·브랜드·순위 등)이 함께 따라온다.
// Dynamic Type 대응(고정 높이 없이 minHeight+패딩으로 확장), 44pt 터치(hitSlop)는 그대로다.
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
    // 탐색 칩(FeedChipView)과 같은 크기·모서리.
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // 테두리를 두지 않는다 — 채움이 이미 면을 만들고, 둘을 겹치면 칩이 두꺼워 보인다.
  chipUnselected: {
    backgroundColor: Color.chipInactiveBg,
  },
  chipSelected: {
    backgroundColor: Color.chipActiveBg,
  },
  // 2차(세분) 칩 — 한 단계 작게(높이·패딩·폰트↓). FeedChipView의 compact와 같은 값이다.
  chipSecondary: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  // 2차도 선택은 잉크 채움이다 — 연회색 선택은 비선택 칩과 구분되지 않았다.
  chipSecondarySelected: {
    backgroundColor: Color.chipActiveBg,
  },
  chipSecondaryUnselected: {
    backgroundColor: Color.chipInactiveBg,
  },
  // ACG 유리 칩 — 채움은 시안(흰 50%)보다 올린다. RN에는 backdrop-filter가 없어
  // 블러가 만들던 밝기를 채움으로 대신 낸다.
  chipAcgUnselected: {
    backgroundColor: Acg.controlFill,
  },
  chipAcgSelected: {
    backgroundColor: Acg.ink,
  },
  // 지도 위처럼 뒤가 단색이 아닌 곳 — 지도 라벨이 비쳐 겹치지 않게 불투명 흰 면 + 헤어라인.
  chipAcgSolidUnselected: {
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
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
    fontSize: 15,
  },
  chipTextSecondary: {
    fontSize: 13,
  },
  // 비선택 라벨은 회색이 아니라 잉크다 — 연회색 면 위에서 회색 글자는 눌러야 하는 컨트롤로
  // 읽히지 않는다(탐색 칩과 같은 규칙).
  chipTextUnselected: {
    color: Color.textPrimary,
  },
  chipTextSelected: {
    color: Color.background,
  },
  // 2차 선택 시 연회색 채움 위 검정 텍스트(볼드감은 medium 유지).
  chipTextSecondarySelected: {
    color: Color.background,
  },
  chipTextAcgUnselected: {
    color: Acg.ink,
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
