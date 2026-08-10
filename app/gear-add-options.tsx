import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

// GE-8: 장비 추가 진입 시트 — 배낭 추가 시트(BAG-2, bag-add-options)와 동일한 네이티브 formSheet.
// 검색으로 추가 / 직접 입력 두 갈래. 배낭 편집에서 진입하면 bagId를 넘겨 해당 배낭 컨텍스트로 이어간다.
// 항목 선택 시 탭으로 돌아가지 않고 다음 화면으로 바로 replace(중간 탭 리로드 노출 방지).
const GearAddOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bagId } = useLocalSearchParams<{ bagId?: string }>();

  const select = (type: 'search' | 'custom') => {
    if (type === 'search') {
      // 창고는 탐색 탭으로(둘러보기+검색 그대로), 배낭은 검색 모달로 그 배낭에 바로 담기.
      router.replace(bagId ? `/search?bagId=${bagId}` : '/(tabs)/search');
    } else {
      router.replace(bagId ? `/custom/bag-gear/${bagId}` : '/custom');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom - 16, 12) },
      ]}
    >
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          장비 추가
        </PretendardText>
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('search')}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='검색으로 추가'
      >
        <View style={styles.iconTile}>
          <Ionicons name='search' size={20} color={Liquid.ink} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            검색으로 추가
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            카탈로그에서 찾아 담아요
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Liquid.inkSubtle} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('custom')}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='직접 입력'
      >
        <View style={styles.iconTile}>
          <Ionicons name='create-outline' size={20} color={Liquid.ink} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            직접 입력
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            제품 정보를 직접 입력해요
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Liquid.inkSubtle} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 진입 시트는 종이 면이다 — 고를 것이 두 줄뿐이라 카드를 겹치지 않고 면 하나에 담는다.
    backgroundColor: Liquid.surface,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 8,
  },
  header: {
    paddingVertical: 12,
  },
  // 시트 제목은 화면 대상이라 title3 — 행 제목(17)과 위계가 갈린다(sort-sheet 선례).
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: LiquidLayout.touchMin,
    paddingVertical: 14,
    gap: 14,
  },
  // 카드 안에 겹쳐 놓는 작은 타일과 같은 모서리 — 각진 면은 이 시스템에 없다.
  iconTile: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    borderRadius: LiquidRadius.tileSm,
    backgroundColor: Liquid.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  rowSubtitle: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  // 행 사이는 헤어라인 하나로만 나눈다.
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
});

export default GearAddOptionsScreen;
