import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import Home from '@/model/home/Home';
import app from '@/model/app/App';
import { selectTripPlan } from '@/model/home/HomeTripPlan';

interface Props {
  home: Home;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const LOGIN_CTA_HEIGHT = 48;

const HomeView: FC<Props> = ({ home }) => {
  const insets = useSafeAreaInsets();
  const isLoading = home.isLoading();
  const isLoggedIn = home.isLoggedIn();
  /**
   * D-day 기준 날짜. 앱을 켜 둔 채 자정을 넘기면 `D-1`이 `오늘 출발`이 돼야 하므로
   * 포커스마다 새로 잡는다(HM-6). 상태로 들고 있어야 다시 렌더된다.
   */
  const [today, setToday] = useState(() => dayjs());

  const handleLogin = () => {
    app.getLogInAlertManager()?.show();
  };

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
      // 문구 없이 버튼만 둔다(2026-08-05 사용자 결정) — 비로그인 홈에서 할 일은 하나뿐이라
      // 설명이 없어도 통하고, 문구를 붙이면 그게 화면의 앵커가 된다.
      return (
        <View style={styles.signedOut}>
          <TouchableOpacity
            style={styles.loginCta}
            onPress={handleLogin}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='로그인'
          >
            <PretendardText weight='semibold' style={styles.loginCtaText}>
              로그인
            </PretendardText>
          </TouchableOpacity>
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
      paddingHorizontal={AcgLayout.screenPadding}
      /**
       * 지면은 순백이다(2026-08-11 사용자 결정 — 지형 그래픽을 되살렸다가 다시 걷었다).
       * 앱의 모든 탭이 같은 지면 위에 놓이고, 그 위 면은 연회색(`controlFill`)이다.
       * 두 세대가 공유하는 규칙은 값이 아니라 **"면은 지면보다 밝거나 어둡게 한 단 갈리고,
       * 모서리 12, 그림자 없음"** 이다.
       */
      background={<View style={styles.ground} />}
    >
      {/* 한글이라 콘덴스드(Archivo Narrow) 대신 Pretendard를 쓴다 — 그 서체에는
          한글 글리프가 없어 글자가 깨진다. */}
      <View style={styles.header}>
        <PretendardText weight='semibold' style={styles.headerText}>
          홈
        </PretendardText>
      </View>
      {render()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  /**
   * 화면 제목(2026-08-11). 44 → 화면 제목 단으로 내렸다.
   *
   * 44는 이 화면에서 가장 큰 활자였는데, 제목은 **읽고 넘기는 이름표**라 앵커가 될 값이 아니다.
   * 화면의 앵커는 남은 일수와 무게처럼 항목마다 달라지는 숫자여야 한다.
   * 크기·줄간·자간은 전부 `AcgType.screenTitle`이 정한다(화면에서 다시 정하지 않는다).
   */
  headerText: {
    ...AcgType.screenTitle,
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
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  loginCta: {
    minHeight: LOGIN_CTA_HEIGHT,
    borderRadius: LOGIN_CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.ink,
  },
  loginCtaText: {
    ...AcgType.control,
    color: Acg.paper,
  },
});

export default observer(HomeView);
