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
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import AcgScreenBackground from '@/components/acg/AcgScreenBackground';
import app from '@/model/app/App';

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

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
        return (
          <View style={styles.emptyContainer}>
            <PretendardText weight='bold' style={styles.emptyText}>
              아직 등록한{'\n'}배낭이 없어요:(
            </PretendardText>
          </View>
        );
      }
      default: {
        return (
          <>
            <View style={styles.headerContainer}>
              {/* 시안: "배낭 N개" 34px. 한글이라 콘덴스드 대신 Pretendard Bold. */}
              <PretendardText weight='bold' style={styles.headerText}>
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
                  <PretendardText weight='bold' style={styles.sectionTitle}>
                    {group.label}
                  </PretendardText>
                  {group.bags.map((bagItem: BagItem) => (
                    <BagItemView
                      key={bagItem.getID()}
                      bag={bag}
                      bagItem={bagItem}
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
        paddingHorizontal={AcgLayout.screenH}
        background={<AcgScreenBackground />}
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
    position: 'relative',
  },
  emptyText: {
    position: 'absolute',
    top: '30%',
    left: 0,
    fontSize: 30,
    color: Acg.ink,
  },
  // 좌: 개수 텍스트 / 우: 정렬 드롭다운 (창고 컨트롤 행과 같은 문법, BAG-6)
  // gap은 좁은 화면에서 텍스트가 접혔을 때 드롭다운과 맞닿지 않게 한다.
  headerContainer: {
    paddingTop: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    flexShrink: 1,
    fontSize: 34,
    letterSpacing: -0.68,
    lineHeight: 38,
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
    marginBottom: 14,
  },
  // 지면 위 섹션 제목 — 앱 공통 18px/700 textTertiary(ACG).
  sectionTitle: {
    fontSize: 18,
    color: Acg.textTertiary,
    marginBottom: 10,
  },
});

export default observer(BagView);
