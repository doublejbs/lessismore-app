import { requireOptionalNativeModule } from 'expo';
import { TurboModuleRegistry } from 'react-native';

// AD-5: 광고 SDK를 **쓸 때 처음** 싣는다. 이 SDK는 import하는 순간 네이티브 모듈을 강제로 찾기
// (`TurboModuleRegistry.getEnforcing`) 때문에, 앱 시작 경로에서 정적으로 import하면 SDK가 없는
// 바이너리(이전 스토어 빌드에 OTA가 간 경우 등)에서 앱이 켜지자마자 죽는다. 못 실으면 광고만 없다.
// 웹은 `GoogleMobileAdsModule.web.ts`가 대신한다(AD-4).
//
// `require`를 try/catch로 감싸도 막지 못한다 — Metro의 `guardedLoadModule`이 모듈 평가 중 난 에러를
// 치명 에러로 먼저 보고한다. 그래서 require **전에** 네이티브 모듈이 있는지부터 본다.
export type GoogleMobileAds = typeof import('react-native-google-mobile-ads');

export type TrackingTransparency = typeof import('expo-tracking-transparency');

// 광고 SDK가 import 시점에 `getEnforcing`으로 찾는 네이티브 모듈 전부
// (`react-native-google-mobile-ads/src/specs/modules/*`). SDK를 올리면 이 목록도 다시 맞춘다.
const GOOGLE_MOBILE_ADS_NATIVE_MODULES = [
  'RNAppModule',
  'RNGoogleMobileAdsModule',
  'RNGoogleMobileAdsConsentModule',
  'RNGoogleMobileAdsNativeModule',
  'RNGoogleMobileAdsPoolModule',
  'RNGoogleMobileAdsInterstitialModule',
  'RNGoogleMobileAdsRewardedModule',
  'RNGoogleMobileAdsRewardedInterstitialModule',
  'RNGoogleMobileAdsAppOpenModule',
];

const TRACKING_TRANSPARENCY_NATIVE_MODULE = 'ExpoTrackingTransparency';

let googleMobileAds: GoogleMobileAds | null | undefined;
let trackingTransparency: TrackingTransparency | null | undefined;

// `TurboModuleRegistry.get`은 `getEnforcing`과 같은 경로로 찾되(신아키텍처 TurboModule, 레거시
// 브리지면 `NativeModules`까지) 없으면 던지지 않고 null을 준다.
const hasGoogleMobileAdsNativeModules = (): boolean => {
  return GOOGLE_MOBILE_ADS_NATIVE_MODULES.every(name => {
    return TurboModuleRegistry.get(name) !== null;
  });
};

export const loadGoogleMobileAds = (): GoogleMobileAds | null => {
  if (googleMobileAds !== undefined) {
    return googleMobileAds;
  }

  if (!hasGoogleMobileAdsNativeModules()) {
    googleMobileAds = null;

    return googleMobileAds;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleMobileAds = require('react-native-google-mobile-ads') as GoogleMobileAds;
  } catch {
    googleMobileAds = null;
  }

  return googleMobileAds;
};

export const loadTrackingTransparency = (): TrackingTransparency | null => {
  if (trackingTransparency !== undefined) {
    return trackingTransparency;
  }

  // 패키지는 import 시점에 `requireNativeModule`(없으면 던진다)을 부른다 — 먼저 있는지 본다.
  if (!requireOptionalNativeModule(TRACKING_TRANSPARENCY_NATIVE_MODULE)) {
    trackingTransparency = null;

    return trackingTransparency;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    trackingTransparency = require('expo-tracking-transparency') as TrackingTransparency;
  } catch {
    trackingTransparency = null;
  }

  return trackingTransparency;
};
