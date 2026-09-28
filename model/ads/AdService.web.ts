import { makeAutoObservable } from 'mobx';
import type { NativeAd } from 'react-native-google-mobile-ads';
import type { SubscriptionGateContract } from '@/model/subscription/SubscriptionGateContract';
import { AdConsentListener, AdServiceContract } from './AdServiceContract';

// AD-4: 웹에는 광고를 두지 않는다(AdMob은 앱 전용). 네이티브 `AdService.ts`와 모양만 같고
// 광고 SDK를 import하지 않는다 — Metro가 웹에서 이 파일을 고른다.
class AdService implements AdServiceContract {
  public static new(
    _onConsentResolved: AdConsentListener,
    _subscription: SubscriptionGateContract
  ) {
    return new AdService();
  }

  private constructor() {
    makeAutoObservable(this);
  }

  public async prepare(): Promise<boolean> {
    return false;
  }

  public async prepareIfConsentedBefore(): Promise<boolean> {
    return false;
  }

  public async loadNativeAd(): Promise<NativeAd | null> {
    return null;
  }

  public isPrivacyOptionsRequired() {
    return false;
  }

  public async refreshPrivacyOptions() {}

  public async showPrivacyOptions() {}

  // AD-3 2: 추적 안내 시트는 iOS 전용이다 — 웹에서는 뜨지 않는다.
  public isTrackingPromptVisible() {
    return false;
  }

  public isConsentFlowActive() {
    return false;
  }

  public markTrackingPromptShown() {}

  public acceptTrackingPrompt() {}

  public completeTrackingPrompt() {}

  public skipTrackingPrompt() {}
}

export default AdService;
