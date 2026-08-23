import { FC } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import {
  Edge,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingHeaderView from './BagPackingHeaderView';
import BagPackingCategorySectionView from './BagPackingCategorySectionView';
import BagPackingCompleteView from './BagPackingCompleteView';
import AlertView from '@/components/alert/AlertView';
import { Acg, AcgLayout, AcgType, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  bagPacking: BagPacking;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const SAFE_AREA_EDGES: readonly Edge[] = IS_IOS
  ? ['left', 'right', 'bottom']
  : ['top', 'left', 'right', 'bottom'];
// iOS 26 투명 헤더는 배경이 없어(진행률 블록이 상단 고정) 콘텐츠 상단 여백을
// 세이프에어리어 + 컴팩트 바 높이(44pt)로 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = 44;

const BagPackingView: FC<Props> = ({ bagPacking }) => {
  const insets = useSafeAreaInsets();
  const initialized = bagPacking.isInitialized();

  const handlePressBack = () => {
    void bagPacking.close();
  };

  const handlePressReset = () => {
    app.getAlertManager()?.show({
      message: app.getL10n().t('packing.restartConfirm'),
      confirmText: app.getL10n().t('packing.restart'),
      onConfirm: async () => {
        await bagPacking.reset();
      },
    });
  };

  // LG-1: iOS만 네이티브 투명 헤더 — 우측 '처음부터 다시'는 장비가 있을 때만(기존과 동일).
  // 진행률 블록(BagPackingHeaderView)은 내비가 아니라 본문에 그대로 둔다.
  const showReset = initialized && !bagPacking.isEmpty();
  const stackScreen = (
    <Stack.Screen
      options={{
        headerShown: IS_IOS,
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        ...(showReset
          ? {
              headerRight: () => (
                <TouchableOpacity
                  onPress={handlePressReset}
                  activeOpacity={0.7}
                  style={styles.nativeResetButton}
                  accessibilityRole='button'
                  accessibilityLabel={app.getL10n().t('packing.restart')}
                >
                  <PretendardText style={styles.resetText} weight='medium'>
                    {app.getL10n().t('packing.restart')}
                  </PretendardText>
                </TouchableOpacity>
              ),
            }
          : {}),
      }}
    />
  );

  if (!initialized) {
    return stackScreen;
  }

  const isEmpty = bagPacking.isEmpty();
  const showCompleteCard = bagPacking.shouldShowCompleteCard();
  const categories = bagPacking.getGearsByCategory();

  return (
    <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
      {stackScreen}
      {/* 배낭 상세와 같은 지형 이미지 지면(ACG). */}
      <View style={styles.ground} />
      <View
        style={[
          styles.container,
          // 고정 진행률 블록이 상단에 있어 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
          IS_IOS && {
            paddingTop:
              insets.top + IOS_HEADER_BAR_HEIGHT + Spacing.item,
          },
        ]}
      >
        {!IS_IOS && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
            {!isEmpty && (
              <TouchableOpacity onPress={handlePressReset} activeOpacity={0.7}>
                <PretendardText style={styles.resetText} weight='medium'>
                  {app.getL10n().t('packing.restart')}
                </PretendardText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <PretendardText style={styles.emptyText} weight='medium'>
              {app.getL10n().t('packing.empty')}
            </PretendardText>
          </View>
        ) : (
          <>
            <BagPackingHeaderView bagPacking={bagPacking} />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {categories.map(({ category, gears }) => (
                <BagPackingCategorySectionView
                  key={category.getFilter()}
                  category={category}
                  gears={gears}
                  bagPacking={bagPacking}
                />
              ))}
            </ScrollView>
          </>
        )}

        {showCompleteCard && <BagPackingCompleteView bagPacking={bagPacking} />}
      </View>
      <AlertView alertManager={app.getAlertManager()!} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
  container: {
    flex: 1,
    // 지면은 아래 `ground`가 깐다.
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 콘텐츠와 같은 정렬선(2026-08-13) — 20으로 두면 아래 목록(24)과 4pt 어긋난다.
    paddingHorizontal: AcgLayout.screenPadding,
    paddingVertical: 12,
  },
  resetText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  // iOS 네이티브 headerRight 텍스트 버튼 — HIG 최소 터치 타깃 44pt 확보.
  nativeResetButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: AcgLayout.screenH,
    paddingBottom: 80,
    gap: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
});

export default observer(BagPackingView);
