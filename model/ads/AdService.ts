import { makeAutoObservable, runInAction } from 'mobx';
import { Platform } from 'react-native';
import type { AdsConsentInfo, NativeAd } from 'react-native-google-mobile-ads';
import AdConsentStatus from './AdConsentStatus';
import AdPlacement from './AdPlacement';
import { AdConsentListener, AdServiceContract } from './AdServiceContract';
import { getAdUnitId, hasAnyAdUnit } from './AdUnitIds';
import {
  loadGoogleMobileAds,
  GoogleMobileAds,
  loadTrackingTransparency,
} from './GoogleMobileAdsModule';

// AD-3·AD-5: 네이티브 광고 서비스. 웹은 `AdService.web.ts`가 대신한다(Metro 플랫폼 확장자).
//
// 동의 흐름은 **앱 시작이 아니라 광고가 처음 나올 피드에 처음 들어갈 때** `prepare()`로 한 번 흐른다.
// 순서: UMP 동의 정보 갱신 → 필요하면 UMP 폼 → iOS ATT → `canRequestAds`면 SDK 초기화.
// 어느 단계가 실패해도 목록은 광고 없이 보인다 — 광고는 언제나 없어도 되는 요소다.
class AdService implements AdServiceContract {
  public static new(onConsentResolved: AdConsentListener) {
    return new AdService(onConsentResolved);
  }

  private preparing: Promise<boolean> | null = null;
  private canRequestAds = false;
  private initialized = false;
  private privacyOptionsRequired = false;

  private constructor(private readonly onConsentResolved: AdConsentListener) {
    makeAutoObservable<
      AdService,
      'preparing' | 'initialized' | 'onConsentResolved'
    >(this, {
      preparing: false,
      initialized: false,
      onConsentResolved: false,
    });
  }

  public prepare(): Promise<boolean> {
    if (!this.preparing) {
      this.preparing = this.runConsentFlow();
    }

    return this.preparing;
  }

  public async loadNativeAd(placement: AdPlacement): Promise<NativeAd | null> {
    const sdk = loadGoogleMobileAds();
    const adUnitId = getAdUnitId(placement);

    if (!sdk || !adUnitId || !this.canRequestAds) {
      return null;
    }

    try {
      return await sdk.NativeAd.createForAdRequest(adUnitId, {
        aspectRatio: sdk.NativeMediaAspectRatio.LANDSCAPE,
      });
    } catch {
      // 채울 광고 없음·네트워크 오류 — 자리를 접는다(AD-1).
      return null;
    }
  }

  public isPrivacyOptionsRequired() {
    return this.privacyOptionsRequired;
  }

  // AD-3: 설정 화면에 들어올 때 동의 정보를 갱신해 재진입 필요 여부를 읽는다. 폼은 띄우지 않는다 —
  // 피드에 아직 들어가지 않은 세션에서도 입구가 맞게 보이게 한다.
  public async refreshPrivacyOptions() {
    const sdk = loadGoogleMobileAds();

    if (!sdk || !hasAnyAdUnit()) {
      return;
    }

    try {
      const info = await sdk.AdsConsent.requestInfoUpdate();

      this.applyConsentInfo(info);
    } catch {
      // 갱신하지 못하면 입구를 바꾸지 않는다.
    }
  }

  public async showPrivacyOptions() {
    const sdk = loadGoogleMobileAds();

    if (!sdk) {
      return;
    }

    try {
      const info = await sdk.AdsConsent.showPrivacyOptionsForm();

      this.applyConsentInfo(info);

      // 폼에서 동의를 거두거나 새로 주면 이후 요청이 그 결과를 따른다. SDK를 아직 초기화하지 않았으면
      // (피드에 들어가기 전) 요청 가능 여부는 피드의 동의 흐름(`prepare`)이 정한다.
      if (this.initialized) {
        runInAction(() => {
          this.canRequestAds = info.canRequestAds;
        });
      }
    } catch {
      // 폼을 띄우지 못해도 설정 화면은 그대로 둔다.
    }
  }

  private async runConsentFlow(): Promise<boolean> {
    const sdk = loadGoogleMobileAds();

    if (!sdk || !hasAnyAdUnit()) {
      return false;
    }

    const status = await this.resolveConsent(sdk);

    this.onConsentResolved(status);

    return status === AdConsentStatus.Granted ||
      status === AdConsentStatus.TrackingDenied;
  }

  private async resolveConsent(sdk: GoogleMobileAds): Promise<AdConsentStatus> {
    try {
      const info = await this.gatherConsentInfo(sdk);

      this.applyConsentInfo(info);

      if (!info.canRequestAds) {
        return AdConsentStatus.Blocked;
      }

      const isTrackingAllowed = await this.requestTracking();

      await sdk.default().initialize();

      this.initialized = true;

      runInAction(() => {
        this.canRequestAds = true;
      });

      return isTrackingAllowed
        ? AdConsentStatus.Granted
        : AdConsentStatus.TrackingDenied;
    } catch {
      return AdConsentStatus.Error;
    }
  }

  // UMP 갱신이 실패해도(오프라인 등) 지난 세션의 동의로 요청할 수 있으면 요청한다(구글 권장).
  private async gatherConsentInfo(sdk: GoogleMobileAds): Promise<AdsConsentInfo> {
    try {
      return await sdk.AdsConsent.gatherConsent();
    } catch {
      return sdk.AdsConsent.getConsentInfo();
    }
  }

  // AD-3: UMP 다음에 iOS ATT를 한 번 묻는다. 이미 답했으면 창 없이 기존 값이 돌아온다.
  // AdMob 콘솔의 IDFA 설명 메시지가 켜져 있으면 UMP가 먼저 ATT를 띄우고, 여기서는 결과만 읽는다.
  private async requestTracking(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return true;
    }

    const tracking = loadTrackingTransparency();

    if (!tracking) {
      return false;
    }

    try {
      const { status } = await tracking.requestTrackingPermissionsAsync();

      return status === tracking.PermissionStatus.GRANTED;
    } catch {
      return false;
    }
  }

  private applyConsentInfo(info: AdsConsentInfo) {
    const sdk = loadGoogleMobileAds();

    this.privacyOptionsRequired =
      sdk !== null &&
      info.privacyOptionsRequirementStatus ===
        sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  }
}

export default AdService;
