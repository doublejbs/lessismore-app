import { Platform } from 'react-native';
import { getAppVersionInfo } from '@/model/app/AppVersionInfo';
import AdPlacement from './AdPlacement';

/**
 * AD-4: 광고 단위 ID를 모으는 한 곳.
 *
 * AdMob **앱 ID**는 네이티브 설정이라 여기가 아니라 `app.json`의 `react-native-google-mobile-ads`
 * 플러그인(`iosAppId`·`androidAppId`)에 있다 — 지금은 구글 테스트 앱 ID이고, 실제 ID로 바꿀 때
 * 아래 `PRODUCTION_AD_UNIT_IDS`와 함께 바꾼다.
 */

// 구글 공식 테스트 네이티브 광고 단위. 실제 ID로 개발 중 광고를 누르면 계정이 정지될 수 있다.
const TEST_NATIVE_AD_UNIT_IDS = {
  ios: 'ca-app-pub-3940256099942544/3986624511',
  android: 'ca-app-pub-3940256099942544/2247696110',
};

// 실제 광고 단위(자리 × 플랫폼 = 4개). 비어 있으면 프로덕션에서 광고를 요청하지 않는다.
const PRODUCTION_AD_UNIT_IDS: Record<AdPlacement, { ios: string; android: string }> = {
  [AdPlacement.Feed]: { ios: '', android: '' },
  [AdPlacement.Community]: { ios: '', android: '' },
};

const PRODUCTION_CHANNEL = 'production';

// 실제·테스트 ID를 가르는 한 곳. 개발 빌드(`__DEV__`)이거나 OTA 채널이 production이 아니면
// (프리뷰 채널 검증 빌드 등) 테스트 광고를 쓴다.
export const isAdTestEnvironment = (): boolean => {
  if (__DEV__) {
    return true;
  }

  return getAppVersionInfo().channel !== PRODUCTION_CHANNEL;
};

export const getAdUnitId = (placement: AdPlacement): string | null => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  if (isAdTestEnvironment()) {
    return TEST_NATIVE_AD_UNIT_IDS[Platform.OS];
  }

  const adUnitId = PRODUCTION_AD_UNIT_IDS[placement][Platform.OS];

  return adUnitId || null;
};

// 요청할 광고 단위가 하나도 없으면 동의(UMP·ATT)도 묻지 않는다 — 광고가 나오지 않을 앱에서
// 추적 권한을 물을 이유가 없다.
export const hasAnyAdUnit = (): boolean => {
  return Object.values(AdPlacement).some(placement => {
    return getAdUnitId(placement) !== null;
  });
};
