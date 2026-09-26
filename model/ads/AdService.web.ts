import { makeAutoObservable } from 'mobx';
import type { NativeAd } from 'react-native-google-mobile-ads';
import { AdConsentListener, AdServiceContract } from './AdServiceContract';

// AD-4: 웹에는 광고를 두지 않는다(AdMob은 앱 전용). 네이티브 `AdService.ts`와 모양만 같고
// 광고 SDK를 import하지 않는다 — Metro가 웹에서 이 파일을 고른다.
class AdService implements AdServiceContract {
  public static new(_onConsentResolved: AdConsentListener) {
    return new AdService();
  }

  private constructor() {
    makeAutoObservable(this);
  }

  public async prepare(): Promise<boolean> {
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
}

export default AdService;
