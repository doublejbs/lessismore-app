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
import PretendardText from '@/components/PretendardText';
import { Acg, AcgShadow, Color, Spacing } from '@/constants/DesignTokens';
import BagDetailCategoryView from './BagDetailCategoryView';
import AcgHighlightText from '@/components/acg/AcgHighlightText';
import AcgScreenBackground from '@/components/acg/AcgScreenBackground';
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
import BagFilmCardButtonView from './BagFilmCardButtonView';
import BagDetailCopyView from '../bag/BagDetailCopyView';
import { Stack, useFocusEffect } from 'expo-router';
import BagDetailSkeletonView from './BagDetailSkeletonView';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Edge,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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

  // 빈 배낭 안내의 CTA — 하단 `수정하기`와 같은 경로·같은 로그를 쓴다.
  const handlePressAddGear = () => {
    app.getAnalyticsManager()?.logClick('bag_edit');
    bagDetail.goToEdit();
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
  // iOS 전용: 필터가 헤더 아래에 고정 표시돼야 하는지(스크롤 위치 기반).
  const [isFilterPinned, setIsFilterPinned] = useState(false);

  const handleScroll = (event: any) => {
    bagDetail.handleScroll(event);

    // iOS: RN sticky는 인셋을 몰라 화면 최상단(투명 헤더 뒤)에 붙어 가려진다.
    // sticky 대신 스크롤 위치로 '헤더 아래 오버레이' 표시를 판정한다(핀 라인 = headerBottom).
    if (IS_IOS && gearHeaderY !== null) {
      const offsetY = event.nativeEvent.contentOffset.y;

      setIsFilterPinned(offsetY + headerBottom >= gearHeaderY);
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

  // 헤더 우측 액션(복사·공유·필름 카드) — iOS 네이티브 headerRight와 Android/Web 커스텀 헤더가 공유한다.
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
      <View style={IS_IOS ? styles.headerIconBox : null}>
        <BagFilmCardButtonView bagDetail={bagDetail} />
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
        {/* 홈·정보 탭과 같은 지형 이미지 지면(2026-08-04 사용자 결정). 세이프에어리어
            여백까지 이어져야 하므로 SafeAreaView 바깥에 둔다. */}
        <AcgScreenBackground photo terrain={false} />
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
              // iOS는 sticky가 투명 헤더 뒤(화면 최상단)에 붙어 가려지므로 오버레이로 대체한다.
              stickyHeaderIndices={IS_IOS ? undefined : [4]}
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
                  {/* 형광펜은 화면당 한 곳에만 — 이 화면의 주 섹션이다(ACG). */}
                  <AcgHighlightText fontSize={GEAR_COUNT_SIZE}>
                    <PretendardText style={styles.gearCountText} weight='bold'>
                      총 {gears.length}개의 장비
                    </PretendardText>
                  </AcgHighlightText>
                </View>
                <BagDetailFiltersView bagDetail={bagDetail} />
              </View>
              <View style={styles.gearListContainer}>
                <View style={styles.gearList}>
                  {/* 빈 배낭이면 목록 자리가 통째로 비어 뭘 해야 할지 알 수 없었다
                      (2026-08-04 시뮬레이터 확인). 하단 `수정하기`와 같은 경로를
                      바로 누를 수 있게 둔다 — 빈 배낭에서 할 일은 이것 하나뿐이다. */}
                  {gears.length === 0 ? (
                    <View style={styles.gearEmpty}>
                      <PretendardText
                        weight='bold'
                        style={styles.gearEmptyTitle}
                      >
                        담긴 장비가 없어요
                      </PretendardText>
                      <PretendardText style={styles.gearEmptyText}>
                        창고에서 장비를 골라 담아보세요
                      </PretendardText>
                      <TouchableOpacity
                        style={styles.gearEmptyButton}
                        onPress={handlePressAddGear}
                        activeOpacity={0.8}
                        accessibilityRole='button'
                        accessibilityLabel='장비 추가하기'
                      >
                        <PretendardText
                          weight='bold'
                          style={styles.gearEmptyButtonText}
                        >
                          장비 추가하기
                        </PretendardText>
                      </TouchableOpacity>
                    </View>
                  ) : null}
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
            {/* iOS: sticky 대체 오버레이 — 필터를 투명 헤더 '아래'에 고정 표시한다.
                SafeAreaView가 top 인셋을 소비하지 않는 iOS 구조라 화면 최상단(top: 0)부터
                흰 배경을 깔고 paddingTop으로 헤더 높이만큼 내려 그린다. */}
            {IS_IOS && isFilterPinned && (
              <View
                style={[styles.pinnedGearHeader, { paddingTop: headerBottom }]}
              >
                <View style={styles.gearHeaderContent}>
                  <PretendardText style={styles.gearCountText} weight='bold'>
                    총 {gears.length}개의 장비
                  </PretendardText>
                </View>
                <BagDetailFiltersView bagDetail={bagDetail} />
              </View>
            )}
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

// 섹션 제목 크기(ACG) — 홈·장비 상세와 같은 18px/700.
const GEAR_COUNT_SIZE = 18;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 AcgScreenBackground가 깐다 — 여기 색을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: 'transparent',
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
    backgroundColor: Acg.bg,
  },
  gearHeaderContent: {
    width: '100%',
    flexDirection: 'row',
    padding: Spacing.screenH,
    justifyContent: 'space-between',
  },
  gearCountText: {
    fontSize: GEAR_COUNT_SIZE,
    color: Acg.textTertiary,
  },
  // 지면 위 종이 면 안내(ACG).
  gearEmpty: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: Spacing.screenH,
    gap: 6,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  gearEmptyTitle: {
    fontSize: 16,
    color: Acg.ink,
  },
  gearEmptyText: {
    fontSize: 13,
    color: Acg.textSecondary,
    marginBottom: 14,
  },
  // 하단 `수정하기`와 같은 경로라 같은 잉크 면을 쓴다(ACG).
  gearEmptyButton: {
    alignSelf: 'stretch',
    marginHorizontal: Spacing.screenH,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: Acg.ink,
  },
  gearEmptyButtonText: {
    fontSize: 15,
    color: Acg.paper,
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
