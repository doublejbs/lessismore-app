import { FC, useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeRecordSummaryView from '@/components/home/HomeRecordSummaryView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import {
  Liquid,
  LiquidBackdrop as Backdrop,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';
import Home from '@/model/home/Home';
import { formatHeaderDate } from '@/model/home/HomeDateFormat';
import { selectTripPlan } from '@/model/home/HomeTripPlan';
import app from '@/model/app/App';

interface Props {
  home: Home;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

/**
 * 지면색 페이드에 쓰는 알파 짝. 하단 고정 CTA를 받치는 `ctaVeil`과 **같은 두 값**을 읽어
 * 새 색을 만들지 않는다 — 상단 경계는 이 짝을 뒤집어 쓴다.
 */
const [VEIL_CLEAR, VEIL_SOLID] = Backdrop.ctaVeil.colors;
const TOP_FADE_COLORS = [VEIL_SOLID, VEIL_CLEAR] as const;
const BOTTOM_FADE_COLORS = [VEIL_CLEAR, VEIL_SOLID] as const;

/**
 * 고정 제목과 스크롤 콘텐츠의 경계에 얹는 지면색 페이드 높이(2026-08-11 디자인 리뷰).
 *
 * 제목 바로 아래에서 장비 행이 반토막으로 잘려 렌더 오류처럼 보였다 — iOS의 scroll edge
 * effect와 같은 처리로, 콘텐츠가 지면색으로 사라지면서 경계가 의도된 것으로 읽힌다.
 *
 * **스크롤 오프셋을 추적하지 않는다.** 오프셋에 따라 제목 블록에 유리 면을 입히는 쪽이
 * 이론상 곱지만 onScroll·보간·리렌더가 붙고 최상단/최하단 상태를 따로 관리해야 한다.
 * 대신 콘텐츠 상단 패딩을 **이 값과 같게** 두어(`scrollContent`) 최상단에서는 페이드가
 * 히어로 위가 아니라 제목과 히어로 사이의 빈 자리에 놓이게 했다 — 그 자리의 지면은 이미
 * 거의 `canvas`라 띠가 도드라지지 않고, 스크롤하면 그 자리로 콘텐츠가 들어와 녹는다.
 */
const SCROLL_TOP_FADE_HEIGHT = 20;

/**
 * 떠 있는 iOS 26 유리 탭바가 콘텐츠 위에 차지하는 높이(핸드오프: 바 h60 · 화면 아래 여백 8)
 * + 홈인디케이터(`insets.bottom`). 스크롤 하단 여백(`scrollBottom` 130 + insets)이 이 값보다
 * 커야 마지막 행이 탭바에 걸리지 않는다.
 */
const TAB_BAR_HEIGHT = 60;
const TAB_BAR_BOTTOM_GAP = 8;
// 탭바 위에서 콘텐츠가 지면색으로 녹아드는 구간.
const TAB_BAR_FADE_FEATHER = 36;

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

  const handleLogin = () => {
    app.getLogInAlertManager()?.show();
  };

  /**
   * 스크롤 끝에 비우는 자리. iOS는 콘텐츠가 탭바 뒤로 흐르므로 홈인디케이터까지 더한다 —
   * 130(핸드오프) + insets.bottom은 탭바 실측(8 + 60 + insets)보다 크다.
   */
  const scrollBottomSpace = Platform.select({
    ios: insets.bottom + LiquidLayout.scrollBottom,
    default: LiquidLayout.scrollBottom,
  });
  const tabBarOverlay = insets.bottom + TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT;
  const bottomFadeHeight = tabBarOverlay + TAB_BAR_FADE_FEATHER;
  /**
   * 지면색이 꽉 차는 지점 = **탭바 세로 중앙**. 위쪽 절반은 유리가 굴절시킬 콘텐츠를 남기고
   * (핸드오프: 콘텐츠는 탭바 아래로 흐른다), 그 아래 탭바 하단·홈인디케이터 영역에는 지면만
   * 남는다 — 떠 있는 탭바 밑으로 행이 비쳐 레이아웃 버그처럼 보였던 자리다.
   */
  const bottomFadeSolidAt =
    (bottomFadeHeight -
      (insets.bottom + TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT / 2)) /
    bottomFadeHeight;

  const render = () => {
    if (isLoading) {
      return <HomeSkeletonView />;
    }

    if (!isLoggedIn) {
      // 할 수 있는 일이 로그인 하나뿐인 자리라 설명을 두지 않고 버튼만 세운다 — 무엇을
      // 얻는지는 시트가 말한다.
      return (
        <View style={styles.signedOut}>
          <LiquidPillButton
            label='로그인'
            variant='primary'
            block
            onPress={handleLogin}
          />
        </View>
      );
    }

    return (
      <View style={styles.scrollRegion}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <HomeUpcomingTripView
            plan={selectTripPlan(home.getBags(), today)}
            today={today}
          />
          <HomeWarehousePreviewView gears={home.getGears()} />
          <HomeRecordSummaryView
            gears={home.getGears()}
            bags={home.getBags()}
          />
          <View style={{ height: scrollBottomSpace }} />
        </ScrollView>

        {/* 고정 제목과 스크롤의 경계 — 콘텐츠가 지면색으로 사라진다. */}
        <LinearGradient
          colors={TOP_FADE_COLORS}
          style={styles.topFade}
          pointerEvents='none'
        />

        {/* 떠 있는 유리 탭바 자리 — iOS만. Android·Web의 탭바는 불투명하고 콘텐츠 영역
            밖에 있어 아래로 흐르는 콘텐츠가 없다. */}
        {Platform.OS === 'ios' ? (
          <LinearGradient
            colors={BOTTOM_FADE_COLORS}
            locations={[0, bottomFadeSolidAt] as const}
            style={[styles.bottomFade, { height: bottomFadeHeight }]}
            pointerEvents='none'
          />
        ) : null}
      </View>
    );
  };

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={LiquidLayout.screenH}
      background={
        <LiquidBackdrop screen='home' glowPosition='topLeft' coolGlow />
      }
    >
      {/*
        헤더는 화면 이름(`홈`)이 아니라 **오늘과 다음 할 일**을 말한다(목업 홈 절).
        탭바가 이미 어느 탭인지 알려주므로 제목으로 한 번 더 말하지 않는다.
        목업 우측의 알림 버튼은 두지 않았다 — 이 앱에 알림함 화면이 없어 눌러도 갈 곳이 없다.
      */}
      <View style={styles.header}>
        <PretendardText weight='medium' style={styles.headerDate}>
          {formatHeaderDate(today)}
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
  // 페이드를 스크롤 뷰 위에 절대 배치하려면 둘을 감싸는 자리가 필요하다.
  scrollRegion: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // 상단 패딩은 페이드 높이와 **같아야** 한다 — 최상단에서 히어로가 베일에 씻기지 않는다.
  scrollContent: {
    flexGrow: 1,
    paddingTop: SCROLL_TOP_FADE_HEIGHT,
  },
  /**
   * 페이드는 화면 좌우 패딩 밖까지 덮는다 — 창고 미리보기의 칩 줄이 화면 가장자리까지
   * 블리드하므로(`chipsScroll`) 패딩 안쪽만 덮으면 칩이 경계에서 잘린 채 남는다.
   */
  topFade: {
    position: 'absolute',
    top: 0,
    left: -LiquidLayout.screenH,
    right: -LiquidLayout.screenH,
    height: SCROLL_TOP_FADE_HEIGHT,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: -LiquidLayout.screenH,
    right: -LiquidLayout.screenH,
  },
  signedOut: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default observer(HomeView);
