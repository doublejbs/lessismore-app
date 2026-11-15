import { makeAutoObservable, when } from 'mobx';
import { AppState, Platform } from 'react-native';
import dayjs from 'dayjs';
import BagItem from '@/model/bag/BagItem';
import Firebase from '@/model/firebase/Firebase';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import AnalyticsManager from '@/model/analytics/AnalyticsManager';
import ForceUpdateManager from '@/model/app-update/ForceUpdateManager';
import OnboardingTripManager from '@/model/onboarding/OnboardingTripManager';
import FeaturePopupManager from '@/model/feature-popup/FeaturePopupManager';
import AnnouncementManager from '@/model/announcement/AnnouncementManager';
import NotificationManager from '@/model/notification/NotificationManager';
import { AdServiceContract } from '@/model/ads/AdServiceContract';
import {
  appendStoreReviewRequest,
  EMPTY_STORE_REVIEW_RECORD,
  selectStoreReviewBagId,
  StoreReviewRecord,
} from '@/model/store-review/StoreReviewEligibility';
import { loadStoreReview } from '@/model/store-review/StoreReviewModule';

// 요청 기록을 남기는 기기 로컬 키(APP-11 빈도).
const STORE_REVIEW_STORAGE_KEY = 'storeReview.record';
// 홈이 자리 잡은 뒤 뜨도록 늦추는 시간(APP-11 시점).
const STORE_REVIEW_DELAY_MS = 1500;
// 콜드 스타트에서 시작 오버레이 판정이 끝나기를 기다리는 최대 시간(APP-11).
const STORE_REVIEW_SETTLE_TIMEOUT_MS = 10000;
const APP_STATE_ACTIVE = 'active';
const STORE_REVIEW_EVENT = 'store_review_request';

interface StoreReviewManagerDeps {
  firebase: Firebase;
  analyticsManager: AnalyticsManager;
  forceUpdateManager: ForceUpdateManager;
  onboardingTripManager: OnboardingTripManager;
  featurePopupManager: FeaturePopupManager;
  announcementManager: AnnouncementManager;
  notificationManager: NotificationManager;
  adService: AdServiceContract;
}

type SettleWait = Promise<void> & { cancel(): void };

/**
 * APP-11 앱 평가 요청. 홈 로딩이 끝날 때 `maybeRequest(bags)`로 판정하고, 조건이 맞으면 약 1.5초 뒤
 * OS 기본 평가 창을 요청한다. 사전 질문·커스텀 알럿·별점 분기 없이 요청만 한다.
 */
class StoreReviewManager {
  public static new(deps: StoreReviewManagerDeps) {
    return new StoreReviewManager(deps);
  }

  private record: StoreReviewRecord | null = null;
  // 대기·요청 중에는 홈 재로딩이 와도 다시 판정하지 않는다.
  private pending = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private settleWait: SettleWait | null = null;

  private constructor(private readonly deps: StoreReviewManagerDeps) {
    makeAutoObservable<StoreReviewManager, 'deps' | 'timer' | 'settleWait'>(
      this,
      {
        deps: false,
        timer: false,
        settleWait: false,
      }
    );
  }

  public async maybeRequest(bags: BagItem[]): Promise<void> {
    // 웹은 평가 창이 없다 — 처음부터 건너뛴다.
    if (Platform.OS === 'web') {
      return;
    }

    if (this.pending || !this.deps.firebase.isLoggedIn()) {
      return;
    }

    this.setPending(true);

    try {
      const bagId = selectStoreReviewBagId(
        bags,
        await this.loadRecord(),
        dayjs()
      );

      // 지연 전에는 "떠 있는" 오버레이만 거른다 — 판정 전이라는 이유로 포기하지 않는다(콜드 스타트).
      if (bagId === null || this.isOverlayShowing()) {
        return;
      }

      const uid = this.deps.firebase.getUserId();

      await this.delay(STORE_REVIEW_DELAY_MS);

      // 판정이 끝나기를 최대 10초 기다린다. 넘기면 기록 없이 이번에는 건너뛴다.
      if (!(await this.waitUntilSettled())) {
        return;
      }

      // 겹침 방지(APP-10) 전체 확인 + 백그라운드·계정 전환이면 넘긴다.
      if (
        this.isBlocked() ||
        AppState.currentState !== APP_STATE_ACTIVE ||
        this.deps.firebase.getUserId() !== uid
      ) {
        return;
      }

      const storeReview = loadStoreReview();

      if (!storeReview) {
        return;
      }

      const available = await storeReview.isAvailableAsync();

      // 가용성 false면 아무것도 하지 않고 기록도 남기지 않는다.
      if (!available) {
        return;
      }

      this.deps.analyticsManager.logEvent(STORE_REVIEW_EVENT);
      // 기록을 요청보다 먼저 저장한다 — 요청이 멈추거나 실패해도 같은 배낭으로 다시 요청하지 않게(의도).
      await this.saveRecord(
        appendStoreReviewRequest(await this.loadRecord(), bagId, Date.now())
      );
      await storeReview.requestReview();
    } catch (error) {
      console.warn('앱 평가 요청 실패', error); // l10n-ignore: 개발자 로그
    } finally {
      this.setPending(false);
    }
  }

  // 대기 중인 요청을 취소한다 — 앱 종료·재초기화 시 타이머·대기 누수를 막는다.
  public dispose() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.setTimer(null);
    }

    this.settleWait?.cancel();
    this.setSettleWait(null);
    this.setPending(false);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.setTimer(
        setTimeout(() => {
          this.setTimer(null);
          resolve();
        }, ms)
      );
    });
  }

  private async waitUntilSettled(): Promise<boolean> {
    const settleWait = when(() => this.isSettled(), {
      timeout: STORE_REVIEW_SETTLE_TIMEOUT_MS,
    });

    this.setSettleWait(settleWait);

    try {
      await settleWait;

      return true;
    } catch {
      // 타임아웃(또는 dispose 취소) — 이번에는 건너뛴다.
      return false;
    } finally {
      this.setSettleWait(null);
    }
  }

  // 시작 오버레이(APP-10)·OS 대화상자가 지금 떠 있는지. 판정 전인지는 보지 않는다.
  private isOverlayShowing(): boolean {
    const {
      firebase,
      forceUpdateManager,
      onboardingTripManager,
      featurePopupManager,
      announcementManager,
      notificationManager,
      adService,
    } = this.deps;

    // 약관 동의 화면은 로그인 + 미동의일 때 뜬다.
    const termsShowing = firebase.isLoggedIn() && !firebase.hasUserAgreedToTerms();

    return (
      forceUpdateManager.getNeedsUpdate() ||
      termsShowing ||
      onboardingTripManager.isShowing() ||
      onboardingTripManager.isWelcomeShowing() ||
      featurePopupManager.shouldShow() ||
      announcementManager.shouldShow() ||
      notificationManager.isLaunchPermissionRequesting() ||
      adService.isConsentFlowActive()
    );
  }

  // 강제 업데이트·첫 여행 가이드·신기능 팝업·공지·시작 시 알림 권한 판정이 모두 끝났는지.
  private isSettled(): boolean {
    const {
      forceUpdateManager,
      onboardingTripManager,
      featurePopupManager,
      announcementManager,
      notificationManager,
    } = this.deps;

    return (
      forceUpdateManager.isResolved() &&
      onboardingTripManager.isResolvedForCurrentKey() &&
      featurePopupManager.isResolved() &&
      announcementManager.isResolved() &&
      notificationManager.isLaunchPermissionSettled()
    );
  }

  // 평가 창은 시작 오버레이 우선순위 맨 뒤다 — 판정 전이거나 무엇이든 떠 있으면 막힘.
  private isBlocked(): boolean {
    return (
      !this.isSettled() ||
      this.isOverlayShowing() ||
      this.deps.onboardingTripManager.isBlockingPopups()
    );
  }

  private async loadRecord(): Promise<StoreReviewRecord> {
    if (this.record) {
      return this.record;
    }

    const stored =
      await LocalStorageManager.get<StoreReviewRecord>(STORE_REVIEW_STORAGE_KEY);
    const record = this.normalizeRecord(stored);

    this.setRecord(record);

    return record;
  }

  private async saveRecord(record: StoreReviewRecord): Promise<void> {
    this.setRecord(record);
    await LocalStorageManager.set(STORE_REVIEW_STORAGE_KEY, record);
  }

  // 저장값이 깨졌어도 빈 기록으로 본다.
  private normalizeRecord(value: unknown): StoreReviewRecord {
    if (!value || typeof value !== 'object') {
      return EMPTY_STORE_REVIEW_RECORD;
    }

    const { requestedBagIds, lastRequestedAt } = value as Partial<StoreReviewRecord>;

    return {
      requestedBagIds: Array.isArray(requestedBagIds)
        ? requestedBagIds.filter(id => typeof id === 'string')
        : [],
      lastRequestedAt:
        typeof lastRequestedAt === 'number' ? lastRequestedAt : null,
    };
  }

  private setRecord(value: StoreReviewRecord) {
    this.record = value;
  }

  private setTimer(value: ReturnType<typeof setTimeout> | null) {
    this.timer = value;
  }

  private setSettleWait(value: SettleWait | null) {
    this.settleWait = value;
  }

  private setPending(value: boolean) {
    this.pending = value;
  }
}

export default StoreReviewManager;
