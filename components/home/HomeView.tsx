import { FC, useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import dayjs, { Dayjs } from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeRecordSummaryView from '@/components/home/HomeRecordSummaryView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
import Home from '@/model/home/Home';
import { selectTripPlan } from '@/model/home/HomeTripPlan';
import app from '@/model/app/App';

interface Props {
  home: Home;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

/**
 * 헤더 날짜의 요일. dayjs 한국어 로케일을 등록하지 않은 저장소라 `ddd`/`dddd`는 영문으로
 * 나오고, 로케일을 전역에 걸면 앱의 다른 날짜 표기까지 함께 바뀐다 — 날씨·여행지 화면과
 * 같은 방식으로 배열을 직접 매핑한다.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// `8월 11일 화요일` — 영문 요일과 한글 날짜를 섞지 않는다.
const formatHeaderDate = (date: Dayjs): string =>
  `${date.format('M월 D일')} ${WEEKDAYS[date.day()]}요일`;

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
  scrollView: {
    flex: 1,
    marginTop: 18,
  },
  scrollContent: {
    flexGrow: 1,
  },
  signedOut: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default observer(HomeView);
