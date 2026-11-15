import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import type { HotUpdaterFallbackComponentProps } from '@hot-updater/react-native';

type Props = Pick<HotUpdaterFallbackComponentProps, 'status' | 'progress'>;

const HotUpdaterFallbackView = ({ status, progress }: Props) => {
  // fallback 중에는 RootLayout이 마운트되지 않아 네이티브 스플래시가 내려가지 않는다.
  // 업데이트 다운로드(UPDATING)일 때만 스플래시를 내려 진행 UI가 보이게 한다.
  // 확인 단계(CHECK_FOR_UPDATE)는 매 실행 깜빡임 방지를 위해 스플래시를 유지한다 (APP-2).
  useEffect(() => {
    if (status === 'UPDATING') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  return (
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
        source={require('../../assets/images/splash-icon.png')}
        style={{ width: 200, height: 200 }}
        resizeMode='contain'
      />
      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
        {status === 'UPDATING'
          ? '업데이트 중...' // l10n-ignore: L10n 초기화 전 HotUpdater 폴백 화면
          : '업데이트 확인 중...' // l10n-ignore: L10n 초기화 전 HotUpdater 폴백 화면
        }
      </Text>
      {progress > 0 ? (
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          {Math.round(progress * 100)}%
        </Text>
      ) : null}
    </View>
  );
};

export default HotUpdaterFallbackView;
