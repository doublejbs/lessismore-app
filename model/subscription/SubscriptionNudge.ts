import { makeAutoObservable } from 'mobx';
import type { AdServiceContract } from '@/model/ads/AdServiceContract';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import {
  SUBSCRIPTION_NUDGE_IMPRESSION_THRESHOLD,
  SUBSCRIPTION_NUDGE_OPEN_FALLBACK_MS,
  SUBSCRIPTION_NUDGE_PRICE_WAIT_MS,
  SUBSCRIPTION_NUDGE_SHOW_TIMEOUT_MS,
} from './SubscriptionConstants';
import SubscriptionNudgeAction from './SubscriptionNudgeAction';
import SubscriptionOfferingStatus from './SubscriptionOfferingStatus';
import type SubscriptionStore from './SubscriptionStore';

// SUB-9: 광고가 화면에 그려진 누적 횟수(자리 5곳 합산, 기기에 기록).
const AD_IMPRESSION_COUNT_STORAGE_KEY = 'ads.impressionCount';

// SUB-9: 한 번 뜨는 안내 시트를 띄웠는지(기기에 기록). 한 번 띄우면 어떻게 닫든 다시 뜨지 않는다.
const NUDGE_SHOWN_STORAGE_KEY = 'subscription.nudgeShown';

type NudgeActionListener = (action: SubscriptionNudgeAction) => void;

const wait = (timeoutMs: number) => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, timeoutMs);
  });
};

/**
 * SUB-9: 광고 누적 노출 뒤 딱 한 번 뜨는 구독 안내 시트. `App`이 1개 만들어 앱 수명 동안 든다.
 *
 * - 광고 뷰(한 장짜리 카드·목록 셀)가 광고를 그릴 때 `recordAdImpression`을 부른다. 같은 광고 객체는
 *   한 번만 센다 — 다시 그려지거나 목록 가상화로 다시 붙어도 늘지 않는다.
 * - 누적이 기준에 닿고 아직 띄운 적이 없으면, 구독 기능이 켜져 있고 미구독이며 동의 창이 없고 광고를 그린
 *   화면이 포커스돼 있을 때(= 그 위에 시트·모달 화면이 없을 때) 시트를 요청한다. 루트의 시트 호스트
 *   (`SubscriptionNudgeSheetView`)가 이 요청을 보고 띄운다(추적 안내 시트와 같은 얼개).
 * - 시트가 실제로 뜬 순간(`markSheetShown`, Modal `onShow`) 기기에 기록한다. 뜨지 못하면(다른 시트·게이트가
 *   덮음, 제한 시간 안에 `onShow` 없음) 기록하지 않고 다음 광고 때 다시 본다.
 * - `구독 알아보기`는 시트가 완전히 내려간 뒤(`completeSheet`) 구독 화면을 연다 — 내려가는 Modal과
 *   구독 시트(formSheet)가 겹치지 않게.
 */
class SubscriptionNudge {
  public static new(
    subscriptionStore: SubscriptionStore,
    adService: AdServiceContract,
    onOpen: () => void,
    onAction: NudgeActionListener
  ) {
    return new SubscriptionNudge(
      subscriptionStore,
      adService,
      onOpen,
      onAction
    );
  }

  // 호스트가 관찰하는 값.
  private sheetRequested = false;
  private priceString: string | null = null;

  private readonly countedAds = new WeakSet<object>();
  private impressionCount: number | null = null;
  private shown = false;
  private sheetShown = false;
  private openAfterDismiss = false;
  private showTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private openFallbackId: ReturnType<typeof setTimeout> | null = null;
  // 기기 기록을 읽고 쓰는 일을 한 줄로 세운다 — 빠르게 이어진 노출이 서로의 값을 덮어쓰지 않게.
  private queue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly subscriptionStore: SubscriptionStore,
    private readonly adService: AdServiceContract,
    private readonly onOpen: () => void,
    private readonly onAction: NudgeActionListener
  ) {
    makeAutoObservable<
      SubscriptionNudge,
      | 'countedAds'
      | 'impressionCount'
      | 'shown'
      | 'sheetShown'
      | 'openAfterDismiss'
      | 'showTimeoutId'
      | 'openFallbackId'
      | 'queue'
      | 'subscriptionStore'
      | 'adService'
      | 'onOpen'
      | 'onAction'
    >(this, {
      countedAds: false,
      impressionCount: false,
      shown: false,
      sheetShown: false,
      openAfterDismiss: false,
      showTimeoutId: false,
      openFallbackId: false,
      queue: false,
      subscriptionStore: false,
      adService: false,
      onOpen: false,
      onAction: false,
    });
  }

  // `isScreenFocused`: 광고를 그린 화면이 포커스돼 있는지. 아니면(그 위에 시트·모달 화면이 떠 있음·
  // 뒤에 미리 마운트된 탭) 세기만 하고 띄우지 않는다.
  public recordAdImpression(ad: object, isScreenFocused: boolean) {
    // 이미 띄웠으면 더 셀 일이 없다.
    if (this.shown || this.countedAds.has(ad)) {
      return;
    }

    this.countedAds.add(ad);
    this.queue = this.queue.then(() => this.handleImpression(isScreenFocused));
  }

  public isSheetRequested(): boolean {
    return this.sheetRequested;
  }

  // 요청한 때 알던 스토어 가격(SUB-1). 모르면 null — 가격 없는 문구를 쓴다.
  public getPriceString(): string | null {
    return this.priceString;
  }

  // 시트 호스트의 Modal이 실제로 화면에 떴다(`onShow`). 이때 기록한다.
  public markSheetShown() {
    if (!this.sheetRequested || this.sheetShown) {
      return;
    }

    this.clearShowTimeout();
    this.sheetShown = true;
    this.shown = true;
    this.onAction(SubscriptionNudgeAction.Shown);
    void LocalStorageManager.set(NUDGE_SHOWN_STORAGE_KEY, true);
  }

  // `구독 알아보기`: 시트를 내리고, 완전히 내려가면(`completeSheet`) 구독 화면을 연다.
  public acceptSheet() {
    if (!this.sheetRequested || !this.sheetShown) {
      return;
    }

    this.onAction(SubscriptionNudgeAction.Open);
    this.openAfterDismiss = true;
    this.sheetRequested = false;
    this.startOpenFallback();
  }

  // 스와이프·바깥 탭·`괜찮아요`·안드로이드 뒤로가기.
  public dismissSheet() {
    if (!this.sheetRequested) {
      return;
    }

    if (this.sheetShown) {
      this.onAction(SubscriptionNudgeAction.Dismiss);
    }

    this.sheetRequested = false;
  }

  // 시트가 완전히 내려갔다(iOS Modal `onDismiss`, 그 밖은 닫힘 전환 끝).
  public completeSheet() {
    const shouldOpen = this.openAfterDismiss;

    this.clearOpenFallback();
    this.openAfterDismiss = false;
    this.sheetShown = false;

    if (shouldOpen) {
      this.onOpen();
    }
  }

  // 시트를 띄울 수 없다(강제 업데이트 게이트·공지·신기능 팝업·추적 안내 시트가 덮음). 아직 뜨기 전이면
  // 기록하지 않고 요청을 거둔다 — 다음 광고 때 다시 본다. 이미 떠 있었으면 닫은 것으로 친다.
  public skipSheet() {
    if (!this.sheetRequested) {
      return;
    }

    if (this.sheetShown) {
      this.dismissSheet();

      return;
    }

    this.clearShowTimeout();
    this.sheetRequested = false;
  }

  private async handleImpression(isScreenFocused: boolean) {
    try {
      await this.loadRecords();

      // 기기 기록상 이미 띄웠으면 누적도 더 쓰지 않는다.
      if (this.shown) {
        return;
      }

      const nextCount = (this.impressionCount ?? 0) + 1;

      this.impressionCount = nextCount;
      await LocalStorageManager.set(AD_IMPRESSION_COUNT_STORAGE_KEY, nextCount);

      if (
        !isScreenFocused ||
        nextCount < SUBSCRIPTION_NUDGE_IMPRESSION_THRESHOLD
      ) {
        return;
      }

      await this.requestIfAllowed();
    } catch {
      // 기록·안내는 없어도 되는 요소다 — 광고 흐름을 막지 않는다.
    }
  }

  private async loadRecords() {
    if (this.impressionCount !== null) {
      return;
    }

    const [storedCount, storedShown] = await Promise.all([
      LocalStorageManager.get<number>(AD_IMPRESSION_COUNT_STORAGE_KEY),
      LocalStorageManager.get<boolean>(NUDGE_SHOWN_STORAGE_KEY),
    ]);

    this.impressionCount = typeof storedCount === 'number' ? storedCount : 0;
    this.shown = storedShown === true;
  }

  private async requestIfAllowed() {
    if (!this.canRequest()) {
      return;
    }

    await this.preparePrice();

    // 가격을 기다리는 사이 구독했거나 동의 창이 떴을 수 있다.
    if (!this.canRequest()) {
      return;
    }

    this.requestSheet(this.subscriptionStore.getPriceString());
  }

  // 구독 판단(SUB-4)은 customerInfo로 끝난다 — 상품(offerings)을 못 불러와도 띄운다(가격 없는 문구).
  private canRequest(): boolean {
    return (
      !this.shown &&
      !this.sheetRequested &&
      this.subscriptionStore.isAvailable() &&
      this.subscriptionStore.isResolved() &&
      !this.subscriptionStore.isSubscribed() &&
      !this.adService.isConsentFlowActive()
    );
  }

  // SUB-1: 가격은 스토어 값만 쓴다. 아직 모르면 상품을 불러오되 짧게만 기다린다 — 넘기면 가격 없는 문구.
  private async preparePrice() {
    if (this.subscriptionStore.getPriceString()) {
      return;
    }

    if (
      this.subscriptionStore.getOfferingStatus() ===
      SubscriptionOfferingStatus.Error
    ) {
      return;
    }

    await Promise.race([
      this.subscriptionStore.loadOffering(),
      wait(SUBSCRIPTION_NUDGE_PRICE_WAIT_MS),
    ]);
  }

  private requestSheet(priceString: string | null) {
    this.priceString = priceString;
    this.sheetShown = false;
    this.openAfterDismiss = false;
    this.sheetRequested = true;
    this.startShowTimeout();
  }

  // 요청한 뒤 이 안에 Modal이 뜨지 않으면(`onShow` 없음) 거둔다 — 다음 광고 때 다시 본다.
  private startShowTimeout() {
    this.clearShowTimeout();

    this.showTimeoutId = setTimeout(() => {
      this.handleShowTimeout();
    }, SUBSCRIPTION_NUDGE_SHOW_TIMEOUT_MS);
  }

  private handleShowTimeout() {
    this.showTimeoutId = null;
    this.skipSheet();
  }

  // 내려간 신호를 놓쳐도 한 번은 연다. `completeSheet`가 `openAfterDismiss`를 비우므로 두 번 열리지 않는다.
  private startOpenFallback() {
    this.clearOpenFallback();

    this.openFallbackId = setTimeout(() => {
      this.openFallbackId = null;
      this.completeSheet();
    }, SUBSCRIPTION_NUDGE_OPEN_FALLBACK_MS);
  }

  private clearOpenFallback() {
    if (this.openFallbackId !== null) {
      clearTimeout(this.openFallbackId);
      this.openFallbackId = null;
    }
  }

  private clearShowTimeout() {
    if (this.showTimeoutId !== null) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
  }
}

export default SubscriptionNudge;
