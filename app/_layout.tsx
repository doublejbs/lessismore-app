import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import app from '@/model/app/App';
import { useEffect } from 'react';
import SplashLoadingView from '@/components/ui/SplashLoadingView';
import { View, Text, Platform, Image } from 'react-native';
import { observer } from 'mobx-react-lite';

// 네이티브 스플래시를 폰트 로드 후 직접 내려, 초기화(Firebase) 동안 React 스플래시
// (SplashLoadingView — 하단 team magma 로고)가 보이게 한다. 자동 숨김을 막아둔다.
SplashScreen.preventAutoHideAsync();

// 커스텀 라이트 테마 - 텍스트 색상을 검은색으로 설정
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    text: '#000000', // 검은색으로 변경
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

    // 알림 탭 시 페이로드의 route로 이동한다. 콜드스타트 응답은 매니저가 버퍼링해 전달한다. (웹은 no-op)
    const unsubscribe = app.getNotificationManager()?.addResponseRouteListener(route => {
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
            name='not-login-search'
            options={{
              headerShown: false,
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
              contentStyle: { backgroundColor: '#FFFFFF' },
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
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          />
          <Stack.Screen
            name='camp-site'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              // 60%로 떠서 위로 끌면 최대까지 확장. 이 비율은 CampSiteDetailWrapper의
              // SHEET_DETENTS와 반드시 같아야 한다 — 래퍼가 콘텐츠 높이를 여기에 맞춘다
              // (formSheet 안은 React 레이아웃 높이가 무제한이라 명시하지 않으면 스크롤이 죽는다).
              sheetAllowedDetents: [0.6, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              // 딤 없음 — 시트가 떠 있어도 뒤 지도를 계속 조작할 수 있다(구글맵 동작).
              sheetLargestUndimmedDetentIndex: 'last',
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          />
          <Stack.Screen
            name='bag-copy-source'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          />
          <Stack.Screen
            name='bag-new'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: Platform.OS === 'android' ? [0.76] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          />
          <Stack.Screen
            name='bag-copy'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: Platform.OS === 'android' ? [0.76] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: '#FFFFFF' },
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
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          />
          <Stack.Screen
            name='bag-info-edit'
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: Platform.OS === 'android' ? [0.76] : 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
              contentStyle: { backgroundColor: '#FFFFFF' },
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
              contentStyle: { backgroundColor: '#FFFFFF' },
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
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          />
          <Stack.Screen name='+not-found' />
        </Stack>
        <StatusBar style='auto' />
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
      fallbackComponent: ({
        progress,
        status,
      }: {
        progress: number;
        status: string;
      }) => (
        <View
          style={{
            flex: 1,
            padding: 20,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#151515',
          }}
        >
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={{ width: 200, height: 200 }}
            resizeMode='contain'
          />
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
            {status === 'UPDATING' ? '업데이트 중...' : '업데이트 확인 중...'}
          </Text>
          {progress > 0 ? (
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
              {Math.round(progress * 100)}%
            </Text>
          ) : null}
        </View>
      ),
    })(observer(RootLayout));
  }
};

export default createAppComponent();
