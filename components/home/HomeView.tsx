import { FC, useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import { Color } from '@/constants/DesignTokens';
import Home from '@/model/home/Home';
import { selectTripPlan } from '@/model/home/HomeTripPlan';

interface Props {
  home: Home;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const HomeView: FC<Props> = ({ home }) => {
  const insets = useSafeAreaInsets();
  const isLoading = home.isLoading();
  const isLoggedIn = home.isLoggedIn();
  /**
   * D-day 기준 날짜. 앱을 켜 둔 채 자정을 넘기면 `D-1`이 `오늘 출발`이 돼야 하므로
   * 포커스마다 새로 잡는다(HM-6). 상태로 들고 있어야 다시 렌더된다.
   */
  const [today, setToday] = useState(() => dayjs());

  useFocusEffect(
    useCallback(() => {
      setToday(dayjs());
      home.load();
    }, [home])
  );

  // 로그인 상태 reaction을 들고 있으므로 언마운트 시 정리한다.
  useEffect(() => {
    return () => {
      home.dispose();
    };
  }, [home]);

  const render = () => {
    if (isLoading) {
      return <HomeSkeletonView />;
    }

    if (!isLoggedIn) {
      return (
        <View style={styles.signedOut}>
          <PretendardText weight='bold' style={styles.signedOutText}>
            로그인하면{'\n'}다음 여행과 창고를 볼 수 있어요
          </PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HomeUpcomingTripView plan={selectTripPlan(home.getBags(), today)} />
        <HomeWarehousePreviewView gears={home.getGears()} />
        <View
          style={{
            height: Platform.select({
              ios: insets.bottom + 40,
              default: 40,
            }),
          }}
        />
      </ScrollView>
    );
  };

  return (
    <Layout edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}>
      <View style={styles.header}>
        <PretendardText weight='bold' style={styles.headerText}>
          홈
        </PretendardText>
      </View>
      {render()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  // 탭 루트 타이틀 — 정보(`내 정보`)·배낭 탭과 같은 문법(20pt bold + paddingVertical 24).
  // 예전 창고 탭의 32pt large title은 검색 버튼을 같은 행에 두려던 그 화면만의 예외였고,
  // 창고가 탭에서 내려온 지금 홈이 그걸 물려받을 이유가 없다.
  header: {
    paddingVertical: 24,
  },
  headerText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  signedOut: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signedOutText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Color.textSecondary,
  },
});

export default observer(HomeView);
