import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import app from '@/model/app/App';
import { useEffect } from 'react';
import SplashLoadingView, {
  SPLASH_BACKGROUND,
} from '@/components/ui/SplashLoadingView';
import { View, Platform, Image, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import ForceUpdateGateView from '@/components/app-update/ForceUpdateGateView';
import AnnouncementSheetView from '@/components/announcement/AnnouncementSheetView';
import FeaturePopupSheetView from '@/components/feature-popup/FeaturePopupSheetView';
import { Liquid, LiquidRadius } from '@/constants/DesignTokens';

// 네이티브 스플래시를 폰트 로드 후 직접 내려, 초기화(Firebase) 동안 React 스플래시
// (SplashLoadingView — 하단 team magma 로고)가 보이게 한다. 자동 숨김을 막아둔다.
SplashScreen.preventAutoHideAsync();

/**
 * 네비게이션 테마의 기본 글자색. 앱 텍스트는 전부 `PretendardText`가 색을 정하므로 이 값이
 * 실제로 보이는 자리는 거의 없지만, 남는 한 곳도 잉크 스케일 위에 있어야 한다(순검정 금지).
 */
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    text: Liquid.ink,
  },
};

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.ttf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.ttf'),
    // 디스플레이·수치 서체(콘덴스드). 본문·UI는 그대로 Pretendard를 쓰고 **숫자·라틴**
    // (무게·D-day·기간·진행률·버전)에만 쓴다 — 한글 글리프가 없어 한글에 걸면 글자가 깨진다.
    // 통로는 `LiquidFont.condensed` 토큰이다(구세대 `AcgDisplayText`는 2026-08-11 삭제).
    ArchivoNarrow_700Bold: ArchivoNarrow_700Bold,
    // 필름 카드 캡션 손글씨(BS-3) — 라틴·숫자·한글을 이 폰트 하나로 렌더한다.
    // 미래나무는 Google Fonts 패키지가 아니라 번들한 로컬 TTF다(assets/fonts/LICENSE-Nanum.txt).
    NanumMiRaeNaMu: require('../assets/fonts/NanumMiRaeNaMu.ttf'),
    // 필름 카드 패킹리스트 템플릿(BS-8) — 라틴·한글을 같은 손으로 그린 고정폭이라 이 폰트
    // 하나로 종이 전체를 렌더한다. 네이버 D2Coding 1.3.2 서브셋, OFL 1.1
    // (assets/fonts/LICENSE-D2Coding.txt). 폰트 패밀리 문자열이 이 등록 키다.
    D2Coding: require('../assets/fonts/D2Coding-Regular.ttf'),
    D2CodingBold: require('../assets/fonts/D2Coding-Bold.ttf'),
  });
  const firebase = app.getFirebase();
  const isInitialized = app.isInitialized();
  const isLoggedIn = firebase.isLoggedIn();
  const hasAgreed = firebase.hasUserAgreedToTerms();

  // 폰트가 준비되면 네이티브 스플래시를 내려, 초기화 동안 React 스플래시(하단 magma)를 노출한다.
  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (isInitialized) {
      if (isLoggedIn) {
        if (hasAgreed) {
        } else {
          router.replace('/terms-agreement');
        }
      }
    } else {
      app.initialize();
    }
  }, [isLoggedIn, isInitialized, pathname, hasAgreed, router]);

  useEffect(() => {
    // 초기화 완료 전에는 매니저가 없을 수 있으므로 null 가드
    const analyticsManager = app.getAnalyticsManager();

    if (!analyticsManager) {
      return;
    }

    // useSegments는 동적 세그먼트를 [id] 패턴으로 반환해 문서 ID가 화면 이름에 노출되지 않는다.
    analyticsManager.logScreenView(segments.join('/') || 'index');
  }, [segments, isInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // 초기화 완료 후 알림 권한 요청·리스너 등록을 1회 수행한다. (웹은 no-op)
    void app.getNotificationManager()?.initialize();
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // 초기화 후 강제 업데이트 최소 버전을 1회 조회한다(APP-7). fail-open, 웹은 no-op.
    void app.getForceUpdateManager()?.check();
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // 알림 탭 시 페이로드의 route로 이동한다. 콜드스타트 응답은 매니저가 버퍼링해 전달한다. (웹은 no-op)
    const unsubscribe = app
      .getNotificationManager()
      ?.addResponseRouteListener(route => {
        router.push(route as never);
      });

    return () => {
      unsubscribe?.();
    };
  }, [isInitialized, router]);

  if (!loaded || !isInitialized) {
    // Async font loading only occurs in development.
    return <SplashLoadingView />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : CustomDefaultTheme}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen
            name='custom'
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name='search'
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name='bag-add-options'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='gear-add-options'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='camp-site'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              // 최소(peek) / 40%(기본) / 최대 — 위아래로 끌어 전환한다.
              // 최소가 0.2가 아니라 0.24인 이유는 CampSiteDetailView의 PEEK 주석 참고.
              sheetAllowedDetents: [0.24, 0.4, 1],
              sheetInitialDetentIndex: 1,
              sheetGrabberVisible: true,
              // 시트 상단 모서리 28 + 지면색 면 — 박지 상세는 Liquid Depth로 이식된 화면이라
              // 시트 크롬(네이티브가 그리는 모서리·면)도 그 값을 따른다.
              sheetCornerRadius: LiquidRadius.sheet,
              // 딤 없음 — 시트가 떠 있어도 뒤 지도를 계속 조작할 수 있다(구글맵 동작).
              sheetLargestUndimmedDetentIndex: 'last',
              // bottom: 0이 핵심이다. react-native-screens는 formSheet 콘텐츠 래퍼를
              // top/left/right만 건 absolute로 둔다(시트 높이 변경 시 깜빡임 방지) — 그러면
              // React 레이아웃 높이가 무제한이라 flex:1이 뷰포트를 못 잡고 ScrollView가
              // 콘텐츠 높이만큼 늘어나 스크롤이 죽는다. contentStyle은 그 스타일 뒤에
              // 병합되므로 여기서 bottom을 되돌리면 래퍼 높이 = 시트 높이가 되고,
              // detent를 끌어 바꿔도 네이티브가 알아서 따라온다.
              contentStyle: { backgroundColor: Liquid.canvas, bottom: 0 },
            }}
          />
          {/* 즐겨찾기 리스트 시트(CS-9) — 박지 상세 시트와 동일한 formSheet 얼개.
              기본 40%(sheetInitialDetentIndex: 1)로 뜨고, 위아래로 끌어 20%/100%로 조절한다.
              contentStyle bottom: 0의 이유는 위 camp-site 주석 참고. */}
          <Stack.Screen
            name='camp-site-favorites'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.2, 0.4, 1],
              sheetInitialDetentIndex: 1,
              sheetGrabberVisible: true,
              sheetCornerRadius: LiquidRadius.sheet,
              sheetLargestUndimmedDetentIndex: 'last',
              contentStyle: { backgroundColor: Liquid.canvas, bottom: 0 },
            }}
          />
          {/* 공용 여행지 선택기(DST-3) — 풀스크린 모달 라우트. RN Modal이 아니라 라우트라
              이 위로 박지 상세(/camp-site/{'{id}'})·즐겨찾기(/camp-site-favorites) formSheet가
              그대로 스택돼 지도 탭과 동일한 디텐트(기본 40% + 높이 조절)를 쓴다. */}
          <Stack.Screen
            name='bag-destination-picker'
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
            }}
          />
          {/* 원본 배낭 선택 시트(BAG-5) — 화면 높이 60%로 뜨고 위로 끌어 100%까지 키운다.
              목록이 시트 높이 안에서 스크롤되려면 contentStyle에 bottom: 0이 필요하다
              (이유는 위 camp-site 주석 참고). */}
          <Stack.Screen
            name='bag-copy-source'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.6, 1],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface, bottom: 0 },
            }}
          />
          <Stack.Screen
            name='bag-new'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents:
                Platform.OS === 'android' ? [0.76] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='bag-copy'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents:
                Platform.OS === 'android' ? [0.76] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='bag-share'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='bag-info-edit'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents:
                Platform.OS === 'android' ? [0.76] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='camp-review-write'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents:
                Platform.OS === 'android' ? [0.9] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          {/* LG-1: reply 중첩 레이아웃(Stack)을 삭제하고 루트 스택으로 호이스팅 —
              중첩 스택에선 reply/[id]·edit가 그 스택의 루트라 시스템 back이 안 나온다.
              리뷰 작성(input) formSheet 옵션만 기존 그대로 여기서 지정한다. */}
          <Stack.Screen
            name='reply/[id]/input/index'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents:
                Platform.OS === 'android' ? [0.9] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          <Stack.Screen
            name='sort-sheet'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: Liquid.surface },
            }}
          />
          {/* 공유 배낭 뷰어(CS-8). **일반 push로 두면 안 된다** — 박지 상세가 `formSheet`라
              그 위에서 push하면 시트 안에서 부모 스크린 컨트롤러를 못 찾아
              (`Failed to find parent screen controller`) 화면이 마운트되고 데이터도 다
              들어왔는데 레이아웃이 깨져 빈 화면 + 헤더 없음으로 보였다(2026-08-03).
              시트 위에 얹히는 자기 자신의 프레젠테이션을 주면 해결된다.
              공유 링크 콜드스타트(스택 없음)에서도 전체 화면이라 자연스럽다. */}
          <Stack.Screen
            name='shared-bag/[id]'
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen name='+not-found' />
        </Stack>
        <StatusBar style='auto' />
        {/* 인앱 공지 바텀 시트(AN-2) — 모달이라 모든 탭·화면 위에 뜬다. isInitialized 이후 렌더 지점.
            게이트보다 먼저 두지만, 시트는 needsUpdate면 스스로 뜨지 않아 게이트가 최상위를 유지한다. */}
        <AnnouncementSheetView />
        {/* 신기능 안내 팝업(FP-2) — 중앙 카드 모달이라 모든 탭·화면 위에 뜬다.
            공지 시트와 마찬가지로 needsUpdate면 스스로 뜨지 않아 게이트가 최상위를 유지한다.
            공지 시트는 이 팝업이 뜰 조건이면 스스로 숨는다(FP-6 우선순위). */}
        <FeaturePopupSheetView />
        {/* 강제 업데이트 게이트(APP-7) — 스플래시 이후 최상위에서 다른 모든 것 위에 렌더한다.
            로그인·약관·라우팅과 무관하게 needsUpdate면 전체 화면을 덮는다(absolute fill). */}
        <ForceUpdateGateView />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const createAppComponent = () => {
  if (Platform.OS === 'web') {
    return observer(RootLayout);
  } else {
    // 네이티브 환경에서만 HotUpdater import
    const { HotUpdater } = require('@hot-updater/react-native');

    return HotUpdater.wrap({
      baseURL: 'https://hot-updater-7llz3bz5aq-du.a.run.app/api/check-update',
      updateStrategy: 'appVersion', // or "fingerprint"
      requestHeaders: {
        // if you want to use the request headers, you can add them here
      },
      /**
       * OTA 확인·다운로드 동안의 폴백(APP-2). **Liquid 지면이 아니라 스플래시의 연장이다** —
       * 이 화면은 React 앱보다 먼저 뜨므로(폰트 로드 전, `SplashLoadingView`보다도 앞) 앱
       * 지면색으로 칠하면 스플래시에서 흰 화면으로 튄 뒤 다시 스플래시로 돌아온다.
       * 같은 이유로 글자는 `PretendardText`를 쓰되 **폰트가 아직 로드되지 않아** 시스템 서체로
       * 떨어진다 — 그러면 `weight` prop이 가리키는 fontFamily가 사라지므로 굵기는
       * `fallbackStyles.status`의 `fontWeight`가 든다(아래 주석 참고).
       */
      fallbackComponent: ({
        progress,
        status,
      }: {
        progress: number;
        status: string;
      }) => (
        <View style={fallbackStyles.container}>
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={fallbackStyles.icon}
            resizeMode='contain'
          />
          <PretendardText weight='bold' style={fallbackStyles.status}>
            {status === 'UPDATING' ? '업데이트 중...' : '업데이트 확인 중...'}
          </PretendardText>
          {progress > 0 ? (
            <PretendardText weight='bold' style={fallbackStyles.status}>
              {Math.round(progress * 100)}%
            </PretendardText>
          ) : null}
        </View>
      ),
    })(observer(RootLayout));
  }
};

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // 네이티브 스플래시와 같은 면(`SplashLoadingView`도 이 값이다) — 앱 지면 토큰이 아니다.
    backgroundColor: SPLASH_BACKGROUND,
  },
  icon: {
    width: 200,
    height: 200,
  },
  /**
   * `PretendardText weight='bold'`가 가리키는 `Pretendard-Bold`는 이 구간에 아직 없다
   * (폰트 로드 전에 뜨는 화면이다) — fontFamily가 해석되지 않아 시스템 서체로 떨어지고,
   * 그러면 굵기 지정이 함께 사라진다. `fontWeight`를 직접 걸어 시스템 서체의 bold를 쓴다.
   */
  status: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Liquid.surface,
  },
});

export default createAppComponent();
