import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import BagItemView from './BagItemView';
import BagTripSection, {
  groupBagsByTripSection,
} from '@/model/bag/BagTripSection';
import BagAddView from './BagAddView';
import BagListSkeletonView from './BagListSkeletonView';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import { formatBagWeight } from '@/model/gear/WeightFormat';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import { useFocusEffect } from 'expo-router/react-navigation';
import Layout from '../Layout';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
import { getDDayLabel, selectTripPlan } from '@/model/home/HomeTripPlan';
import app from '@/model/app/App';

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

// 첫 섹션은 헤더에서 24, 뒤 섹션은 앞 카드에서 22 떨어진다(목업 §5).
const FIRST_SECTION_GAP = 24;
const SECTION_GAP = 22;

// 헤더 보조 줄. 개수와 평균 무게를 한 덩어리로 읽힌다 — 총합은 여행마다 따로인 값을 더해
// 뜻이 없다(배낭 4개 무게를 합칠 일이 없다).
// 평균도 g에서 내 다른 합계와 같은 표기를 쓴다(DM-26) — 표시용 kg를 평균하면 오차가 쌓인다.
const getAverageWeight = (bags: BagItem[]): string => {
  if (bags.length === 0) {
    return formatBagWeight(0);
  }

  const total = bags.reduce((sum, bagItem) => sum + bagItem.getWeightGram(), 0);

  return formatBagWeight(total / bags.length);
};

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const insets = useSafeAreaInsets();
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();
  /**
   * D-day 기준 날짜. 앱을 켜 둔 채 자정을 넘기면 `D-1`이 `오늘 출발`이 돼야 하므로
   * 포커스마다 새로 잡는다(홈 HM-6과 같은 처리). 상태로 들고 있어야 다시 렌더된다.
   */
  const [today, setToday] = useState(() => dayjs());

  useFocusEffect(
    useCallback(() => {
      setToday(dayjs());
      bag.getList();
    }, [bag])
  );

  // Bag이 로그인 상태 reaction을 들고 있으므로 언마운트 시 정리한다.
  useEffect(() => {
    return () => {
      bag.dispose();
    };
  }, [bag]);

  const handleSelectOrder = (option: OrderOption) => {
    app
      .getAnalyticsManager()
      ?.logClick('bag_sort', { order: option.getName() });
  };

  /**
   * 라임 배지와 진행 줄을 받을 배낭 하나.
   *
   * **홈 히어로와 같은 계산(`selectTripPlan`)을 쓴다** — 두 화면이 서로 다른 배낭을
   * "가장 급한 것"으로 세우면 사용자가 어느 쪽을 믿어야 할지 알 수 없다.
   * 예정이 하나도 없어 끝난 여행이 뽑히는 경우는 제외한다(지난 카드는 조용한 면이다).
   */
  const getImminentBagId = (): string | null => {
    const { primary } = selectTripPlan(bags, today);

    return primary?.getID() ?? null;
  };

  const render = () => {
    switch (true) {
      case isLoading: {
        // 스피너 대신 들어올 화면과 같은 골격을 그린다(BAG-1) — 구조가 안 바뀌어야 덜컥거리지 않는다.
        return <BagListSkeletonView />;
      }
      case isEmpty: {
        // 빈 상태는 사실 + 다음 걸음 두 줄(핸드오프 Interactions).
        return (
          <View style={styles.emptyContainer}>
            <PretendardText weight='bold' style={styles.emptyTitle}>
              아직 만든 배낭이 없어요
            </PretendardText>
            <PretendardText style={styles.emptySubtitle}>
              이번 주말 1박으로 하나 만들어 둘까요?
            </PretendardText>
          </View>
        );
      }
      default: {
        const imminentBagId = getImminentBagId();

        return (
          <>
            <View style={styles.headerContainer}>
              {/* 화면 대상은 `배낭` 하나 — 개수·평균은 그 아래 보조 줄로 내린다(목업 §5). */}
              <View style={styles.headerIdentity}>
                <PretendardText weight='bold' style={styles.headerTitle}>
                  배낭
                </PretendardText>
                <PretendardText weight='medium' style={styles.headerSummary}>
                  {`${bags.length}개 · 평균 ${getAverageWeight(bags)}`}
                </PretendardText>
              </View>
              <OrderButtonView
                order={bag.getOrder()}
                onSelectOption={handleSelectOrder}
              />
            </View>
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 여행 중 / 여행 예정 / 지난 여행 세 구간(BAG-1). 구간 안의 차례는 정렬 선택을
                  그대로 따르고, 빈 구간은 라벨까지 렌더하지 않는다. */}
              {groupBagsByTripSection(bags, today).map((group, groupIndex) => (
                <View
                  key={group.section}
                  style={{
                    marginTop:
                      groupIndex === 0 ? FIRST_SECTION_GAP : SECTION_GAP,
                  }}
                >
                  <LiquidSectionLabel>{group.label}</LiquidSectionLabel>
                  {group.bags.map((bagItem: BagItem) => (
                    <BagItemView
                      key={bagItem.getID()}
                      bag={bag}
                      bagItem={bagItem}
                      section={group.section}
                      dDayLabel={getDDayLabel(bagItem, today)}
                      imminent={
                        group.section !== BagTripSection.Past &&
                        bagItem.getID() === imminentBagId
                      }
                    />
                  ))}
                </View>
              ))}
              <View
                style={{
                  // 플로팅 탭바 아래로 콘텐츠가 흐르므로 130을 비운다(핸드오프 레이아웃).
                  minHeight: Platform.select({
                    ios: insets.bottom + LiquidLayout.scrollBottom,
                    default: LiquidLayout.scrollBottom,
                  }),
                }}
              />
            </ScrollView>
          </>
        );
      }
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout
        edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
        paddingHorizontal={LiquidLayout.screenH}
        // 지형 없이 좌상단 라임 글로우만 — 목록 화면은 canvas 지면이다(목업 §5).
        background={<LiquidBackdrop screen='none' glowPosition='topLeft' />}
      >
        {render()}
        {/* 로딩 중에는 띄우지 않는다(BAG-1). 탭이 막 마운트된 첫 프레임에는 네이티브 탭바 몫이
            반영되기 전이라 `insets.bottom`이 작게 잡혀 버튼이 **탭바 뒤로 내려간다.**
            목록이 온 뒤(= inset 정착 후)에 노출하면 위치가 정확하고, 로딩 위에 CTA가 겹치지도
            않는다 — 피드(FD-2)가 같은 이유로 같은 처리를 한다. */}
        {!isLoading && <BagAddView bag={bag} />}
      </Layout>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    color: Liquid.ink,
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    color: Liquid.inkTertiary,
  },
  // 좌: 제목 + 요약 / 우: 정렬 드롭다운. 아래를 맞춰(flex-end) 드롭다운이 요약 줄과 나란히 앉는다.
  headerContainer: {
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  headerIdentity: {
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  headerSummary: {
    marginTop: 4,
    fontSize: 13,
    color: Liquid.inkTertiary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default observer(BagView);
