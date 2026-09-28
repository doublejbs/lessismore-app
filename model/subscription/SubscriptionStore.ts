import { makeAutoObservable, observable, reaction, runInAction } from 'mobx';
import { AppState, Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesPackage,
} from 'react-native-purchases';
import type Firebase from '@/model/firebase/Firebase';
import PurchaseResult from './PurchaseResult';
import { loadPurchases, Purchases } from './PurchasesModule';
import RestoreResult from './RestoreResult';
import RevenueCatKeys from './RevenueCatKeys';
import {
  ANDROID_MANAGE_SUBSCRIPTIONS_URL,
  IOS_MANAGE_SUBSCRIPTIONS_URL,
  NO_ADS_ENTITLEMENT_ID,
  SUBSCRIPTION_RESOLVE_TIMEOUT_MS,
} from './SubscriptionConstants';
import { SubscriptionGateContract } from './SubscriptionGateContract';
import SubscriptionOfferingStatus from './SubscriptionOfferingStatus';

const APP_STATE_ACTIVE = 'active';

const getApiKey = (): string => {
  if (Platform.OS === 'ios') {
    return RevenueCatKeys.ios;
  }

  if (Platform.OS === 'android') {
    return RevenueCatKeys.android;
  }

  return '';
};

/**
 * SUB-1~SUB-5: 광고 제거 구독 상태. `App`이 1개 만들어 앱 수명 동안 든다.
 *
 * - 구독 판단 소스는 RevenueCat SDK의 `customerInfo.entitlements.active.no_ads`다(SUB-4).
 *   Firestore(DM-31)는 읽지 않는다.
 * - 구독 기능은 **네이티브 + 공개 키 있음 + 네이티브 모듈 있음**일 때만 켜진다(`isAvailable`).
 *   꺼져 있으면 처음부터 "미구독으로 확정"이다.
 * - 계정 연결(SUB-3): 초기화 때 로그인 uid로 설정하고, 이후 Firebase uid가 바뀌면 `logIn`/`logOut`.
 * - SDK가 실패하면(네트워크·스토어) 미구독으로 확정한다 — 광고가 막히는 쪽이 더 나쁘다(SUB-4).
 */
class SubscriptionStore implements SubscriptionGateContract {
  public static new(firebase: Firebase) {
    return new SubscriptionStore(firebase);
  }

  private resolved = false;
  private subscribed = false;
  private willRenew = false;
  private expirationDate: string | null = null;
  private offeringStatus = SubscriptionOfferingStatus.Idle;
  private monthlyPackage: PurchasesPackage | null = null;
  private purchasing = false;
  private restoring = false;
  private configured = false;
  // `configure`가 던졌으면 구독 기능을 끈다(설정 행 숨김, 미구독).
  private configureFailed = false;
  // RevenueCat에 연결된 uid('' = 익명). Firebase uid와 다르면 `syncUser`가 맞춘다.
  private linkedUserId = '';
  private userSyncing: Promise<void> | null = null;
  private resolveWaiters: (() => void)[] = [];
  private resolveTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable<
      SubscriptionStore,
      | 'monthlyPackage'
      | 'configured'
      | 'configureFailed'
      | 'linkedUserId'
      | 'userSyncing'
      | 'resolveWaiters'
      | 'resolveTimeoutId'
      | 'firebase'
    >(this, {
      monthlyPackage: observable.ref,
      configured: false,
      configureFailed: false,
      linkedUserId: false,
      userSyncing: false,
      resolveWaiters: false,
      resolveTimeoutId: false,
      firebase: false,
    });
  }

  // `App.initialize`가 Firebase 초기화 뒤 1회 부른다(로그인 uid를 알고 나서 설정해야 SUB-3).
  public async initialize() {
    const sdk = this.getSdk();

    if (!sdk || this.configured) {
      return;
    }

    const userId = this.firebase.getUserId();

    this.startResolveTimeout();

    try {
      sdk.default.configure({
        apiKey: getApiKey(),
        appUserID: userId || null,
      });
    } catch {
      this.configureFailed = true;
      this.resolveAsNotSubscribed();

      return;
    }

    this.configured = true;
    this.linkedUserId = userId;

    sdk.default.addCustomerInfoUpdateListener(this.handleCustomerInfoUpdate);

    // SUB-3: 로그인·로그아웃·계정 전환을 따라간다.
    reaction(
      () => this.firebase.getUserId(),
      nextUserId => {
        void this.syncUser(nextUserId);
      }
    );

    // SUB-4: 포그라운드로 돌아올 때 한 번 갱신한다(갱신·만료·환불을 놓치지 않게).
    AppState.addEventListener('change', nextState => {
      if (nextState === APP_STATE_ACTIVE) {
        void this.refresh();
      }
    });

    await this.refresh();
  }

  // 구독 기능을 쓸 수 있는지. 웹·공개 키 없음·네이티브 모듈 없음(옛 바이너리)·SDK 설정 실패면 false —
  // 설정 행을 숨기고 미구독으로 본다. 초기화 전에는 true(구독 상태를 기다린다).
  public isAvailable(): boolean {
    return this.getSdk() !== null && !this.configureFailed;
  }

  public isResolved(): boolean {
    return !this.isAvailable() || this.resolved;
  }

  public isSubscribed(): boolean {
    return this.isAvailable() && this.subscribed;
  }

  public willRenewSubscription(): boolean {
    return this.willRenew;
  }

  // ISO 8601 문자열. 구독 중이 아니거나 만료가 없는 권한이면 null.
  public getExpirationDate(): string | null {
    return this.expirationDate;
  }

  public getOfferingStatus(): SubscriptionOfferingStatus {
    return this.offeringStatus;
  }

  // SUB-1: 스토어가 정한 현지화 가격 문자열(하드코딩하지 않는다).
  public getPriceString(): string | null {
    return this.monthlyPackage?.product.priceString ?? null;
  }

  public isPurchasing(): boolean {
    return this.purchasing;
  }

  public isRestoring(): boolean {
    return this.restoring;
  }

  // SUB-5: 스토어의 구독 관리 화면.
  public getManageSubscriptionsUrl(): string {
    return Platform.OS === 'android'
      ? ANDROID_MANAGE_SUBSCRIPTIONS_URL
      : IOS_MANAGE_SUBSCRIPTIONS_URL;
  }

  public waitUntilResolved(): Promise<void> {
    if (this.isResolved()) {
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      // 초기화가 늦어도 광고 쪽이 멈추지 않게 기다림마다 제한 시간을 둔다.
      const timeoutId = setTimeout(() => {
        finish();
      }, SUBSCRIPTION_RESOLVE_TIMEOUT_MS);

      const finish = () => {
        clearTimeout(timeoutId);
        this.resolveWaiters = this.resolveWaiters.filter(
          waiter => waiter !== finish
        );
        resolve();
      };

      this.resolveWaiters.push(finish);
    });
  }

  // SUB-2: 구독 화면이 열릴 때 월 패키지를 불러온다. 불러오지 못하면 `Error`(가격 자리에 오류 + 다시 시도).
  public async loadOffering() {
    const sdk = this.getSdk();

    if (!sdk || !this.configured) {
      this.setOfferingStatus(SubscriptionOfferingStatus.Error);

      return;
    }

    if (this.offeringStatus === SubscriptionOfferingStatus.Loading) {
      return;
    }

    // 이미 가격을 보여 주고 있으면(다시 열기) 그대로 둔 채 조용히 다시 받는다.
    const hadPackage =
      this.offeringStatus === SubscriptionOfferingStatus.Ready &&
      this.monthlyPackage !== null;

    if (!hadPackage) {
      this.setOfferingStatus(SubscriptionOfferingStatus.Loading);
    }

    try {
      const offerings = await sdk.default.getOfferings();
      const current = offerings.current;
      const monthlyPackage =
        current?.monthly ?? current?.availablePackages[0] ?? null;

      runInAction(() => {
        if (!monthlyPackage && hadPackage) {
          return;
        }

        this.monthlyPackage = monthlyPackage;
        this.offeringStatus = monthlyPackage
          ? SubscriptionOfferingStatus.Ready
          : SubscriptionOfferingStatus.Error;
      });
    } catch {
      if (!hadPackage) {
        this.setOfferingStatus(SubscriptionOfferingStatus.Error);
      }
    }
  }

  // SUB-2·SUB-3: 로그인한 사용자만 부른다(화면이 막는다). 스토어 창에서 취소하면 `Cancelled`.
  public async purchase(): Promise<PurchaseResult> {
    const sdk = this.getSdk();
    const monthlyPackage = this.monthlyPackage;

    if (
      !sdk ||
      !this.configured ||
      !monthlyPackage ||
      this.purchasing ||
      !this.firebase.isLoggedIn()
    ) {
      return PurchaseResult.Error;
    }

    this.setPurchasing(true);

    try {
      // 로그인 직후라 `logIn`이 아직 진행 중이면 끝나기를 기다린다 — 익명 ID로 사지 않게(SUB-3).
      await this.ensureLinkedToCurrentUser();

      const userId = this.getLinkedCurrentUserId();

      if (!userId) {
        return PurchaseResult.Error;
      }

      const { customerInfo } =
        await sdk.default.purchasePackage(monthlyPackage);

      // 스토어 창이 떠 있는 사이 계정이 바뀌었으면 결과를 새 계정에 반영하지 않는다.
      if (!this.isStillLinkedTo(userId)) {
        return PurchaseResult.Error;
      }

      this.applyCustomerInfo(customerInfo);

      return this.subscribed ? PurchaseResult.Success : PurchaseResult.Error;
    } catch (error) {
      return this.toPurchaseErrorResult(sdk, error);
    } finally {
      this.setPurchasing(false);
    }
  }

  // SUB-5: 권한이 살아나면 `Restored`, 없으면 `None`. 로그인한 사용자만 — 익명 ID로 복원하면 구독이
  // 익명 사용자에게 옮겨 붙는다(SUB-3).
  public async restore(): Promise<RestoreResult> {
    const sdk = this.getSdk();

    if (
      !sdk ||
      !this.configured ||
      this.restoring ||
      !this.firebase.isLoggedIn()
    ) {
      return RestoreResult.Error;
    }

    this.setRestoring(true);

    try {
      await this.ensureLinkedToCurrentUser();

      const userId = this.getLinkedCurrentUserId();

      if (!userId) {
        return RestoreResult.Error;
      }

      const customerInfo = await sdk.default.restorePurchases();

      if (!this.isStillLinkedTo(userId)) {
        return RestoreResult.Error;
      }

      this.applyCustomerInfo(customerInfo);

      return this.subscribed ? RestoreResult.Restored : RestoreResult.None;
    } catch {
      return RestoreResult.Error;
    } finally {
      this.setRestoring(false);
    }
  }

  public async refresh() {
    const sdk = this.getSdk();

    if (!sdk || !this.configured) {
      return;
    }

    const userId = this.linkedUserId;

    try {
      const customerInfo = await sdk.default.getCustomerInfo();

      // 응답 사이 계정이 바뀌었으면 옛 계정의 상태를 쓰지 않는다(`syncUser`가 새 상태를 준다).
      if (!this.isStillLinkedTo(userId)) {
        return;
      }

      this.applyCustomerInfo(customerInfo);
    } catch {
      // 이미 아는 상태가 있으면 그대로 둔다(SDK가 마지막 상태를 캐시한다). 처음이면 미구독으로 확정.
      this.resolveAsNotSubscribed();
    }
  }

  // SDK 이벤트(갱신·만료·환불·다른 기기 구매)를 즉시 반영한다(SUB-4).
  private handleCustomerInfoUpdate = (customerInfo: CustomerInfo) => {
    this.applyCustomerInfo(customerInfo);
  };

  private async syncUser(userId: string) {
    const previous = this.userSyncing;

    const syncing = (async () => {
      if (previous) {
        await previous;
      }

      await this.runUserSync(userId);
    })();

    this.userSyncing = syncing;

    try {
      await syncing;
    } finally {
      if (this.userSyncing === syncing) {
        this.userSyncing = null;
      }
    }
  }

  private async runUserSync(userId: string) {
    const sdk = this.getSdk();

    if (!sdk || !this.configured || userId === this.linkedUserId) {
      return;
    }

    if (!userId) {
      // 로그아웃: 권한은 uid에 묶여 있으니 응답을 기다리지 않고 바로 미구독으로 둔다.
      this.clearEntitlement();

      try {
        const customerInfo = await sdk.default.logOut();

        this.linkedUserId = '';

        if (this.firebase.getUserId() !== '') {
          return;
        }

        this.applyCustomerInfo(customerInfo);
      } catch {
        // 이미 익명이면 SDK가 던진다 — 결과는 같다.
        this.linkedUserId = '';
      }

      return;
    }

    try {
      const { customerInfo } = await sdk.default.logIn(userId);

      this.linkedUserId = userId;

      // 연결하는 사이 다시 로그아웃·전환됐으면 뒤따르는 동기화가 상태를 정한다.
      if (this.firebase.getUserId() !== userId) {
        return;
      }

      this.applyCustomerInfo(customerInfo);
    } catch {
      // 연결에 실패하면 이 사용자의 구독을 알 수 없다 — 미구독으로 둔다(다음 uid 변경·재시작에 다시 시도).
      this.clearEntitlement();
    }
  }

  private async ensureLinkedToCurrentUser() {
    if (this.userSyncing) {
      await this.userSyncing;
    }

    const userId = this.firebase.getUserId();

    if (userId !== this.linkedUserId) {
      await this.syncUser(userId);
    }
  }

  // RevenueCat이 지금 Firebase 사용자에 연결돼 있으면 그 uid, 아니면(익명·다른 계정) ''.
  private getLinkedCurrentUserId(): string {
    const userId = this.firebase.getUserId();

    if (!this.firebase.isLoggedIn() || !userId) {
      return '';
    }

    return this.linkedUserId === userId ? userId : '';
  }

  private isStillLinkedTo(userId: string): boolean {
    return this.linkedUserId === userId && this.firebase.getUserId() === userId;
  }

  private applyCustomerInfo(customerInfo: CustomerInfo) {
    const entitlement =
      customerInfo.entitlements.active[NO_ADS_ENTITLEMENT_ID] ?? null;

    this.subscribed = entitlement !== null;
    this.willRenew = entitlement?.willRenew ?? false;
    this.expirationDate = entitlement?.expirationDate ?? null;
    this.markResolved();
  }

  private clearEntitlement() {
    this.subscribed = false;
    this.willRenew = false;
    this.expirationDate = null;
  }

  private resolveAsNotSubscribed() {
    if (this.resolved) {
      return;
    }

    this.clearEntitlement();
    this.markResolved();
  }

  private markResolved() {
    this.resolved = true;

    if (this.resolveTimeoutId !== null) {
      clearTimeout(this.resolveTimeoutId);
      this.resolveTimeoutId = null;
    }

    const waiters = this.resolveWaiters;

    this.resolveWaiters = [];
    waiters.forEach(waiter => waiter());
  }

  private startResolveTimeout() {
    this.resolveTimeoutId = setTimeout(() => {
      this.handleResolveTimeout();
    }, SUBSCRIPTION_RESOLVE_TIMEOUT_MS);
  }

  private handleResolveTimeout() {
    this.resolveTimeoutId = null;
    this.resolveAsNotSubscribed();
  }

  // 스토어 창 취소 → `Cancelled`, 승인 대기(Ask to Buy·안드로이드 보류 결제) → `Pending`.
  private toPurchaseErrorResult(
    sdk: Purchases,
    error: unknown
  ): PurchaseResult {
    const purchasesError = error as Partial<PurchasesError> | null;

    if (
      purchasesError?.userCancelled === true ||
      purchasesError?.code === sdk.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return PurchaseResult.Cancelled;
    }

    if (
      purchasesError?.code === sdk.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR
    ) {
      return PurchaseResult.Pending;
    }

    return PurchaseResult.Error;
  }

  private getSdk(): Purchases | null {
    if (!getApiKey()) {
      return null;
    }

    return loadPurchases();
  }

  private setOfferingStatus(status: SubscriptionOfferingStatus) {
    this.offeringStatus = status;
  }

  private setPurchasing(purchasing: boolean) {
    this.purchasing = purchasing;
  }

  private setRestoring(restoring: boolean) {
    this.restoring = restoring;
  }
}

export default SubscriptionStore;
