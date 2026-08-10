import { FC, useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeRecordSummaryView from '@/components/home/HomeRecordSummaryView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
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
          <PretendardText weight='bold' style={styles.signedOutTitle}>
            로그인하면 다음 여행이 보여요
          </PretendardText>
          <PretendardText style={styles.signedOutSubtitle}>
            창고와 배낭도 함께 따라옵니다
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
        <HomeRecordSummaryView gears={home.getGears()} bags={home.getBags()} />
        <View
          style={{
            // 플로팅 탭바 아래로 콘텐츠가 흐르므로 130을 비운다(핸드오프 레이아웃).
            height: Platform.select({
              ios: insets.bottom + LiquidLayout.scrollBottom,
              default: LiquidLayout.scrollBottom,
            }),
          }}
        />
      </ScrollView>
    );
  };

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={LiquidLayout.screenH}
      background={<LiquidBackdrop screen='home' glowPosition='topLeft' coolGlow />}
    >
      {/*
        헤더는 화면 이름(`홈`)이 아니라 **오늘과 다음 할 일**을 말한다(목업 홈 절).
        탭바가 이미 어느 탭인지 알려주므로 제목으로 한 번 더 말하지 않는다.
        목업 우측의 알림 버튼은 두지 않았다 — 이 앱에 알림함 화면이 없어 눌러도 갈 곳이 없다.
      */}
      <View style={styles.header}>
        <PretendardText weight='medium' style={styles.headerDate}>
          {today.format('dddd, M월 D일')}
        </PretendardText>
        <PretendardText weight='bold' style={styles.headerTitle}>
          다음 여행까지
        </PretendardText>
      </View>
      {render()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 6,
    gap: 2,
  },
  headerDate: {
    fontSize: 13,
    color: Liquid.inkTertiary,
  },
  headerTitle: {
    fontSize: LiquidType.title1.fontSize,
    lineHeight: LiquidType.title1.lineHeight,
    letterSpacing: LiquidType.title1.letterSpacing,
    color: Liquid.ink,
  },
  scrollView: {
    flex: 1,
    marginTop: 18,
  },
  scrollContent: {
    flexGrow: 1,
  },
  signedOut: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signedOutTitle: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    color: Liquid.ink,
  },
  signedOutSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    color: Liquid.inkTertiary,
  },
});

export default observer(HomeView);
