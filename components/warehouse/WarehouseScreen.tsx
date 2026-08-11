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
import OrderOption from '@/model/order/OrderOption';
import {
  LedgerColor,
  LedgerLayout,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';
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

// LG-1: iOS만 네이티브 스택 헤더를 쓰고, Android/Web은 커스텀 크롬 행을 그린다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼 이중 인셋을 막는다.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;
// iOS 내비게이션 바 높이. 플랫폼이 정한 치수라 여백 토큰이 아니다.
const NAV_BAR_HEIGHT = 44;
// iOS 바 버튼 글리프. 시스템 바 버튼과 같은 급으로 둔다.
const ADD_ICON_SIZE = 26;

const PRESS_OPACITY = 0.7;

/**
 * 페이지 머리의 자연 높이(타이틀 30 + 4 + 요약 줄 18).
 *
 * 검색 행이 이 자리를 **정확히 대체**해야 토글할 때 아래 탭·목록이 밀리지 않는다(WH-8).
 * 두 블록이 같은 상수를 참조해 계산이 아니라 구조로 같아진다.
 */
const HEAD_MIN_HEIGHT =
  LedgerType.display.lineHeight + LedgerSpace.xs + LedgerType.label.lineHeight;

/**
 * WH-1 창고 화면 (Ledger).
 *
 * 지면은 **흰 종이 하나**다 — 지형·베일·글로우·유리가 없다. 위에서 아래로 크롬(아이콘 3개) →
 * 페이지 머리(`창고` + 규모) → 컨트롤 줄(탭 + 정렬 + 구역 경계) → 원장(행 + 헤어라인)이고,
 * 구분은 여백·글자급·정렬·헤어라인 순서로만 낸다. 카드로 감싸는 자리는 한 곳도 없다.
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
   * 개수와 총 무게를 한 덩어리로 읽힌다. 필터·검색을 적용한 **현재 목록** 기준이라 아래
   * 원장과 같은 사실을 말한다. 무게가 모두 미입력이면 `0kg`은 뜻이 없어 뺀다.
   */
  const getSummary = (): string => {
    const totalWeightGram = warehouse.getTotalWeightGram();

    if (totalWeightGram === 0) {
      return `${gears.length}개`;
    }

    return `${gears.length}개 · ${formatBagWeight(totalWeightGram)}`;
  };

  // 빈 상태는 사실 + 다음 걸음 두 줄이다. 원인마다 다음 걸음이 다르다.
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

  /**
   * 페이지 머리 — 화면 대상(`창고`)과 규모(`57개 · 44.7kg`)를 위아래로 둔다.
   *
   * 규모를 정렬과 한 행에 묶지 않는다: 정렬은 컨트롤 줄의 것이고, 규모는 제목에 딸린
   * 사실이다. 같은 행에 두면 읽는 값과 조작하는 값이 한 줄에서 섞인다.
   */
  const renderPageHead = () => (
    <View style={styles.pageHead}>
      <PretendardText weight='bold' style={styles.title}>
        창고
      </PretendardText>
      {/* 완전히 빈 창고에서는 `0개`를 말하지 않는다 — 빈 상태 문구가 같은 사실을 더 잘 말한다.
          로딩 중에도 비운다: 아직 세지 못한 값을 `0개`로 단정하면 스켈레톤과 어긋난다.
          머리 블록은 최소 높이를 들고 있어 요약이 빠져도 아래가 밀리지 않는다. */}
      {!isEmpty && !isLoading && (
        <PretendardText style={styles.summary}>{getSummary()}</PretendardText>
      )}
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      // 스피너 대신 도착할 원장과 같은 골격을 그린다 — 구조가 안 바뀌어야 덜컥거리지 않는다.
      return (
        <View style={styles.listContent}>
          <WarehouseSkeletonView />
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyBlock}>
          <PretendardText weight='semibold' style={styles.emptyFact}>
            창고가 비어 있어요
          </PretendardText>
          <PretendardText style={styles.emptyNext}>
            가진 장비를 하나씩 담아보세요
          </PretendardText>
          {/* 크롬의 `+`와 같은 곳으로 가는 조용한 안내라 잉크 면을 깔지 않는다 —
              주 액션은 화면에 하나이고 그 자리는 크롬의 `+`다. */}
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={handleAddGear}
            activeOpacity={PRESS_OPACITY}
            accessibilityRole='button'
            accessibilityLabel='첫 장비 담기'
          >
            <PretendardText weight='semibold' style={styles.emptyActionLabel}>
              첫 장비 담기
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    if (gears.length === 0) {
      // 필터·검색이 걸려 0건인 경우 — 전체가 빈 것(위 분기)과 원인이 다르다.
      const { fact, next } = getEmptyMessage();

      return (
        <View style={styles.emptyBlock}>
          <PretendardText weight='semibold' style={styles.emptyFact}>
            {fact}
          </PretendardText>
          <PretendardText style={styles.emptyNext}>{next}</PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 첫 행 위에는 헤어라인을 두지 않는다 — 컨트롤 줄 아래 구역 경계가 이미 선을 그었다. */}
        {gears.map((gear, index) => (
          <WarehouseGearView
            key={gear.getId()}
            gear={gear}
            warehouse={warehouse}
            divider={index > 0}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout
        edges={IS_IOS ? IOS_EDGES : undefined}
        // 좌우 여백은 블록마다 다르다(크롬은 아이콘 상자가 축을 잡고, 콘텐츠는 거터 16,
        // 탭 줄은 화면 끝까지 블리드) — 컨테이너에 한 값을 걸면 서로 어긋난다.
        paddingHorizontal={0}
        // 지면은 흰 종이 하나다. `Layout`의 기본 지면(Liquid `canvas`)을 덮는다.
        background={<View style={styles.page} />}
      >
        {/* LG-1: iOS만 네이티브 투명 헤더 — back·바 버튼·scroll edge effect는 시스템에
            위임한다. **타이틀은 비운다** — `창고`는 페이지 머리가 주인공이라 바에 또 두면
            중복이다. 검색은 네이티브 검색 바가, 추가는 우측 바 버튼이 맡는다. */}
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
                activeOpacity={PRESS_OPACITY}
                accessibilityRole='button'
                accessibilityLabel='장비 추가'
              >
                <Ionicons
                  name='add'
                  size={ADD_ICON_SIZE}
                  color={LedgerColor.ink}
                />
              </TouchableOpacity>
            ),
            /**
             * iOS 26 네이티브 검색(LG-3).
             *
             * `integratedButton`은 비활성 상태를 **버튼**으로 두고 탭하면 필드로 펼친다.
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
        {/* Android·Web 크롬 — iOS는 네이티브 바가 같은 그림을 내준다(LG-1).
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
              paddingTop: insets.top + NAV_BAR_HEIGHT + LedgerSpace.sm,
            },
          ]}
        >
          {/* 검색 중에는 페이지 머리가 검색 필드로 바뀐다(WH-8) — 화면이 검색 상태임이
              드러나야 하고, 그때 `창고` 타이틀은 군더더기다. iOS는 네이티브 검색 바가
              이 자리를 대신하므로 페이지 머리를 그대로 둔다. */}
          {isSearching && !IS_IOS ? (
            <View style={styles.searchRow}>
              <WarehouseSearchFieldView
                warehouse={warehouse}
                onClose={handleCloseSearch}
              />
            </View>
          ) : (
            renderPageHead()
          )}
          {!isEmpty && (
            <WarehouseFiltersView
              warehouse={warehouse}
              onSelectOrder={handleSelectOrder}
            />
          )}
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
  page: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: LedgerColor.page,
  },
  headerContainer: {
    flexDirection: 'column',
    paddingTop: LedgerSpace.sm,
    paddingHorizontal: LedgerLayout.pageX,
  },
  pageHead: {
    minHeight: HEAD_MIN_HEIGHT,
    flexDirection: 'column',
  },
  title: {
    fontSize: LedgerType.display.fontSize,
    lineHeight: LedgerType.display.lineHeight,
    letterSpacing: LedgerType.display.letterSpacing,
    color: LedgerColor.ink,
  },
  summary: {
    marginTop: LedgerSpace.xs,
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
    color: LedgerColor.inkTertiary,
  },
  // 페이지 머리가 비운 높이를 그대로 채운다 — 필드(44)는 이 안에서 가운데 놓인다.
  searchRow: {
    minHeight: HEAD_MIN_HEIGHT,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  /**
   * 원장은 컨트롤 줄의 구역 경계에 바로 이어 붙는다(위 여백 없음) — 첫 행의 세로 패딩(12)이
   * 숨 쉴 자리를 이미 갖고 있고, 선과 첫 행이 떨어지면 선이 목록의 것이 아닌 것처럼 보인다.
   */
  listContent: {
    paddingHorizontal: LedgerLayout.pageX,
    paddingBottom: LedgerLayout.scrollBottom,
  },
  /**
   * 빈 상태도 좌측 축에 정렬한다 — 가운데 정렬하면 이 화면에서 유일하게 축이 다른 블록이
   * 되고, 원장의 정렬 규칙(좌측 정체 / 우측 수치)이 여기서만 풀린다.
   */
  emptyBlock: {
    paddingTop: LedgerSpace.xxl,
    paddingHorizontal: LedgerLayout.pageX,
  },
  emptyFact: {
    fontSize: LedgerType.title.fontSize,
    lineHeight: LedgerType.title.lineHeight,
    letterSpacing: LedgerType.title.letterSpacing,
    color: LedgerColor.ink,
  },
  emptyNext: {
    marginTop: LedgerSpace.xs,
    fontSize: LedgerType.body.fontSize,
    lineHeight: LedgerType.body.lineHeight,
    color: LedgerColor.inkTertiary,
  },
  // 면 없는 텍스트 버튼. 높이로 44 터치 타깃을 확보한다.
  emptyAction: {
    marginTop: LedgerSpace.md,
    minHeight: LedgerLayout.rowMin,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  emptyActionLabel: {
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
    color: LedgerColor.ink,
    textDecorationLine: 'underline',
  },
  // iOS 네이티브 headerRight 아이콘 버튼 — HIG 최소 터치 타깃 44pt 확보.
  nativeAddButton: {
    minWidth: LedgerLayout.rowMin,
    minHeight: LedgerLayout.rowMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(WarehouseView);
