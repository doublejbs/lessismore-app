import { makeAutoObservable, runInAction } from 'mobx';
import { AppState, NativeEventSubscription, Platform } from 'react-native';
import type { AdsConsentInfo, NativeAd } from 'react-native-google-mobile-ads';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import { SubscriptionGateContract } from '@/model/subscription/SubscriptionGateContract';
import AdConsentStatus from './AdConsentStatus';
import AdPlacement from './AdPlacement';
import { AdConsentListener, AdServiceContract } from './AdServiceContract';
import { getAdUnitId, hasAnyAdUnit } from './AdUnitIds';
import {
  loadGoogleMobileAds,
  GoogleMobileAds,
  loadTrackingTransparency,
  TrackingTransparency,
} from './GoogleMobileAdsModule';

// AD-3: 동의 흐름을 한 번이라도 마쳤는지(기기에 기록). 홈처럼 동의 흐름을 시작하지 않는 자리가
// 이 값이 있을 때만 광고를 요청한다.
const CONSENT_FLOW_COMPLETED_STORAGE_KEY = 'ads.consentFlowCompleted';

// AD-3 2: 안내 시트를 띄우라고 한 뒤 이 안에 Modal이 뜨지 않으면(`onShow` 없음 — 다른 모달이 떠 있는 등)
// 시트 없이 바로 ATT를 요청한다. 동의 흐름이 멈춰 광고가 전부 막히면 안 된다.
const TRACKING_PROMPT_SHOW_TIMEOUT_MS = 1000;

// `계속` 뒤 시트가 완전히 내려갔다는 신호(iOS Modal `onDismiss`)가 이 안에 오지 않으면 그대로 넘어간다 —
// 신호를 놓쳐도 흐름이 멈추지 않게 하는 안전판이다(평소에는 신호가 먼저 온다).
const TRACKING_PROMPT_DISMISS_TIMEOUT_MS = 1500;

// ATT는 앱이 활성 상태일 때만 뜬다. 비활성이면 활성으로 돌아오기를 이만큼까지 기다린다 — 넘기면 이번에는
// 묻지 않는다(ATT가 미결정으로 남아 다음 실행에 다시 묻는다).
const APP_ACTIVE_TIMEOUT_MS = 30000;

const APP_STATE_ACTIVE = 'active';

// 앱이 활성 상태가 되면 true, 제한 시간을 넘기면 false.
const waitForActiveAppState = (timeoutMs: number) => {
  return new Promise<boolean>(resolve => {
    if (AppState.currentState === APP_STATE_ACTIVE) {
      resolve(true);

      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let subscription: NativeEventSubscription | null = null;

    const finish = (isActive: boolean) => {
      subscription?.remove();

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      resolve(isActive);
    };

    subscription = AppState.addEventListener('change', nextState => {
      if (nextState === APP_STATE_ACTIVE) {
        finish(true);
      }
    });

    timeoutId = setTimeout(() => {
      finish(false);
    }, timeoutMs);
  });
};

// AD-3·AD-5: 네이티브 광고 서비스. 웹은 `AdService.web.ts`가 대신한다(Metro 플랫폼 확장자).
//
// 동의 흐름은 **앱 시작이 아니라 광고가 처음 나올 자리에 처음 들어갈 때** `prepare()`로 한 번 흐른다.
// 순서: UMP 동의 정보 갱신 → 필요하면 UMP 폼 → (iOS, ATT 미결정이면) 추적 안내 시트 → iOS ATT
// → `canRequestAds`면 SDK 초기화. 홈은 동의 흐름을 시작하지 않고 `prepareIfConsentedBefore()`로
// 이전에 마친 동의만 이어 쓴다. 어느 단계가 실패해도 목록은 광고 없이 보인다 — 광고는 언제나 없어도 되는 요소다.
//
// SUB-4: 광고 제거 구독자에게는 동의 흐름을 시작하지 않고 광고도 요청하지 않는다. 구독 상태를 알기 전에는
// (앱 시작 직후) 짧게 기다린다 — 구독자에게 광고가 한 번 번쩍이지 않게.
class AdService implements AdServiceContract {
  public static new(
    onConsentResolved: AdConsentListener,
    subscription: SubscriptionGateContract
  ) {
    return new AdService(onConsentResolved, subscription);
  }

  private preparing: Promise<boolean> | null = null;
  private silentPreparing: Promise<boolean> | null = null;
  // SDK `initialize()`는 앱 수명 동안 한 번만 부른다 — 동의 흐름과 조용한 준비가 겹쳐도 같은 약속을 기다린다.
  private initializing: Promise<void> | null = null;
  private canRequestAds = false;
  private initialized = false;
  private privacyOptionsRequired = false;
  private trackingPromptVisible = false;
  // 동의 창(UMP 폼·추적 안내 시트·ATT·개인정보 옵션 폼)이 떠 있을 수 있는 동안 true. 다른 안내(SUB-9)가
  // 동의 창 위에 겹쳐 뜨지 않게 한다.
  private consentFlowActive = false;
  // 안내 시트가 끝나기를(`계속` 뒤 완전히 내려감, 또는 띄우지 못함) 기다리는 쪽. 어느 쪽이든 다음은 ATT다.
  private resolveTrackingPrompt: (() => void) | null = null;
  private trackingPromptShown = false;
  private trackingPromptTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private constructor(
    private readonly onConsentResolved: AdConsentListener,
    private readonly subscription: SubscriptionGateContract
  ) {
    makeAutoObservable<
      AdService,
      | 'preparing'
      | 'silentPreparing'
      | 'initializing'
      | 'initialized'
      | 'resolveTrackingPrompt'
      | 'trackingPromptShown'
      | 'trackingPromptTimeoutId'
      | 'onConsentResolved'
      | 'subscription'
    >(this, {
      preparing: false,
      silentPreparing: false,
      initializing: false,
      initialized: false,
      resolveTrackingPrompt: false,
      trackingPromptShown: false,
      trackingPromptTimeoutId: false,
      onConsentResolved: false,
      subscription: false,
    });
  }

  // 구독자는 동의 흐름을 태우지 않는다. 결과를 캐시하지 않으므로 구독이 끝나면 다음 자리에서 흐른다.
  public async prepare(): Promise<boolean> {
    if (!(await this.isAdAllowed())) {
      return false;
    }

    if (!this.preparing) {
      this.preparing = this.runConsentFlow();
    }

    return this.preparing;
  }

  // AD-3: 홈은 동의 흐름을 시작하지 않는다. 이번 실행에 동의 흐름이 이미 돌았으면 그 결과를 따르고,
  // 아니면 이전 실행에서 마친 기록이 있을 때만 창 없이 동의 정보를 갱신해 SDK를 준비한다.
  // 기록이 없으면 결과를 캐시하지 않는다 — 이번 실행 중에 다른 자리에서 동의를 마치면 다음 포커스에 붙는다.
  public async prepareIfConsentedBefore(): Promise<boolean> {
    if (!(await this.isAdAllowed())) {
      return false;
    }

    if (this.preparing) {
      return this.preparing;
    }

    if (this.silentPreparing) {
      return this.silentPreparing;
    }

    const hasCompletedBefore = await LocalStorageManager.get<boolean>(
      CONSENT_FLOW_COMPLETED_STORAGE_KEY
    );

    if (!hasCompletedBefore) {
      return false;
    }

    // 기록을 읽는 사이 동의 흐름이 시작됐을 수 있다.
    if (this.preparing) {
      return this.preparing;
    }

    if (!this.silentPreparing) {
      this.silentPreparing = this.runSilentPreparation();
    }

    return this.silentPreparing;
  }

  public isTrackingPromptVisible() {
    return this.trackingPromptVisible;
  }

  public isConsentFlowActive() {
    return this.consentFlowActive || this.trackingPromptVisible;
  }

  public markTrackingPromptShown() {
    if (!this.resolveTrackingPrompt) {
      return;
    }

    this.trackingPromptShown = true;
    this.clearTrackingPromptTimeout();
  }

  // `계속`: 시트를 내리고, 완전히 내려가면(`completeTrackingPrompt`) ATT로 넘어간다. 내려간 신호를
  // 놓쳐도 멈추지 않게 제한 시간을 둔다.
  public acceptTrackingPrompt() {
    if (!this.resolveTrackingPrompt || !this.trackingPromptVisible) {
      return;
    }

    this.trackingPromptVisible = false;
    this.startTrackingPromptTimeout(TRACKING_PROMPT_DISMISS_TIMEOUT_MS);
  }

  public completeTrackingPrompt() {
    // 아직 `계속`을 누르지 않았으면(시트가 떠 있어야 하는 중) 끝내지 않는다.
    if (this.trackingPromptVisible) {
      return;
    }

    this.settleTrackingPrompt();
  }

  public skipTrackingPrompt() {
    this.settleTrackingPrompt();
  }

  public async loadNativeAd(placement: AdPlacement): Promise<NativeAd | null> {
    const sdk = loadGoogleMobileAds();
    const adUnitId = getAdUnitId(placement);

    if (
      !sdk ||
      !adUnitId ||
      !this.canRequestAds ||
      this.subscription.isSubscribed()
    ) {
      return null;
    }

    try {
      const ad = await sdk.NativeAd.createForAdRequest(adUnitId, {
        aspectRatio: sdk.NativeMediaAspectRatio.LANDSCAPE,
      });

      // 받는 사이 구독했으면 붙이지 않고 해제한다(SUB-4).
      if (this.subscription.isSubscribed()) {
        ad.destroy();

        return null;
      }

      return ad;
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

    this.setConsentFlowActive(true);

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
    } finally {
      this.setConsentFlowActive(false);
    }
  }

  // SUB-4: 구독 상태를 알 때까지(짧게) 기다린 뒤, 구독 중이 아니면 광고를 둘 수 있다.
  private async isAdAllowed(): Promise<boolean> {
    await this.subscription.waitUntilResolved();

    return !this.subscription.isSubscribed();
  }

  private async runConsentFlow(): Promise<boolean> {
    const sdk = loadGoogleMobileAds();

    if (!sdk || !hasAnyAdUnit()) {
      return false;
    }

    // 기다리는 동안에도 동의 흐름으로 친다 — 곧 동의 창이 뜰 수 있다(SUB-9 안내 시트가 끼어들지 않게).
    this.setConsentFlowActive(true);

    let status: AdConsentStatus;

    try {
      // 홈의 조용한 준비가 진행 중이면 먼저 끝나기를 기다린다 — UMP 갱신·SDK 초기화를 겹쳐 돌리지 않는다.
      if (this.silentPreparing) {
        await this.silentPreparing;
      }

      status = await this.resolveConsent(sdk);
    } finally {
      this.setConsentFlowActive(false);
    }

    this.onConsentResolved(status);

    // 동의 흐름을 끝까지 탔으면(광고 가능·불가 모두) 기록해, 이후 실행의 홈이 이어 쓴다.
    // 오류로 끊긴 흐름은 기록하지 않는다 — 다음 실행에 다른 자리에서 다시 흐른다.
    if (status !== AdConsentStatus.Error) {
      await LocalStorageManager.set(CONSENT_FLOW_COMPLETED_STORAGE_KEY, true);
    }

    return (
      status !== AdConsentStatus.Blocked && status !== AdConsentStatus.Error
    );
  }

  // 창을 띄우지 않는 준비. UMP는 폼 없이 갱신만 하고(실패하면 지난 동의), ATT는 묻지 않는다 —
  // SDK가 광고를 요청할 때 그 시점의 추적 권한을 읽는다.
  private async runSilentPreparation(): Promise<boolean> {
    const sdk = loadGoogleMobileAds();

    if (!sdk || !hasAnyAdUnit()) {
      return false;
    }

    try {
      const info = await this.refreshConsentInfo(sdk);

      this.applyConsentInfo(info);

      if (!info.canRequestAds) {
        this.setCanRequestAds(false);

        return false;
      }

      await this.initializeSdk(sdk);

      return true;
    } catch {
      return false;
    }
  }

  private async refreshConsentInfo(
    sdk: GoogleMobileAds
  ): Promise<AdsConsentInfo> {
    try {
      return await sdk.AdsConsent.requestInfoUpdate();
    } catch {
      return sdk.AdsConsent.getConsentInfo();
    }
  }

  private async initializeSdk(sdk: GoogleMobileAds) {
    if (!this.initializing) {
      this.initializing = this.runSdkInitialization(sdk);
    }

    try {
      await this.initializing;
    } catch (error) {
      // 실패한 초기화는 캐시하지 않는다 — 다음 준비에서 다시 시도한다.
      this.initializing = null;

      throw error;
    }

    this.setCanRequestAds(true);
  }

  private async runSdkInitialization(sdk: GoogleMobileAds) {
    await sdk.default().initialize();

    this.initialized = true;
  }

  private setCanRequestAds(canRequestAds: boolean) {
    this.canRequestAds = canRequestAds;
  }

  private setConsentFlowActive(consentFlowActive: boolean) {
    this.consentFlowActive = consentFlowActive;
  }

  private async resolveConsent(sdk: GoogleMobileAds): Promise<AdConsentStatus> {
    try {
      const info = await this.gatherConsentInfo(sdk);

      this.applyConsentInfo(info);

      if (!info.canRequestAds) {
        this.setCanRequestAds(false);

        return AdConsentStatus.Blocked;
      }

      const trackingStatus = await this.requestTracking();

      await this.initializeSdk(sdk);

      return trackingStatus;
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

  // AD-3 2·3: UMP 다음에 iOS ATT를 한 번 묻는다. ATT가 아직 미결정이면 앱 디자인의 안내 시트를
  // 먼저 띄운다. 시트는 닫을 수 없고 `계속`이 유일한 출구라 항상 시스템 팝업으로 이어진다 — 시트를
  // 띄우지 못하면 시트 없이 바로 묻는다. 이미 결정했으면 창 없이 기존 값을 읽는다.
  // (AdMob 콘솔의 IDFA 설명 메시지가 켜져 있으면 UMP가 먼저 ATT를 띄워, 여기서는 결과만 읽는다.)
  private async requestTracking(): Promise<AdConsentStatus> {
    if (Platform.OS !== 'ios') {
      return AdConsentStatus.Granted;
    }

    const tracking = loadTrackingTransparency();

    if (!tracking) {
      return AdConsentStatus.TrackingDenied;
    }

    try {
      const current = await tracking.getTrackingPermissionsAsync();

      if (current.status !== tracking.PermissionStatus.UNDETERMINED) {
        return this.toTrackingStatus(current.status, tracking);
      }

      await this.askTrackingPrompt();

      const isActive = await waitForActiveAppState(APP_ACTIVE_TIMEOUT_MS);

      if (!isActive) {
        return AdConsentStatus.TrackingDenied;
      }

      const { status } = await tracking.requestTrackingPermissionsAsync();

      return this.toTrackingStatus(status, tracking);
    } catch {
      return AdConsentStatus.TrackingDenied;
    }
  }

  private toTrackingStatus(
    status: string,
    tracking: TrackingTransparency
  ): AdConsentStatus {
    return status === tracking.PermissionStatus.GRANTED
      ? AdConsentStatus.Granted
      : AdConsentStatus.TrackingDenied;
  }

  // 루트의 시트 호스트(`AdTrackingPromptSheetView`)가 `trackingPromptVisible`을 보고 시트를 띄운다.
  // 이 약속은 멈추지 않는다 — 시트가 정해진 시간 안에 뜨지 않거나(`onShow` 없음), 호스트가 띄울 수
  // 없다고 알리면(`skipTrackingPrompt`) 시트 없이 끝난다.
  private askTrackingPrompt(): Promise<void> {
    return new Promise<void>(resolve => {
      this.resolveTrackingPrompt = resolve;
      this.trackingPromptShown = false;
      this.trackingPromptVisible = true;
      this.startTrackingPromptTimeout(TRACKING_PROMPT_SHOW_TIMEOUT_MS);
    });
  }

  private startTrackingPromptTimeout(timeoutMs: number) {
    this.clearTrackingPromptTimeout();

    this.trackingPromptTimeoutId = setTimeout(() => {
      this.handleTrackingPromptTimeout();
    }, timeoutMs);
  }

  // 뜨기를 기다리는 중이면 "뜨지 못함", `계속` 뒤 내려가기를 기다리는 중이면 "내려감"으로 보고 넘어간다.
  private handleTrackingPromptTimeout() {
    this.trackingPromptTimeoutId = null;

    if (this.trackingPromptVisible && this.trackingPromptShown) {
      return;
    }

    this.settleTrackingPrompt();
  }

  private clearTrackingPromptTimeout() {
    if (this.trackingPromptTimeoutId !== null) {
      clearTimeout(this.trackingPromptTimeoutId);
      this.trackingPromptTimeoutId = null;
    }
  }

  private settleTrackingPrompt() {
    const resolve = this.resolveTrackingPrompt;

    this.clearTrackingPromptTimeout();
    this.resolveTrackingPrompt = null;
    this.trackingPromptShown = false;
    this.trackingPromptVisible = false;

    resolve?.();
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
