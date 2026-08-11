import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import BagItemView from './BagItemView';
import { groupBagsByTripSection } from '@/model/bag/BagTripSection';
import BagAddView from './BagAddView';
import BagListSkeletonView from './BagListSkeletonView';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import { useFocusEffect } from 'expo-router/react-navigation';
import Layout from '../Layout';
import { Acg, AcgFontSize, AcgLayout } from '@/constants/DesignTokens';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import app from '@/model/app/App';

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

// 화면 제목 크기 — 홈과 같은 값. 34는 이 화면에서 가장 큰 활자였는데, 제목은 이름표라
// 앵커가 될 값이 아니다(HM-8과 같은 판단).
const TITLE_SIZE = 28;

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const insets = useSafeAreaInsets();
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();

  useFocusEffect(
    useCallback(() => {
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

  const render = () => {
    switch (true) {
      case isLoading: {
        // 스피너 대신 들어올 화면과 같은 골격을 그린다(BAG-1) — 구조가 안 바뀌어야 덜컥거리지 않는다.
        return <BagListSkeletonView />;
      }
      case isEmpty: {
        // 빈 상태는 사실 + 다음 걸음 두 줄이다(플로팅 `배낭 추가`가 그 걸음을 맡는다).
        return (
          <View style={styles.emptyContainer}>
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              아직 만든 배낭이 없어요
            </PretendardText>
            <PretendardText style={styles.emptySubtitle}>
              첫 배낭을 만들면 여기에 쌓여요
            </PretendardText>
          </View>
        );
      }
      default: {
        return (
          <>
            <View style={styles.headerContainer}>
              {/* 한글이라 콘덴스드 대신 Pretendard를 쓴다(그 서체엔 한글 글리프가 없다).
                  개수는 제목에 남긴다 — 목록 길이는 훑기 전에 알면 쓸모가 있는 값이다. */}
              <PretendardText weight='semibold' style={styles.headerText}>
                배낭 {bags.length}개
              </PretendardText>
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
              {/* 여행 중 / 예정 / 지난 세 구간(BAG-1). 구간 안의 차례는 정렬 선택을
                  그대로 따르고, 빈 구간은 제목까지 렌더하지 않는다. */}
              {groupBagsByTripSection(bags).map(group => (
                <View key={group.section} style={styles.section}>
                  <AcgSectionHeaderView title={group.label} />
                  {group.bags.map((bagItem: BagItem, index: number) => (
                    <BagItemView
                      key={bagItem.getID()}
                      bag={bag}
                      bagItem={bagItem}
                      divided={index > 0}
                    />
                  ))}
                </View>
              ))}
              <View
                style={{
                  minHeight: Platform.select({
                    ios: insets.bottom + AcgLayout.scrollBottom,
                    android: AcgLayout.scrollBottom,
                    default: AcgLayout.scrollBottom,
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
        paddingHorizontal={AcgLayout.screenPadding}
        /**
         * 목록 화면은 순백이다 — 지형 그래픽은 홈에만 둔다(2026-08-11 사용자 결정).
         * 목록이 빽빽한 화면에서 지면 무늬는 행 사이 헤어라인·글자와 섞여 지저분해진다.
         */
        background={<View style={styles.ground} />}
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
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
  container: {
    position: 'relative',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    // 플로팅 `배낭 추가` 버튼과 겹치지 않도록 살짝 위로 올린다.
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 25,
    color: Acg.ink,
  },
  emptySubtitle: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.textMuted,
  },
  // 좌: 개수 텍스트 / 우: 정렬 드롭다운 (창고 컨트롤 행과 같은 문법, BAG-6)
  // gap은 좁은 화면에서 텍스트가 접혔을 때 드롭다운과 맞닿지 않게 한다.
  headerContainer: {
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    flexShrink: 1,
    fontSize: TITLE_SIZE,
    letterSpacing: -0.5,
    lineHeight: TITLE_SIZE + 4,
    color: Acg.ink,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // 구간 사이는 넉넉히 벌려 제목이 앞 구간 끝에 붙지 않게 한다.
  section: {
    marginBottom: 26,
  },
});

export default observer(BagView);
