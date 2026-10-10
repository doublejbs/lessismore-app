import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import dayjs from 'dayjs';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import HomeUpcomingTripView from '@/components/home/HomeUpcomingTripView';
import HomeWarehousePreviewView from '@/components/home/HomeWarehousePreviewView';
import HomeSkeletonView from '@/components/home/HomeSkeletonView';
import HomeHeroBackgroundView from '@/components/home/HomeHeroBackgroundView';
import HomeMountainBandView from '@/components/home/HomeMountainBandView';
import HomeRecommendedSpotsView from '@/components/home/HomeRecommendedSpotsView';
import HomeTripRecordsSectionView from '@/components/home/HomeTripRecordsSectionView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import Home from '@/model/home/Home';
import app from '@/model/app/App';
import { selectTripPlan } from '@/model/home/HomeTripPlan';
import ConsumableCarouselSectionView from '@/components/consumable/ConsumableCarouselSectionView';
import ConsumableAnalyticsSource from '@/model/consumable/ConsumableAnalyticsSource';
import ConsumableSurface from '@/model/consumable/ConsumableSurface';

interface Props {
  home: Home;
}

// iOS는 콘텐츠가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const FIRST_TRIP_CTA_HEIGHT = 52;
// 비로그인 히어로 아래 산 일러스트 띠 높이(HM-8 2026-10-08 — 글자 위가 아니라 버튼 묶음 아래에 둔다).
const SIGNED_OUT_BAND_HEIGHT = 160;
// 산 띠와 첫 섹션 사이(HM-8 비로그인 — 그림에 섹션 제목이 붙어 보이지 않게).
const HERO_SECTION_GAP = 24;

const HomeView: FC<Props> = ({ home }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLoading = home.isLoading();
  const isLoggedIn = home.isLoggedIn();
  /**
   * D-day 기준 날짜. 앱을 켜 둔 채 자정을 넘기면 `D-1`이 `오늘 출발`이 돼야 하므로
   * 포커스마다 새로 잡는다(HM-6). 상태로 들고 있어야 다시 렌더된다.
   */
  const [today, setToday] = useState(() => dayjs());
  const l10n = app.getL10n();

  const handleLogin = () => {
    app.getLogInAlertManager()?.show();
  };

  // 비로그인 주 액션(HM-8, 2026-10-08) — 첫 여행 가이드를 로그인 전에 연다(Onboarding OB-11).
  const handleStartFirstTrip = () => {
    app.getAnalyticsManager()?.logClick('home_first_trip');

    if (!app.getOnboardingTripManager()?.presentOnDemand()) {
      return;
    }

    // 가이드 끝(로그인 뒤 이어 만들기)이 첫 알림 권한 질문이다 — 시작 시 요청은 건너뛴다(OB-8).
    app.getNotificationManager()?.skipLaunchPermission();
    router.push('/onboarding-trip');
  };

  const handleOpenProfile = () => {
    router.push('/info');
  };

  // 추천 박지 아래가 마지막 콘텐츠 섹션(챙겨갈 소모품, CP-5 / HM-16)이다 — 비로그인 홈에도 같다.
  // 로딩 중 자리를 잡지 않는다: 0개(조회 전·실패 포함)면 섹션이 아예 그려지지 않는다.
  const renderRecommendations = () => {
    return (
      <>
        <HomeRecommendedSpotsView recommendations={home.getRecommendedSpots()} />
        {/* 최근 여행 기록(HM-17) — 추천 박지 바로 아래. 0건이면 그리지 않는다. */}
        <HomeTripRecordsSectionView
          posts={home.getTripRecords()}
          unrecordedTrip={home.getUnrecordedTrip()}
        />
        <ConsumableCarouselSectionView
          title={app.getL10n().t('consumable.homeTitle')}
          products={
            app.getConsumableStore()?.getForSurface(ConsumableSurface.Home) ??
            []
          }
          source={ConsumableAnalyticsSource.Home}
        />
      </>
    );
  };

  // 플로팅 탭바 아래로 콘텐츠가 흐르므로 시안대로 130을 비운다(ACG).
  // 마지막 섹션(소모품 고지)이 탭바에 가리지 않게 로그인 여부와 무관하게 둔다.
  const renderBottomSpacer = () => {
    return (
      <View
        style={{
          height: Platform.select({
            ios: insets.bottom + AcgLayout.scrollBottom,
            default: AcgLayout.scrollBottom,
          }),
        }}
      />
    );
  };

  useFocusEffect(
    useCallback(() => {
      setToday(dayjs());
      home.load();
    }, [home])
  );

  // 소모품은 세션당 1회 조회다(CP-1). 홈 로딩과 독립이라 홈 렌더를 막지 않는다.
  useEffect(() => {
    app.getConsumableStore()?.load();
  }, []);

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
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 히어로(2026-10-08, HM-8): 한 줄 소개 + 부제 + 라임 `첫 여행 만들기` + 로그인 링크를 모두 흰 지면에
              두고, 산 일러스트는 그 아래 띠로만 둔다 — 라임 산 위의 글자는 읽기 어려웠다(디자인 리뷰). */}
          <View style={styles.signedOutHero}>
            <PretendardText
              weight='semibold'
              style={styles.heroTitle}
              accessibilityRole='header'
            >
              {l10n.t('home.signedOut.title')}
            </PretendardText>
            <PretendardText style={styles.heroSubtitle}>
              {l10n.t('home.signedOut.subtitle')}
            </PretendardText>
            <TouchableOpacity
              style={styles.firstTripCta}
              onPress={handleStartFirstTrip}
              activeOpacity={0.85}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('home.signedOut.firstTrip')}
            >
              <PretendardText weight='semibold' style={styles.firstTripCtaText}>
                {l10n.t('home.signedOut.firstTrip')}
              </PretendardText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginLink}
              onPress={handleLogin}
              activeOpacity={0.7}
              accessibilityRole='link'
              accessibilityLabel={l10n.t('home.signedOut.loginLink')}
            >
              <PretendardText weight='medium' style={styles.loginLinkText}>
                {l10n.t('home.signedOut.loginLink')}
              </PretendardText>
            </TouchableOpacity>
          </View>
          <View style={styles.signedOutBand}>
            {/* 홈 스크롤은 좌우 패딩 안쪽이라 띠도 콘텐츠 폭이다(밖으로 넓히면 잘린다). */}
            <HomeMountainBandView height={SIGNED_OUT_BAND_HEIGHT} />
          </View>
          {renderRecommendations()}
          {renderBottomSpacer()}
        </ScrollView>
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
        {renderRecommendations()}
        {renderBottomSpacer()}
      </ScrollView>
    );
  };

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={AcgLayout.screenPadding}
      // 비로그인은 배경 히어로를 깔지 않는다 — 글자가 흰 지면에 놓이고 산 그림은 흐름 안의 띠다(HM-8).
      background={isLoggedIn ? <HomeHeroBackgroundView /> : undefined}
    >
      {/* 한글이라 콘덴스드(Archivo Narrow) 대신 Pretendard를 쓴다 — 그 서체에는
          한글 글리프가 없어 글자가 깨진다. */}
      <View style={styles.header}>
        <PretendardText weight='semibold' style={styles.headerText}>
          {app.getL10n().t('home.title')}
        </PretendardText>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleOpenProfile}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={app.getL10n().t('home.profileButton')}
        >
          <Ionicons
            name='person-circle-outline'
            size={28}
            color={Acg.ink}
          />
        </TouchableOpacity>
      </View>
      {render()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  profileButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  signedOutHero: {
    paddingTop: 8,
  },
  signedOutBand: {
    marginTop: 4,
    marginBottom: HERO_SECTION_GAP,
  },
  heroTitle: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  // 흰 지면 위라 기본 회색(AA 4.5)이면 충분하다 — 번짐(textShadow)도 필요 없다.
  heroSubtitle: {
    ...AcgType.sectionSubtitle,
    color: Acg.textMuted,
    marginTop: 6,
  },
  // 이 화면의 라임은 이 버튼 하나다(HM-8). 알약 = 높이의 절반, Dynamic Type 대응 최소 높이.
  firstTripCta: {
    minHeight: FIRST_TRIP_CTA_HEIGHT,
    borderRadius: FIRST_TRIP_CTA_HEIGHT / 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.lime,
  },
  firstTripCtaText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  loginLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginLinkText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
});

export default observer(HomeView);
