import type { NativeAd } from 'react-native-google-mobile-ads';
import AdConsentStatus from './AdConsentStatus';
import AdPlacement from './AdPlacement';

export type AdConsentListener = (status: AdConsentStatus) => void;

// 광고 서비스의 모양. 네이티브(`AdService.ts`)와 웹(`AdService.web.ts`)이 같은 모양을 갖는다 —
// 웹 번들은 광고 SDK를 싣지 않는다(AD-4).
export interface AdServiceContract {
  // AD-3: 동의 흐름(UMP → 추적 안내 시트 → ATT → SDK 초기화)을 앱 수명 동안 한 번만 흘린다.
  // 광고를 요청할 수 있으면 true.
  prepare(): Promise<boolean>;
  // AD-3: 동의 흐름을 시작하지 않는 자리(홈)용. 이번 실행이나 이전 실행에서 동의 흐름을 마친 적이
  // 있을 때만 창(UMP 폼·안내 시트·ATT) 없이 SDK를 준비한다. 광고를 요청할 수 있으면 true.
  prepareIfConsentedBefore(): Promise<boolean>;
  // 자리의 네이티브 광고 하나를 받는다. 받지 못하면(채울 광고 없음·오류·동의 없음) null.
  loadNativeAd(placement: AdPlacement): Promise<NativeAd | null>;
  // AD-3: 설정 화면의 개인정보 옵션 입구를 보일지(UMP가 재진입을 요구할 때만).
  isPrivacyOptionsRequired(): boolean;
  refreshPrivacyOptions(): Promise<void>;
  showPrivacyOptions(): Promise<void>;
  // AD-3 2: 추적 안내 시트를 띄울지. 루트의 시트 호스트가 관찰한다. 시트는 닫을 수 없다 —
  // `계속`이 유일한 출구이고 항상 ATT로 이어진다.
  isTrackingPromptVisible(): boolean;
  // 시트 호스트의 Modal이 실제로 화면에 떴다(`onShow`). 정해진 시간 안에 오지 않으면 시트 없이
  // 바로 ATT를 요청한다.
  markTrackingPromptShown(): void;
  // 안내 시트의 `계속` — 시트를 내린다. ATT는 시트가 완전히 내려간 뒤(`completeTrackingPrompt`) 띄운다.
  acceptTrackingPrompt(): void;
  // 시트가 완전히 내려갔다(iOS Modal `onDismiss`) — 이어서 ATT 시스템 팝업을 띄운다.
  completeTrackingPrompt(): void;
  // 시트를 띄울 수 없다(강제 업데이트 게이트가 덮음·호스트 언마운트) — 시트 없이 바로 ATT를 요청한다.
  skipTrackingPrompt(): void;
}
