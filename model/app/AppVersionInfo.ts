import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

export interface AppVersionInfo {
  version: string;
  build: string | null;
  channel: string | null;
  bundleId: string | null;
}

// 정보 탭 푸터용 상세 버전(AU-4). 네이티브 바이너리 버전·빌드 번호는 expo-application에서,
// OTA 채널·현재 번들은 Hot Updater 런타임에서 읽는다. 웹은 OTA가 없어 채널·번들이 null이다.
export const getAppVersionInfo = (): AppVersionInfo => {
  const version =
    Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';
  const build = Application.nativeBuildVersion || null;

  if (Platform.OS === 'web') {
    return { version, build, channel: null, bundleId: null };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HotUpdater } = require('@hot-updater/react-native');
    const channel: string | null = HotUpdater.getChannel?.() ?? null;
    const bundleId: string | null = HotUpdater.getBundleId?.() ?? null;

    return { version, build, channel, bundleId };
  } catch {
    return { version, build, channel: null, bundleId: null };
  }
};
