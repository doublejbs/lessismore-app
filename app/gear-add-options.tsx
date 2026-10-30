import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AiSparkleIconView from '@/components/ai-gear-fill/AiSparkleIconView';
import AiGearFillEntrySource from '@/model/ai-gear-fill/AiGearFillEntrySource';
import GearAddOptionType from '@/model/gear/GearAddOptionType';
import GearAddContextType from '@/model/gear/GearAddContextType';

// GE-8: 장비 추가 진입 시트 — 배낭 추가 시트(BAG-2, bag-add-options)와 동일한 네이티브 formSheet.
// 검색으로 추가 / 직접 입력 두 갈래. 배낭 편집에서 진입하면 bagId를 넘겨 해당 배낭 컨텍스트로 이어간다.
// 배낭 컨텍스트에만 세 번째 행 `AI 추천으로 채우기`(AS §2 진입 2) — 창고에는 추천 근거(날짜·여행지)가 없다.
// 항목 선택 시 탭으로 돌아가지 않고 다음 화면으로 바로 replace(중간 탭 리로드 노출 방지).
const GearAddOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bagId, context } = useLocalSearchParams<{
    bagId?: string;
    context?: string;
  }>();
  // AI 추천 행은 실제 배낭 컨텍스트에만 — 창고(bagId 없음)·템플릿 편집에는 두지 않는다.
  const canAiFill = Boolean(bagId) && context !== GearAddContextType.Template;

  const select = (type: GearAddOptionType) => {
    if (type === GearAddOptionType.Search) {
      // 창고는 탐색 탭으로(둘러보기+검색 그대로), 배낭은 검색 모달로 그 배낭에 바로 담기.
      router.replace(bagId ? `/search?bagId=${bagId}` : '/(tabs)/search');

      return;
    }

    if (type === GearAddOptionType.AiFill) {
      if (!canAiFill) {
        return;
      }

      app.getAnalyticsManager()?.logClick('ai_gear_fill_open', {
        from: AiGearFillEntrySource.GearAdd,
      });
      router.replace(`/ai-gear-fill?bagId=${bagId}`);

      return;
    }

    router.replace(bagId ? `/custom/bag-gear/${bagId}` : '/custom');
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
          {app.getL10n().t('app.gearAdd.title')}
        </PretendardText>
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => select(GearAddOptionType.Search)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('app.gearAdd.search')}
      >
        <View style={styles.iconTile}>
          <Ionicons name='search' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            {app.getL10n().t('app.gearAdd.search')}
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            {app.getL10n().t('app.gearAdd.searchSubtitle')}
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => select(GearAddOptionType.Custom)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('app.gearAdd.custom')}
      >
        <View style={styles.iconTile}>
          <Ionicons name='create-outline' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            {app.getL10n().t('app.gearAdd.custom')}
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            {app.getL10n().t('app.gearAdd.customSubtitle')}
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>

      {canAiFill ? (
        <>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => select(GearAddOptionType.AiFill)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('app.gearAdd.ai')}
          >
            <View style={styles.iconTile}>
              <AiSparkleIconView size={20} color={Color.textPrimary} />
            </View>
            <View style={styles.rowTextWrap}>
              <PretendardText style={styles.rowTitle} weight='semibold'>
                {app.getL10n().t('app.gearAdd.ai')}
              </PretendardText>
              <PretendardText style={styles.rowSubtitle}>
                {app.getL10n().t('app.gearAdd.aiSubtitle')}
              </PretendardText>
            </View>
            <Ionicons
              name='chevron-forward'
              size={18}
              color={Color.iconMuted}
            />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Color.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.modal,
    backgroundColor: Color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  rowSubtitle: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
  },
});

export default GearAddOptionsScreen;
