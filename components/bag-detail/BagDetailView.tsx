import { observer } from 'mobx-react-lite';
import { FC, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Spacing } from '@/constants/DesignTokens';
import BagDetailCategoryView from './BagDetailCategoryView';
import BagDetailDateView from './BagDetailDateView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetailNameView from './BagDetailNameView';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import BagDetailSummaryView from './BagDetailSummaryView';
import BagDetailBottomBar from './BagDetailBottomBar';
import BagDetailMemoView from './BagDetailMemoView';
import BagDetailDestinationView from './BagDetailDestinationView';
import BagDetailActivityView from './BagDetailActivityView';
import ShareButtonView from './ShareButtonView';
import BagDetailCopyView from '../bag/BagDetailCopyView';
import { Stack, useFocusEffect } from 'expo-router';
import BagDetailSkeletonView from './BagDetailSkeletonView';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import ToastView from '../toast/ToastView';
import app from '@/model/app/App';

interface Props {
  bagDetail: BagDetail;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const SAFE_AREA_EDGES: readonly Edge[] = IS_IOS
  ? ['left', 'right', 'bottom']
  : ['top', 'left', 'right', 'bottom'];

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const initialized = bagDetail.isInitialized();
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefsMap = useRef<Map<string, any>>(new Map());

  const handlePressBack = () => {
    bagDetail.back();
  };

  const handleCategoryRefReady = (categoryFilter: string, ref: any) => {
    categoryRefsMap.current.set(categoryFilter, ref);
    bagDetail.setCategoryRefs(categoryRefsMap.current);
  };

  const handleScroll = (event: any) => {
    bagDetail.handleScroll(event);
  };

  useFocusEffect(
    useCallback(() => {
      bagDetail.initialize();
    }, [bagDetail])
  );

  useLayoutEffect(() => {
    if (initialized && scrollViewRef.current) {
      bagDetail.setScrollViewRef(scrollViewRef.current);
    }
  }, [initialized]);

  // 헤더 우측 액션(복사·공유) — iOS 네이티브 headerRight와 Android/Web 커스텀 헤더가 공유한다.
  // iOS는 각 아이콘을 44pt 박스로 감싸 글래스 캡슐의 내부 여백·높이를 시스템 바 버튼
  // 지오메트리(내부 ~11pt, 아이콘 중심 간격 ~52pt, 높이 44pt)에 맞춘다. 터치 타깃도 44pt 확보.
  const renderHeaderActions = () => (
    <View style={styles.headerActions}>
      <View style={IS_IOS ? styles.headerIconBox : null}>
        <BagDetailCopyView
          sourceId={bagDetail.getId()}
          sourceName={bagDetail.getName()}
        />
      </View>
      <View style={IS_IOS ? styles.headerIconBox : null}>
        <ShareButtonView bagDetail={bagDetail} />
      </View>
    </View>
  );

  // LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
  // 시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
  // 배낭 이름은 본문(BagDetailNameView)이 주인공이라 타이틀은 비워 중복을 피한다.
  const stackScreen = (
    <Stack.Screen
      options={{
        headerShown: IS_IOS,
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        // 스켈레톤 동안은 우측 액션을 숨긴다 — 초기화 전 복사/공유는 의미가 없다.
        ...(initialized ? { headerRight: () => renderHeaderActions() } : {}),
      }}
    />
  );

  if (initialized) {
    const gears = bagDetail.getGears();

    return (
      <GestureHandlerRootView style={styles.container}>
        {stackScreen}
        <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
          <View style={styles.container}>
            {!IS_IOS && (
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    onPress={handlePressBack}
                    hitSlop={12}
                    accessibilityRole='button'
                    accessibilityLabel='뒤로가기'
                  >
                    <Ionicons
                      name='chevron-back'
                      size={24}
                      color={Color.textPrimary}
                    />
                  </TouchableOpacity>
                  {renderHeaderActions()}
                </View>
              </View>
            )}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
              contentInsetAdjustmentBehavior='automatic'
              stickyHeaderIndices={[4]}
              onScroll={handleScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.infoSection}>
                <BagDetailNameView bagDetail={bagDetail} />
                <BagDetailDateView bagDetail={bagDetail} />
              </View>
              <BagDetailSummaryView bagDetail={bagDetail} />
              <View style={styles.actionsGrid}>
                {bagDetail.getTripPhase() === 'after' ? (
                  <>
                    <BagDetailUselessDescriptionView
                      bagDetail={bagDetail}
                      emphasized
                    />
                    <BagDetailMemoView bagDetail={bagDetail} />
                    <BagDetailDestinationView bagDetail={bagDetail} />
                    <BagDetailActivityView bagDetail={bagDetail} />
                  </>
                ) : (
                  <>
                    <BagDetailDestinationView bagDetail={bagDetail} emphasized />
                    <BagDetailMemoView bagDetail={bagDetail} />
                    <BagDetailUselessDescriptionView bagDetail={bagDetail} />
                    <BagDetailActivityView bagDetail={bagDetail} />
                  </>
                )}
              </View>
              <View style={styles.separator} />
              <View
                style={styles.gearHeader}
                onLayout={e =>
                  bagDetail.setGearHeaderHeight(e.nativeEvent.layout.height)
                }
              >
                <View style={styles.gearHeaderContent}>
                  <PretendardText style={styles.gearCountText} weight='bold'>
                    총 {gears.length}개의 장비
                  </PretendardText>
                </View>
                <BagDetailFiltersView bagDetail={bagDetail} />
              </View>
              <View style={styles.gearListContainer}>
                <View style={styles.gearList}>
                  {bagDetail.getGearsByCategory().map(({ category, gears }) => (
                    <BagDetailCategoryView
                      key={category.getFilter()}
                      category={category}
                      bagDetail={bagDetail}
                      gears={gears}
                      onRefReady={handleCategoryRefReady}
                    />
                  ))}
                  <View style={styles.dummy} />
                </View>
              </View>
            </ScrollView>
            <BagDetailBottomBar bagDetail={bagDetail} />
          </View>
          <ToastView toastManager={app.getToastManager()!} bottom={100} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  } else {
    return (
      <>
        {stackScreen}
        <BagDetailSkeletonView />
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    backgroundColor: Color.background,
    marginBottom: 8,
    paddingHorizontal: Spacing.screenH,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // iOS는 44pt 박스 + gap 8 = 아이콘 중심 간격 ~52pt(시스템 캡슐 지오메트리).
    // Android 커스텀 헤더는 기존 간격 유지.
    gap: IS_IOS ? 8 : 12,
  },
  // iOS 글래스 캡슐 내부 여백·높이를 맞추는 아이콘 박스(터치 타깃 44pt).
  headerIconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  infoSection: {
    backgroundColor: Color.background,
    paddingTop: 8,
    paddingHorizontal: Spacing.screenH,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    paddingHorizontal: Spacing.screenH,
    marginTop: 12,
    marginBottom: 8,
  },
  separator: {
    width: '100%',
    backgroundColor: Color.divider,
    minHeight: 10,
  },
  gearHeader: {
    backgroundColor: Color.background,
  },
  gearHeaderContent: {
    width: '100%',
    flexDirection: 'row',
    padding: Spacing.screenH,
    justifyContent: 'space-between',
  },
  gearCountText: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  gearListContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
  },
  gearList: {
    width: '100%',
    gap: 24,
    paddingBottom: 80,
  },
  dummy: {
    height: 200,
  },
});

export default observer(BagDetailView);
