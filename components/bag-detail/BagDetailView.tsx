import { observer } from 'mobx-react-lite';
import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import BagDetail from '@/model/bag-detail/BagDetail';
import TripPhase from '@/model/bag/TripPhase';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidHeaderChrome, {
  LIQUID_HEADER_ICON_BOX,
} from '@/components/liquid/LiquidHeaderChrome';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
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
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';

interface Props {
  bagDetail: BagDetail;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// 웹은 필름 카드 진입점이 없다(BS-1) — 아이콘을 담는 칸까지 함께 빼야 한다.
const IS_WEB = Platform.OS === 'web';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const SAFE_AREA_EDGES: readonly Edge[] = IS_IOS
  ? ['left', 'right', 'bottom']
  : ['top', 'left', 'right', 'bottom'];

// 섹션 제목(`담긴 장비`) 크기 — 목업 §6.
const GEAR_TITLE_SIZE = 19;

const BagDetailView: FC<Props> = ({ bagDetail }) => {
  const initialized = bagDetail.isInitialized();
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefsMap = useRef<Map<string, any>>(new Map());

  const handlePressBack = () => {
    bagDetail.back();
  };

  // 빈 배낭 안내의 CTA — 하단 `장비 추가`와 같은 경로·같은 로그를 쓴다.
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
  const headerBottom = insets.top + LiquidLayout.navBar;

  // iOS는 스크롤 프레임이 화면 최상단부터라, 카테고리 스크롤 이동·활성 필터 감지가
  // 헤더 높이만큼 어긋나지 않게 모델에 상단 인셋을 주입한다(LG). Android/Web은 0.
  useEffect(() => {
    bagDetail.setTopContentInset(IS_IOS ? headerBottom : 0);
  }, [bagDetail, headerBottom]);

  // 장비 헤더(담긴 장비 + 필터)의 콘텐츠 내 y 위치. onLayout으로 측정한다.
  const [gearHeaderY, setGearHeaderY] = useState<number | null>(null);
  // iOS 전용: 필터가 헤더 아래에 고정 표시돼야 하는지(스크롤 위치 기반).
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  // 유리 띠 오버레이가 떠 있는 상태. 이때 장비 헤더는 두 벌 존재하므로(인라인 + 오버레이)
  // **오버레이 쪽이 보이는 한 벌**이고, 인라인은 가려진다 — ref 등록과 접근성 노출을
  // 둘 다 이 한 줄로 가른다.
  const isPinnedHeaderVisible = IS_IOS && isFilterPinned;

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

  // 헤더 우측 액션(복사·공유·필름 카드) — iOS 네이티브 headerRight와 Android/Web 유리 캡슐이 공유한다.
  // 각 아이콘을 칸에 담아 캡슐의 내부 여백·아이콘 중심 간격을 맞춘다. iOS는 시스템 바 버튼
  // 지오메트리(44pt 칸)에, Android/Web은 목업 §6 캡슐(34pt 칸)에 맞춘다.
  const renderHeaderActions = () => (
    <View style={styles.headerActions}>
      <View style={IS_IOS ? styles.headerIconBoxIos : styles.headerIconBox}>
        <BagDetailCopyView
          sourceId={bagDetail.getId()}
          sourceName={bagDetail.getName()}
        />
      </View>
      <View style={IS_IOS ? styles.headerIconBoxIos : styles.headerIconBox}>
        <ShareButtonView bagDetail={bagDetail} />
      </View>
      {/* 웹에서는 BagFilmCardButtonView가 아무것도 그리지 않으므로 칸도 렌더하지 않는다 —
          래퍼만 남기면 캡슐 오른쪽에 34pt 죽은 칸이 생겨 아이콘 두 개가 중심에서 밀린다. */}
      {!IS_WEB && (
        <View style={IS_IOS ? styles.headerIconBoxIos : styles.headerIconBox}>
          <BagFilmCardButtonView bagDetail={bagDetail} />
        </View>
      )}
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

    const renderGearHeaderTitle = () => (
      <View style={styles.gearHeaderTitleRow}>
        <PretendardText weight='bold' style={styles.gearTitle}>
          담긴 장비
        </PretendardText>
        <PretendardText weight='semibold' style={styles.gearCount}>
          {`${gears.length}개`}
        </PretendardText>
      </View>
    );

    return (
      <GestureHandlerRootView style={styles.container}>
        {stackScreen}
        {/* 지형 0.8 + 짙은 베일 + 좌측 중단 라임 글로우(목업 §6). 세이프에어리어 여백까지
            이어져야 하므로 SafeAreaView 바깥에 둔다. */}
        <LiquidBackdrop screen='bagDetail' glowPosition='leftMid' />
        <SafeAreaView style={styles.container} edges={SAFE_AREA_EDGES}>
          <View style={styles.container}>
            {/* Android·Web 유리 크롬 — iOS는 네이티브 투명 헤더가 같은 그림(원형 글래스
                back + 글래스 바 버튼)을 시스템에서 내준다(LG-1). */}
            {!IS_IOS && (
              <LiquidHeaderChrome
                onPressBack={handlePressBack}
                actions={renderHeaderActions()}
              />
            )}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
              contentInsetAdjustmentBehavior='automatic'
              // iOS는 sticky가 투명 헤더 뒤(화면 최상단)에 붙어 가려지므로 오버레이로 대체한다.
              stickyHeaderIndices={IS_IOS ? undefined : [3]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.titleBlock}>
                <BagDetailNameView bagDetail={bagDetail} />
                <BagDetailDateView bagDetail={bagDetail} />
              </View>
              <BagDetailSummaryView bagDetail={bagDetail} />
              <View style={styles.tileGrid}>
                {bagDetail.getTripPhase() === TripPhase.After ? (
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
              <View
                style={[
                  styles.gearHeader,
                  // Android/Web은 이 뷰가 그대로 sticky 헤더가 된다 — 투명하면 아래로 지나가는
                  // 흰 장비 카드가 제목·칩 뒤로 비쳐 글자가 겹쳐 읽힌다. 지면색으로 막는다.
                  // (iOS는 이 자리를 유리 띠 오버레이가 맡아 여기에 면을 깔 필요가 없다.)
                  !IS_IOS && styles.gearHeaderOpaque,
                ]}
                onLayout={e => {
                  bagDetail.setGearHeaderHeight(e.nativeEvent.layout.height);
                  // iOS 오버레이 핀 판정용 — 콘텐츠 내 y 위치를 기록한다.
                  setGearHeaderY(e.nativeEvent.layout.y);
                }}
                // 핀 상태에서 이 인라인 헤더는 유리 띠 오버레이·네이티브 헤더 뒤로 가려진다 —
                // 보이지 않는 쪽을 접근성 트리에서 빼 같은 제목·칩이 두 벌 읽히지 않게 한다.
                accessibilityElementsHidden={isPinnedHeaderVisible}
                importantForAccessibility={
                  isPinnedHeaderVisible ? 'no-hide-descendants' : 'auto'
                }
              >
                {renderGearHeaderTitle()}
                {/* 모델의 필터 ref 슬롯은 하나뿐이라 보이는 인스턴스만 등록한다(BD-2). */}
                <BagDetailFiltersView
                  bagDetail={bagDetail}
                  registerRefs={!isPinnedHeaderVisible}
                />
              </View>
              <View style={styles.gearList}>
                {/* 빈 배낭이면 목록 자리가 통째로 비어 뭘 해야 할지 알 수 없었다
                    (2026-08-04 시뮬레이터 확인). 하단 `장비 추가`와 같은 경로를
                    바로 누를 수 있게 둔다 — 빈 배낭에서 할 일은 이것 하나뿐이다. */}
                {gears.length === 0 ? (
                  <LiquidCard
                    tone='paper'
                    padding={24}
                    style={styles.gearEmpty}
                  >
                    <PretendardText weight='bold' style={styles.gearEmptyTitle}>
                      담긴 장비가 없어요
                    </PretendardText>
                    <PretendardText style={styles.gearEmptyText}>
                      창고에서 장비를 골라 담아보세요
                    </PretendardText>
                    {/* 하단 바의 `장비 추가`가 이 화면의 주 액션이다 — 같은 곳으로 가는
                        이 카드 안 버튼까지 잉크로 두면 잉크 CTA가 화면에 둘이 된다.
                        흰 카드 위라 `secondary`(흰 면 + 헤어라인)는 테두리만 남아 버튼으로
                        읽히지 않는다 — 면을 한 단계 가라앉히는 `quiet`으로 낮춘다. */}
                    <LiquidPillButton
                      label='장비 추가하기'
                      variant='quiet'
                      block
                      onPress={handlePressAddGear}
                      style={styles.gearEmptyCta}
                    />
                  </LiquidCard>
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
                {/* 마지막 카테고리도 필터 탭으로 화면 상단까지 올릴 수 있게 남기는 여유(BD-2). */}
                <View style={styles.scrollHeadroom} />
              </View>
            </ScrollView>
            {/* iOS: sticky 대체 오버레이 — 필터를 투명 헤더 '아래'에 유리 띠로 고정한다.
                띠를 헤더 바닥(headerBottom)에서 시작해 네이티브 글래스와 이중으로 겹치지 않게 한다. */}
            {isPinnedHeaderVisible && (
              <View style={[styles.pinnedGearHeader, { top: headerBottom }]}>
                <BlurView
                  tint='light'
                  intensity={Liquid.glassBlurIntensity}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[StyleSheet.absoluteFill, styles.pinnedFill]} />
                {renderGearHeaderTitle()}
                {/* 이 인스턴스가 보이는 필터 줄이므로 ref 슬롯도 여기가 갖는다(기본값 true) —
                    칩 자동 스크롤이 눈에 보이는 줄에서 일어난다. 인라인 쪽은 등록을 넘긴다. */}
                <BagDetailFiltersView bagDetail={bagDetail} />
              </View>
            )}
            <BagDetailBottomBar bagDetail={bagDetail} />
          </View>
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
    // 지면은 LiquidBackdrop이 깐다 — 여기 색을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Android/Web 유리 캡슐 안 칸(목업 §6). 아이콘 중심 간격 36 = 34 + 캡슐 gap 2.
  headerIconBox: {
    width: LIQUID_HEADER_ICON_BOX,
    height: LIQUID_HEADER_ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // iOS 시스템 바 버튼 지오메트리(내부 ~11pt, 아이콘 중심 간격 ~52pt, 높이 44pt).
  headerIconBoxIos: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  titleBlock: {
    paddingTop: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 폭을 %로 잡고 좌우를 맞춘다(space-between) — 타일이 3개로 줄 수 있어(운동 기록 미노출)
  // 고정 gap이면 마지막 줄에서 화면 여백이 어긋난다. 그래서 열 간격은 목업의 10보다
  // 조금 넓은 잔여 폭(≈4%)이 된다.
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 12,
    paddingHorizontal: LiquidLayout.screenH,
  },
  gearHeader: {
    backgroundColor: 'transparent',
  },
  // Android/Web sticky 헤더용 불투명 면(지면색) — 뒤로 지나가는 카드를 가린다.
  gearHeaderOpaque: {
    backgroundColor: Liquid.canvas,
  },
  gearHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: LiquidLayout.section,
    paddingBottom: 12,
    paddingHorizontal: LiquidLayout.screenH,
  },
  gearTitle: {
    fontSize: GEAR_TITLE_SIZE,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: Liquid.ink,
  },
  gearCount: {
    fontSize: 13,
    color: Liquid.inkTertiary,
  },
  // iOS sticky 대체 오버레이 — 헤더 바닥에서 시작하는 유리 띠(top은 렌더에서 주입).
  // 목록을 가려야 하므로 콘텐츠 위에 뜬다.
  pinnedGearHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  pinnedFill: {
    backgroundColor: Liquid.glassFill,
  },
  gearList: {
    gap: LiquidLayout.section,
    paddingHorizontal: LiquidLayout.screenH,
  },
  gearEmpty: {
    alignItems: 'center',
  },
  gearEmptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    marginBottom: 6,
  },
  gearEmptyText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  gearEmptyCta: {
    marginTop: 18,
  },
  scrollHeadroom: {
    height: 200,
  },
});

export default observer(BagDetailView);
