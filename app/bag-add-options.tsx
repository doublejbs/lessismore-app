import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
import { createQuickBag } from '@/model/bag/QuickBagDefaults';

// BAG-2: 배낭 추가 진입 시트 — iOS/Android 네이티브 formSheet(react-native-screens)로 표시.
// 그래버·드래그 닫기는 OS 레벨. 항목 선택 시 시트를 먼저 닫고, 브리지로 다음 모달을 연다.
const BagAddOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const select = async (type: 'create' | 'copy') => {
    if (type === 'copy') {
      // 탭으로 돌아가지 않고 다음 시트로 바로 교체 (중간 탭 리로드 노출 방지).
      router.replace('/bag-copy-source');

      return;
    }

    // 새로 만들기는 입력을 받지 않는다(BAG-2) — 시트를 닫고 바로 만들어 상세로 보낸다.
    router.back();
    await createQuickBag(router);
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
          배낭 추가
        </PretendardText>
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('create')}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='새로 만들기'
      >
        <View style={styles.iconTile}>
          {/* 아이콘은 Ionicons로 통일한다 — SF Symbols는 탭바만 쓴다(프로젝트 규칙). */}
          <Ionicons name='add' size={22} color={Liquid.ink} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            새로 만들기
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            빈 배낭으로 시작해요
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Liquid.inkSubtle} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('copy')}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='기존 배낭 복사하기'
      >
        <View style={styles.iconTile}>
          <Ionicons name='copy-outline' size={20} color={Liquid.ink} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            기존 배낭 복사하기
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            이전 배낭을 그대로 가져와요
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

export default BagAddOptionsScreen;
