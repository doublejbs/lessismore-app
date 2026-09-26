import type { NativeAd } from 'react-native-google-mobile-ads';
import AdConsentStatus from './AdConsentStatus';
import AdPlacement from './AdPlacement';

export type AdConsentListener = (status: AdConsentStatus) => void;

// 광고 서비스의 모양. 네이티브(`AdService.ts`)와 웹(`AdService.web.ts`)이 같은 모양을 갖는다 —
// 웹 번들은 광고 SDK를 싣지 않는다(AD-4).
export interface AdServiceContract {
  // AD-3: 동의 흐름(UMP → ATT → SDK 초기화)을 앱 수명 동안 한 번만 흘린다. 광고를 요청할 수 있으면 true.
  prepare(): Promise<boolean>;
  // 자리의 네이티브 광고 하나를 받는다. 받지 못하면(채울 광고 없음·오류·동의 없음) null.
  loadNativeAd(placement: AdPlacement): Promise<NativeAd | null>;
  // AD-3: 설정 화면의 개인정보 옵션 입구를 보일지(UMP가 재진입을 요구할 때만).
  isPrivacyOptionsRequired(): boolean;
  refreshPrivacyOptions(): Promise<void>;
  showPrivacyOptions(): Promise<void>;
}
