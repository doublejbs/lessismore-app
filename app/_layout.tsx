import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import app from '@/model/app/App';
import { useEffect } from 'react';
import SplashLoadingView from '@/components/ui/SplashLoadingView';
import { View, Text, Platform, Image } from 'react-native';
import { observer } from 'mobx-react-lite';
import '@/i18n';

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
    const {
      HotUpdater,
      getUpdateSource,
    } = require('@hot-updater/react-native');

    return HotUpdater.wrap({
      source: getUpdateSource(
        'https://hot-updater-7llz3bz5aq-du.a.run.app/api/check-update',
        {
          updateStrategy: 'appVersion', // or "fingerprint"
        }
      ),
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
