import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { josa } from 'josa';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import Warehouse from '@/model/warehouse/Warehouse';
import { formatBagWeight } from '@/model/gear/WeightFormat';
import WarehouseChromeView from '@/components/warehouse/WarehouseChromeView';
import WarehouseFiltersView from '@/components/warehouse/WarehouseFiltersView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import WarehouseSearchFieldView from '@/components/warehouse/WarehouseSearchFieldView';
import WarehouseSkeletonView from '@/components/warehouse/WarehouseSkeletonView';
import useGearAddAction from '@/components/warehouse/useGearAddAction';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 커스텀 유리 크롬을 그린다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;
// 크롬 아래 제목 블록이 시작하는 여백(목업 §8: 콘텐츠 106 + 제목 블록 6).
const HEADER_TOP_GAP = 6;
/**
 * 제목 블록의 자연 높이(타이틀 32/38 + 4 + 요약 13/18).
 *
 * 검색 행이 이 자리를 **정확히 대체**해야 토글할 때 아래 칩·목록이 밀리지 않는다(WH-2-1).
 * 두 블록이 같은 상수를 참조해 계산이 아니라 구조로 같아진다.
 */
const HEADER_ROW_MIN_HEIGHT = 60;
// 요약 줄 행간 — 위 상수가 성립하려면 행간을 서체 기본값에 맡기지 않고 고정해야 한다.
const SUMMARY_LINE_HEIGHT = 18;

/**
 * WH-1 창고 화면 (Liquid Depth, 목업 §8).
 *
 * 지면은 지형 없이 우상단 라임 글로우만 있는 `canvas`다 — 여기는 읽을 지형이 아니라
 * 훑어 비교하는 목록이다. 크롬은 지면 위에 뜬 유리(검색·추가)이고, 제목 블록이 화면 대상
 * (`창고`)과 규모(`42개 · 18.6kg`)·정렬을 함께 든다. 목록은 **흰 카드 하나**이고 행은
 * 헤어라인으로만 갈린다 — 행마다 면을 두면 목록이 카드 더미로 보인다.
 */
const WarehouseView: FC<Props> = ({ warehouse }) => {
  const router = useRouter();
  const handleAddGear = useGearAddAction();
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();
  const isLoading = warehouse.isLoading();
  const insets = useSafeAreaInsets();
  const [isSearching, setIsSearching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      warehouse.refresh();

      return () => {
        warehouse.setQuery('');
        setIsSearching(false);
      };
      // setIsSearching은 setState라 안정적이지만, 빠뜨리면 React Compiler가 추론한
      // 의존성과 어긋나 이 컴포넌트 최적화를 통째로 건너뛴다.
    }, [warehouse, setIsSearching])
  );

  useEffect(() => {
    warehouse.initialize();
  }, [warehouse]);

  const handleSelectOrder = (option: OrderOption) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_sort', { order: option.getName() });
  };

  const handlePressBack = () => {
    router.back();
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    warehouse.setQuery('');
  };

  /**
   * 개수와 총 무게를 한 덩어리로 읽힌다(목업 §8). 필터·검색을 적용한 **현재 목록** 기준이라
   * 아래 목록과 같은 사실을 말한다. 무게가 모두 미입력이면 `0kg`은 뜻이 없어 뺀다.
   */
  const getSummary = (): string => {
    const totalWeightGram = warehouse.getTotalWeightGram();

    if (totalWeightGram === 0) {
      return `${gears.length}개`;
    }

    return `${gears.length}개 · ${formatBagWeight(totalWeightGram)}`;
  };

  // 빈 상태는 사실 + 다음 걸음 두 줄이다(핸드오프 Interactions). 원인마다 다음 걸음이 다르다.
  const getEmptyMessage = (): { fact: string; next: string } => {
    if (warehouse.isUnusedOnly()) {
      return {
        fact: '안 쓴 장비가 없어요',
        next: '담아 간 장비를 모두 쓰고 있어요',
      };
    }

    if (warehouse.getQuery().trim()) {
      return {
        fact: '검색 결과가 없어요',
        next: '이름이나 브랜드로 다시 찾아볼까요?',
      };
    }

    return {
      fact: `${josa(`${warehouse.getSelectedFilter().getName()}#{가}`)} 없어요`,
      next: '다른 카테고리를 골라볼까요?',
    };
  };

  const renderTitleBlock = () => (
    <View style={styles.titleRow}>
      <View style={styles.titleIdentity}>
        <PretendardText weight='bold' style={styles.title}>
          창고
        </PretendardText>
        {/* 완전히 빈 창고에서는 `0개`를 말하지 않는다 — 빈 상태 문구가 같은 사실을 더 잘 말한다.
            로딩 중에도 비운다: 아직 세지 못한 값을 `0개`로 단정하면 스켈레톤과 어긋난다.
            제목 행은 최소 높이를 들고 있어 요약이 빠져도 아래가 밀리지 않는다. */}
        {!isEmpty && !isLoading && (
          <PretendardText weight='medium' style={styles.summary}>
            {getSummary()}
          </PretendardText>
        )}
      </View>
      {!isEmpty && (
        <OrderButtonView
          order={warehouse.getOrder()}
          onSelectOption={handleSelectOrder}
        />
      )}
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      // 스피너 대신 도착할 목록과 같은 골격을 그린다 — 구조가 안 바뀌어야 덜컥거리지 않는다.
      return (
        <View style={styles.listContainer}>
          <WarehouseSkeletonView />
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <LiquidCard tone='paper' padding={24} style={styles.emptyCard}>
            <PretendardText weight='bold' style={styles.emptyTitle}>
              창고가 비어 있어요
            </PretendardText>
            <PretendardText style={styles.emptyText}>
              가진 장비를 하나씩 담아보세요
            </PretendardText>
            {/* 상단 크롬의 `+`와 같은 곳으로 가는 버튼이라 잉크로 두지 않는다 —
                주 액션은 화면에 하나이고, 여기는 그 자리로 가는 조용한 안내다.
                흰 카드 위라 `secondary`(흰 면 + 헤어라인)는 테두리만 남아 버튼으로
                읽히지 않는다 — 면을 한 단계 가라앉히는 `quiet`을 쓴다. */}
            <LiquidPillButton
              label='첫 장비 담기'
              variant='quiet'
              block
              onPress={handleAddGear}
              style={styles.emptyCta}
            />
          </LiquidCard>
        </View>
      );
    }

    if (gears.length === 0) {
      // 필터·검색이 걸려 0건인 경우 — 전체가 빈 것(위 분기)과 원인이 다르다.
      const { fact, next } = getEmptyMessage();

      return (
        <View style={styles.emptyContainer}>
          <PretendardText weight='bold' style={styles.emptyTitle}>
            {fact}
          </PretendardText>
          <PretendardText style={styles.emptyText}>{next}</PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 그림자를
            걸면 자기 경계에서 잘린다. 스와이프 액션 면도 이 클립 안에서 끝난다. */}
        <View style={styles.cardShell}>
          <View style={styles.cardClip}>
            {gears.map((gear, index) => (
              <WarehouseGearView
                key={gear.getId()}
                gear={gear}
                warehouse={warehouse}
                divider={index > 0}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout
        edges={IS_IOS ? IOS_EDGES : undefined}
        // 좌우 여백은 블록마다 다르다(크롬 12 · 콘텐츠 20 · 칩 줄은 화면 끝까지) —
        // 컨테이너에 한 값을 걸면 크롬과 칩 줄이 어긋난다.
        paddingHorizontal={0}
        background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
      >
        {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·바 버튼·scroll edge
            effect는 시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
            **타이틀은 비운다** — `창고`는 본문 제목 블록이 주인공이라 바에 또 두면 중복이다
            (배낭 상세와 같은 처리). 검색은 네이티브 검색 바가, 추가는 우측 바 버튼이 맡는다. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerRight: () => (
              <TouchableOpacity
                onPress={handleAddGear}
                style={styles.nativeAddButton}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
                accessibilityLabel='장비 추가'
              >
                <Ionicons name='add' size={26} color={Liquid.ink} />
              </TouchableOpacity>
            ),
            /**
             * iOS 26 네이티브 검색(LG-3).
             *
             * `integratedButton`은 비활성 상태를 **버튼**으로 두고 탭하면 필드로 펼친다 —
             * 목업 §8의 유리 캡슐 안 돋보기가 곧 이 버튼이다(시스템이 그린다).
             * 기본값(`allowToolbarIntegration: true`)이면 iPhone에서 **하단 툴바 가운데**로
             * 내려가므로 꺼서 상단 바에 남긴다.
             */
            ...(isEmpty
              ? {}
              : {
                  headerSearchBarOptions: {
                    placement: 'integratedButton' as const,
                    allowToolbarIntegration: false,
                    // 검색을 펼칠 때 내비게이션 바를 감추지 않는다. iOS 26은 이 값을 문맥으로
                    // 정하는데, 감추는 쪽으로 판단되면 좌측 뒤로가기가 잠깐 가려졌다 사라진다.
                    hideNavigationBar: false,
                    placeholder: '장비 검색',
                    // `cancelButtonText`는 iOS 26부터 무시된다 — 취소 버튼이 글자 없는
                    // X 아이콘으로 바뀌었다(react-native-screens에서도 deprecated).
                    hideWhenScrolling: false,
                    onChangeText: (
                      event: NativeSyntheticEvent<TextInputFocusEventData>
                    ) => warehouse.setQuery(event.nativeEvent.text),
                    onClose: () => warehouse.setQuery(''),
                  },
                }),
          }}
        />
        {/* Android·Web 유리 크롬 — iOS는 네이티브 바가 같은 그림을 내준다(LG-1).
            검색 중에도 남긴다 — 뒤로가기는 검색 상태에서도 살아 있어야 한다. */}
        {!IS_IOS && (
          <WarehouseChromeView
            onPressBack={handlePressBack}
            onPressSearch={() => setIsSearching(true)}
            onPressAdd={handleAddGear}
            showSearch={!isEmpty && !isSearching}
          />
        )}
        <View
          style={[
            styles.headerContainer,
            // 투명 헤더(상태바 + 44pt) 아래에서 고정 상단 콘텐츠가 시작하게 한다.
            IS_IOS && {
              paddingTop: insets.top + LiquidLayout.navBar + HEADER_TOP_GAP,
            },
          ]}
        >
          {/* 검색 중에는 제목 블록이 검색 필드로 바뀐다(WH-8) — 화면이 검색 상태임이
              드러나야 하고, 그때 `창고` 타이틀은 군더더기다. iOS는 네이티브 검색 바가
              이 자리를 대신하므로 제목 블록을 그대로 둔다. */}
          {isSearching && !IS_IOS ? (
            <View style={styles.searchRow}>
              <WarehouseSearchFieldView
                warehouse={warehouse}
                onClose={handleCloseSearch}
              />
            </View>
          ) : (
            renderTitleBlock()
          )}
          {!isEmpty && <WarehouseFiltersView warehouse={warehouse} />}
        </View>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </Layout>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'column',
    paddingTop: HEADER_TOP_GAP,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 좌: 제목 + 요약 / 우: 정렬 드롭다운. 아래를 맞춰(flex-end) 드롭다운이 요약 줄과 나란히 앉는다.
  titleRow: {
    minHeight: HEADER_ROW_MIN_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  titleIdentity: {
    flexShrink: 1,
  },
  title: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  summary: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: SUMMARY_LINE_HEIGHT,
    color: Liquid.inkTertiary,
  },
  // 제목 블록이 비운 높이를 그대로 채운다 — 필드(48)는 이 안에서 가운데 놓인다.
  searchRow: {
    minHeight: HEADER_ROW_MIN_HEIGHT,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  // 카드는 칩 줄에서 16 떨어진다(목업 §8). 하단은 마지막 행이 화면 밑단에 붙지 않게 비운다.
  listContainer: {
    paddingTop: 16,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: LiquidLayout.scrollBottom,
  },
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    textAlign: 'center',
    color: Liquid.ink,
  },
  emptyText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    textAlign: 'center',
    color: Liquid.inkTertiary,
  },
  emptyCta: {
    marginTop: 12,
  },
  // iOS 네이티브 headerRight 아이콘 버튼 — HIG 최소 터치 타깃 44pt 확보.
  nativeAddButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(WarehouseView);
