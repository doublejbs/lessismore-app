import { observer } from 'mobx-react-lite';
import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import { Acg, AcgLayout, Color } from '@/constants/DesignTokens';
import BagDetailCategoryView from './BagDetailCategoryView';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import BagDetailDateView from './BagDetailDateView';
import BagDetailFiltersView from './BagDetailFiltersView';
import BagDetailNameView from './BagDetailNameView';
import BagDetailUselessDescriptionView from './BagDetailUselessDescriptionView';
import BagDetailSummaryView from './BagDetailSummaryView';
import BagDetailBottomBar from './BagDetailBottomBar';
import BagDetailMemoView from './BagDetailMemoView';
import BagDetailDestinationView from './BagDetailDestinationView';
import BagDetailActivityView from './BagDetailActivityView';
import BagFilmCardButtonView from './BagFilmCardButtonView';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import BagDetailSkeletonView from './BagDetailSkeletonView';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Edge,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import ToastView from '../toast/ToastView';
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import { setBagShareContext } from '@/model/bag-detail/BagShareHandoff';

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
  const router = useRouter();
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

  const insets = useSafeAreaInsets();

  // iOS 네이티브 투명 헤더 하단(상태바 + 컴팩트 바 44pt) — 필터 오버레이의 핀 기준선.
  const headerBottom = insets.top + 44;

  // iOS는 스크롤 프레임이 화면 최상단부터라, 카테고리 스크롤 이동·활성 필터 감지가
  // 헤더 높이만큼 어긋나지 않게 모델에 상단 인셋을 주입한다(LG). Android/Web은 0.
  useEffect(() => {
    bagDetail.setTopContentInset(IS_IOS ? headerBottom : 0);
  }, [bagDetail, headerBottom]);

  // 장비 헤더(총 N개 + 필터)의 콘텐츠 내 y 위치. onLayout으로 측정한다.
  const [gearHeaderY, setGearHeaderY] = useState<number | null>(null);
  // 필터가 헤더 아래에 고정 표시돼야 하는지(스크롤 위치 기반). 양 플랫폼 공용이다.
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  // Android 커스텀 헤더 높이 — 오버레이를 헤더 바로 아래에 놓기 위한 측정값(iOS는 쓰지 않는다).
  const [androidHeaderHeight, setAndroidHeaderHeight] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // 필터 고정을 **오버레이로** 처리한다(BD-2). RN `stickyHeaderIndices`를 쓰지 않는 이유:
  // iOS는 sticky가 인셋을 몰라 투명 헤더 뒤(화면 최상단)에 붙어 가려지고, Android는 sticky 뷰를
  // 형제 순서대로 그려 뒤에 오는 장비 목록이 위에 얹혀 **리스트가 비치고 터치까지 가로챈다**
  // (2026-08-17 Pixel 7 Pro 실측 — 불투명 배경·zIndex로도 터치가 살아나지 않았고, elevation은
  // 그림자가 생겨 "면에 그림자 없음"과 충돌한다). 오버레이는 ScrollView **뒤에 오는 형제**라
  // 두 문제가 구조적으로 사라진다.
  const handleScroll = (event: any) => {
    bagDetail.handleScroll(event);

    if (gearHeaderY !== null) {
      const offsetY = event.nativeEvent.contentOffset.y;
      // iOS는 콘텐츠가 투명 헤더 뒤로 흐르므로 핀 라인이 헤더 하단이다.
      // Android는 스크롤 프레임이 커스텀 헤더 아래에서 시작하므로 0이다.
      const pinLine = IS_IOS ? headerBottom : 0;

      setIsFilterPinned(offsetY + pinLine >= gearHeaderY);
    }
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

  const openMenuRoute = (route: () => void) => {
    setShowMenu(false);
    // RN Modal이 닫힌 뒤 다음 formSheet가 열리도록 한 프레임 뒤에 이동한다.
    setTimeout(route, 0);
  };

  const handleCopy = () => {
    if (!app.getFirebase().isLoggedIn()) {
      setShowMenu(false);
      app.getLogInAlertManager()?.show();

      return;
    }

    openMenuRoute(() =>
      router.push({
        pathname: '/bag-copy',
        params: {
          sourceId: bagDetail.getId(),
          sourceName: bagDetail.getName(),
          entrySource: 'detail',
        },
      })
    );
  };

  const handleShare = () => {
    openMenuRoute(() => {
      app.getAnalyticsManager()?.logClick('bag_share');
      setBagShareContext(bagDetail);
      router.push('/bag-share');
    });
  };

  const handleSaveTemplate = () => {
    if (!app.getFirebase().isLoggedIn()) {
      setShowMenu(false);
      app.getLogInAlertManager()?.show();

      return;
    }

    openMenuRoute(() =>
      router.push({
        pathname: '/bag-template-save',
        params: {
          sourceId: bagDetail.getId(),
          sourceName: bagDetail.getName(),
        },
      })
    );
  };

  const handleDelete = () => {
    setShowMenu(false);
    app.getAlertManager()?.show({
      message: app.getL10n().t('bagDetail.deleteConfirm', { name: bagDetail.getName() }),
      confirmText: app.getL10n().t('common.delete'),
      onConfirm: async () => {
        await app.getBagStore()!.delete(bagDetail.getId());
        router.back();
      },
    });
  };

  // 헤더 우측 액션(필름 카드·메뉴) — iOS 네이티브 headerRight와 Android/Web 커스텀 헤더가 공유한다.
  // 두 버튼 모두 44pt 박스를 사용해 HIG 터치 타깃을 보장한다.
  const renderHeaderActions = () => (
    <View style={styles.headerActions}>
      {Platform.OS !== 'web' && (
        <View style={styles.headerIconBox}>
          <BagFilmCardButtonView bagDetail={bagDetail} />
        </View>
      )}
      <TouchableOpacity
        style={styles.headerIconBox}
        onPress={() => setShowMenu(true)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('bagDetail.menu')}
      >
        <Ionicons name='ellipsis-horizontal' size={24} color={Color.textPrimary} />
      </TouchableOpacity>
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
        {/* 목록 화면은 순백 지면이다 — 지형 그래픽은 홈에만 둔다(2026-08-11 사용자 결정).
            세이프에어리어 여백까지 이어져야 하므로 SafeAreaView 바깥에 둔다. */}
        <View style={styles.ground} />
        <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
          <View style={styles.container}>
            {!IS_IOS && (
              <View
                style={styles.header}
                onLayout={e =>
                  setAndroidHeaderHeight(e.nativeEvent.layout.height)
                }
              >
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    onPress={handlePressBack}
                    hitSlop={12}
                    accessibilityRole='button'
                    accessibilityLabel={app.getL10n().t('bagDetail.back')}
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
              // sticky를 쓰지 않는다 — 고정 표시는 아래 오버레이가 맡는다(BD-2, handleScroll 주석 참고).
              onScroll={handleScroll}
              scrollEventThrottle={16}
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
                    <BagDetailDestinationView
                      bagDetail={bagDetail}
                      emphasized
                    />
                    <BagDetailMemoView bagDetail={bagDetail} />
                    <BagDetailUselessDescriptionView bagDetail={bagDetail} />
                    <BagDetailActivityView bagDetail={bagDetail} />
                  </>
                )}
              </View>
              <View style={styles.separator} />
              <View
                style={styles.gearHeader}
                onLayout={e => {
                  bagDetail.setGearHeaderHeight(e.nativeEvent.layout.height);
                  // iOS 오버레이 핀 판정용 — 콘텐츠 내 y 위치를 기록한다.
                  setGearHeaderY(e.nativeEvent.layout.y);
                }}
              >
                <View style={styles.gearHeaderContent}>
                  <AcgSectionHeaderView title={app.getL10n().t('bagDetail.gearCount', { count: gears.length })} />
                </View>
                <BagDetailFiltersView bagDetail={bagDetail} />
              </View>
              <View style={styles.gearListContainer}>
                <View style={styles.gearList}>
                  {/* 빈 배낭에 안내 면을 두지 않는다(2026-08-13 사용자 결정) —
                      하단 바의 `장비 추가`가 이미 화면에 있어 빈 목록이 스스로 설명된다. */}
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
            {/* sticky 대체 오버레이 — 필터를 헤더 '아래'에 고정 표시한다(양 플랫폼 공용).
                iOS: SafeAreaView가 top 인셋을 소비하지 않는 구조라 화면 최상단(top: 0)부터
                흰 배경을 깔고 paddingTop으로 헤더 높이만큼 내려 그린다.
                Android: 헤더가 일반 형제라 스크롤 프레임이 그 아래에서 시작하므로,
                측정한 헤더 높이만큼 top을 내린다(paddingTop은 필요 없다). */}
            {isFilterPinned && (
              <View
                style={[
                  styles.pinnedGearHeader,
                  IS_IOS
                    ? { paddingTop: headerBottom }
                    : { top: androidHeaderHeight },
                ]}
              >
                <View style={styles.gearHeaderContent}>
                  <AcgSectionHeaderView title={app.getL10n().t('bagDetail.gearCount', { count: gears.length })} />
                </View>
                <BagDetailFiltersView bagDetail={bagDetail} />
              </View>
            )}
            <BagDetailBottomBar bagDetail={bagDetail} />
          </View>
          <BottomMenuModalView
            visible={showMenu}
            onClose={() => setShowMenu(false)}
            menuItems={[
              {
                icon: 'copy-outline',
                text: app.getL10n().t('bagDetail.copy'),
                onPress: handleCopy,
              },
              {
                icon: 'share-outline',
                text: app.getL10n().t('bagDetail.share'),
                onPress: handleShare,
              },
              {
                icon: 'bookmark-outline',
                text: app.getL10n().t('bagDetail.shareSaveTemplate'),
                onPress: handleSaveTemplate,
              },
              {
                icon: 'trash-outline',
                text: app.getL10n().t('common.delete'),
                onPress: handleDelete,
              },
            ]}
          />
          <ToastView toastManager={app.getToastManager()!} bottom={100} />
          {/* 이 화면은 `Layout`을 쓰지 않아 알럿을 그리는 뷰가 없다 — 직접 얹는다.
              없으면 확인 알럿을 띄우는 동작(장비 빼기)이 조용히 아무 일도 하지 않는다
              (2026-08-05 시뮬레이터 확인). 패킹 모드도 같은 이유로 직접 얹는다. */}
          <AlertView alertManager={app.getAlertManager()!} />
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
    // 지면은 아래 `ground`가 깐다 — 여기 색을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
  },
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
  header: {
    backgroundColor: 'transparent',
    marginBottom: 8,
    paddingHorizontal: AcgLayout.screenPadding,
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
    gap: 8,
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
  // 지면이 이어져야 한다 — 흰 면을 깔면 배낭명·요약 영역만 종이처럼 떠 보인다(ACG).
  infoSection: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    paddingHorizontal: AcgLayout.screenPadding,
    marginTop: 12,
    marginBottom: 8,
  },
  // 지면이 구분을 맡으므로 띠는 색 없이 간격만 낸다(ACG).
  separator: {
    width: '100%',
    minHeight: 10,
  },
  gearHeader: {
    backgroundColor: 'transparent',
  },
  // iOS sticky 대체 오버레이 — 화면 상단 고정, 헤더 높이만큼 paddingTop을 준다(렌더에서 주입).
  // 스크롤 위에 떠서 목록을 가려야 하므로 여기만은 불투명하다. 지면과 같은 색이라
  // 고정된 동안에도 배경이 이어져 보인다.
  pinnedGearHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Acg.paper,
  },
  gearHeaderContent: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: AcgLayout.screenPadding,
    justifyContent: 'space-between',
  },
  gearListContainer: {
    alignItems: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
  },
  gearList: {
    width: '100%',
    // 카테고리 묶음 사이 간격. 묶음 **안**의 행은 헤어라인이 가른다(간격 0).
    gap: 20,
    paddingBottom: 80,
  },
  dummy: {
    height: 200,
  },
});

export default observer(BagDetailView);
