import { FC } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Stack } from 'expo-router';
import {
  Edge,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingHeaderView from './BagPackingHeaderView';
import BagPackingChromeView from './BagPackingChromeView';
import BagPackingCategorySectionView from './BagPackingCategorySectionView';
import BagPackingCompleteView from './BagPackingCompleteView';
import AlertView from '@/components/alert/AlertView';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidCard from '@/components/liquid/LiquidCard';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidType,
} from '@/constants/DesignTokens';
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

/**
 * PK-2 패킹 모드 화면 (Liquid Depth, 목업 §7).
 *
 * 지면은 지형(0.8) + 가장 짙은 베일이다 — 이 화면은 읽을 지형이 아니라 **할 일 목록**이라
 * 산세를 가장 많이 눌러 둔다. 유리 진행 카드는 상단에 고정되고 목록만 그 아래로 흐른다.
 */
const BagPackingView: FC<Props> = ({ bagPacking }) => {
  const insets = useSafeAreaInsets();
  const initialized = bagPacking.isInitialized();
  // 초기화 전에도 안전하다 — 로드된 장비가 없으면 완료 판정이 서지 않는다(PK-5).
  const showCompleteCard = bagPacking.shouldShowCompleteCard();

  const handlePressBack = () => {
    void bagPacking.close();
  };

  const handlePressReset = () => {
    app.getAlertManager()?.show({
      message: '패킹을 처음부터 다시 시작할까요?',
      confirmText: '처음부터 다시',
      onConfirm: async () => {
        await bagPacking.reset();
      },
    });
  };

  /**
   * LG-1: iOS만 네이티브 투명 헤더 — 우측 `처음부터 다시`. 진행률 블록
   * (BagPackingHeaderView)은 내비가 아니라 본문에 그대로 둔다.
   *
   * 완료 카드가 떠 있는 동안은 headerRight를 아예 내린다 — 스크림은 JS 뷰라 iOS 네이티브
   * 헤더 위로 올라가지 못해, 가리지 못하는 버튼만 모달 위에서 눌리게 된다.
   *
   * **아직 하나도 챙기지 않았으면 내린다**(2026-08-11 개정, PK-4) — 0/2인 사용자에게
   * 화면의 유일한 액션이 초기화면 위계가 뒤집힌다. 지울 기록도 아직 없다.
   */
  const showReset =
    initialized &&
    !bagPacking.isEmpty() &&
    !showCompleteCard &&
    bagPacking.getPackedCount() > 0;
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
                  activeOpacity={LiquidMotion.pressOpacity}
                  style={styles.nativeResetButton}
                  accessibilityRole='button'
                  accessibilityLabel='처음부터 다시'
                >
                  <PretendardText style={styles.resetText} weight='semibold'>
                    처음부터 다시
                  </PretendardText>
                </TouchableOpacity>
              ),
            }
          : {}),
      }}
    />
  );

  // 지형 0.8 + 강한 베일(.16/.50/.70), 글로우 없음 — 유리 진행 카드가 지면 최상단에
  // 앉아 모서리 글로우가 카드 뒤에서 얼룩으로 읽힌다(목업 §7).
  const backdrop = <LiquidBackdrop screen='packing' limeGlow={false} />;

  if (!initialized) {
    // 초기화 전에는 목록을 그리지 않는다(PK §6). 지면만 먼저 깔아 흰 화면이 번쩍이지 않게 한다.
    return (
      <View style={styles.container}>
        {stackScreen}
        {backdrop}
      </View>
    );
  }

  const isEmpty = bagPacking.isEmpty();
  const categories = bagPacking.getGearsByCategory();

  return (
    <View style={styles.container}>
      {stackScreen}
      {/* 세이프에어리어 여백까지 이어져야 하므로 SafeAreaView 바깥에 둔다. */}
      {backdrop}
      <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
        <View
          style={[
            styles.container,
            // 고정 진행 카드가 상단에 있어 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
            IS_IOS && { paddingTop: insets.top + LiquidLayout.navBar },
          ]}
        >
          {!IS_IOS ? (
            <BagPackingChromeView
              onPressBack={handlePressBack}
              onPressReset={handlePressReset}
              showReset={showReset}
            />
          ) : null}

          {isEmpty ? (
            <View style={styles.emptyContainer}>
              {/* 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions). */}
              <LiquidCard tone='paper' padding={24} style={styles.emptyCard}>
                <PretendardText weight='bold' style={styles.emptyTitle}>
                  담긴 장비가 없어요
                </PretendardText>
                <PretendardText style={styles.emptyText}>
                  배낭에 장비를 담고 다시 시작해요
                </PretendardText>
              </LiquidCard>
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
                    // 카테고리가 한 종류면 라벨이 가르는 것이 없다 — 라벨 한 줄이 행 하나만큼
                    // 자리를 쓰므로 생략하고 목록을 위로 올린다(2026-08-11 개정).
                    showLabel={categories.length > 1}
                  />
                ))}
              </ScrollView>
            </>
          )}
        </View>
        {/* 이 화면은 `Layout`을 쓰지 않아 알럿을 그리는 뷰가 없다 — 직접 얹는다
            (배낭 상세와 같은 이유). 없으면 `처음부터 다시` 확인 알럿이 조용히 사라진다. */}
        <AlertView alertManager={app.getAlertManager()!} />
      </SafeAreaView>

      {/* 스크림이 세이프에어리어 여백까지 덮어야 하므로 지면처럼 SafeAreaView 형제로 둔다 —
          안쪽에 두면 상단 헤더 높이와 하단 인셋이 뚫린 채 모달이 뜬다. */}
      {showCompleteCard ? (
        <BagPackingCompleteView bagPacking={bagPacking} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 LiquidBackdrop이 깐다 — 여기 색을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
  },
  resetText: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
  // iOS 네이티브 headerRight 텍스트 버튼 — HIG 최소 터치 타깃 44pt 확보.
  nativeResetButton: {
    minHeight: LiquidLayout.touchMin,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: LiquidLayout.screenH,
    paddingHorizontal: LiquidLayout.screenH,
    // 마지막 행이 화면 밑단에 붙지 않게 비운다(핸드오프 공통 하단 여백).
    paddingBottom: LiquidLayout.scrollBottom,
    gap: LiquidLayout.section,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
});

export default observer(BagPackingView);
