import { FC, useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import AcgScreenBackground from '@/components/acg/AcgScreenBackground';
import AcgHighlightText from '@/components/acg/AcgHighlightText';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import Home from '@/model/home/Home';
import { selectTripPlan } from '@/model/home/HomeTripPlan';

interface Props {
  home: Home;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;
// 화면 제목 크기(ACG) — 콘덴스드 44px.
const TITLE_SIZE = 44;

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
            // 플로팅 탭바 아래로 콘텐츠가 흐르므로 시안대로 130을 비운다(ACG).
            height: Platform.select({
              ios: insets.bottom + AcgLayout.scrollBottom,
              default: AcgLayout.scrollBottom,
            }),
          }}
        />
      </ScrollView>
    );
  };

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={AcgLayout.screenH}
      background={<AcgScreenBackground />}
    >
      {/* 화면 제목 — 44px에 형광펜 띠(ACG). 한글이라 콘덴스드(Archivo Narrow) 대신
          Pretendard Bold를 쓴다 — 그 서체에는 한글 글리프가 없어 글자가 깨진다. */}
      <View style={styles.header}>
        <AcgHighlightText fontSize={TITLE_SIZE}>
          <PretendardText weight='bold' style={styles.headerText}>
            홈
          </PretendardText>
        </AcgHighlightText>
      </View>
      {render()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerText: {
    fontSize: TITLE_SIZE,
    letterSpacing: -0.88, // -.02em
    // 시안은 line-height .9지만 한글은 그 값에서 위가 잘린다 — 글자 크기만큼 준다.
    lineHeight: TITLE_SIZE,
    color: Acg.ink,
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
    color: Acg.textSecondary,
  },
});

export default observer(HomeView);
