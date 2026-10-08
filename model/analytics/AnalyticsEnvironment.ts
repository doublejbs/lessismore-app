import { NativeModules } from 'react-native';
import Constants from 'expo-constants';

const PRODUCTION_CHANNEL = 'production';

// expo-dev-launcher의 레거시 네이티브 모듈. iOS는 debugOnly pod, Android는 src/debug에만 있어
// 릴리스 바이너리엔 없다. (새 모듈 `ExpoDevLauncher`는 Android 릴리스에도 빈 스텁이 있어 판정에 못 쓴다)
const hasDevLauncher = (): boolean => {
  try {
    return NativeModules.EXDevLauncher != null;
  } catch {
    return false;
  }
};

// AN-4: 개발·테스트 빌드면 GA 수집에서 제외한다. 채널을 못 읽으면(null) 프로덕션으로 본다 —
// 오판으로 프로덕션 수집이 끊기는 쪽이 더 나쁘다.
export const isAnalyticsExcludedBuild = (channel: string | null): boolean => {
  if (process.env.EXPO_PUBLIC_ANALYTICS_DEV_COLLECTION === '1') {
    return false;
  }

  if (__DEV__) {
    return true;
  }

  if (hasDevLauncher()) {
    return true;
  }

  if (Constants.executionEnvironment === 'storeClient') {
    return true;
  }

  return !!channel && channel !== PRODUCTION_CHANNEL;
};
