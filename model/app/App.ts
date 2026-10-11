import { makeAutoObservable, reaction } from 'mobx';
import Firebase from '../firebase/Firebase';
import GearStore from '../store/GearStore';
import BagRouteStore from '../store/BagRouteStore';
import BagPointStore from '../store/BagPointStore';
import BagStore from '../store/BagStore';
import SearchStore from '../search/SearchStore';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import LogInAlertManager from '../login/LogInAlertManager';
import ReplyStore from '../store/ReplyStore';
import CampSpotStore from '../store/CampSpotStore';
import CampReviewStore from '../store/CampReviewStore';
import CampFavoriteStore from '../store/CampFavoriteStore';
import AnalyticsManager from '../analytics/AnalyticsManager';
import NotificationManager from '../notification/NotificationManager';
import AnnouncementManager from '../announcement/AnnouncementManager';
import ForceUpdateManager from '../app-update/ForceUpdateManager';
import FeaturePopupManager from '../feature-popup/FeaturePopupManager';
import GearPreviewStore from '../gear-preview/GearPreviewStore';
import BagTemplateStore from '../store/BagTemplateStore';
import FeedContentStore from '../store/FeedContentStore';
import ConsumableStore from '../store/ConsumableStore';
import CommunityStore from '../store/CommunityStore';
import GroupStore from '../store/GroupStore';
import L10n from '../l10n/L10n';
import CommunitySearchStore from '../search/CommunitySearchStore';
import RouteDirectionStore from '../route/RouteDirectionStore';
import AdService from '../ads/AdService';
import SubscriptionStore from '../subscription/SubscriptionStore';
import SubscriptionNudge from '../subscription/SubscriptionNudge';
import SubscriptionEntryPoint from '../subscription/SubscriptionEntryPoint';
import { openSubscription } from '../subscription/OpenSubscription';
import OnboardingTripManager from '../onboarding/OnboardingTripManager';
import NetworkStatus from '../offline/NetworkStatus';
import OfflineEntitlement from '../offline/OfflineEntitlement';
import OfflineTripStore from '../offline/OfflineTripStore';

class App {
  // OF-3: 연결 상태의 단일 소스. Firebase 로그인 확인이 오프라인이면 Firestore를 건너뛰어야 하므로
  // Firebase보다 먼저 만들고 먼저 초기화한다.
  private readonly networkStatus = NetworkStatus.new();
  private readonly firebase = new Firebase();
  private readonly l10n = new L10n();
  // SUB-3·SUB-4: 광고 제거 구독 상태. SDK 설정은 Firebase 초기화 뒤(로그인 uid를 알고 나서) 한다.
  // 광고 서비스가 이 상태를 보고 구독자에게는 광고·동의 흐름을 시작하지 않는다.
  private readonly subscriptionStore = SubscriptionStore.new(this.firebase);
  // AD-3·AD-5: 광고 동의·요청. 생성만 해 두고 동의 흐름은 광고 자리(홈 제외)에 처음 포커스될 때 흐른다.
  // 웹은 Metro가 `AdService.web.ts`(광고 SDK 없음)를 고른다(AD-4).
  private readonly adService = AdService.new(status => {
    this.analyticsManager?.logClick('ad_consent', { status });
  }, this.subscriptionStore);
  private gearStore: GearStore | null = null;
  private bagStore: BagStore | null = null;
  private bagTemplateStore: BagTemplateStore | null = null;
  private feedContentStore: FeedContentStore | null = null;
  private consumableStore: ConsumableStore | null = null;
  private searchStore: SearchStore | null = null;
  private alertManager: AlertManager | null = null;
  private logInAlertManager: LogInAlertManager | null = null;
  private toastManager: ToastManager | null = null;
  private replyStore: ReplyStore | null = null;
  private campSpotStore: CampSpotStore | null = null;
  private campReviewStore: CampReviewStore | null = null;
  private campFavoriteStore: CampFavoriteStore | null = null;
  private analyticsManager: AnalyticsManager | null = null;
  private notificationManager: NotificationManager | null = null;
  private announcementManager: AnnouncementManager | null = null;
  private forceUpdateManager: ForceUpdateManager | null = null;
  private featurePopupManager: FeaturePopupManager | null = null;
  private onboardingTripManager: OnboardingTripManager | null = null;
  private communityStore: CommunityStore | null = null;
  private groupStore: GroupStore | null = null;
  // 배낭 코스(BD-11). 배낭 문서와 접근 범위가 달라 BagStore와 따로 둔다 — BagRouteStore 주석 참고.
  private bagRouteStore: BagRouteStore | null = null;
  // 배낭 지도 포인트(BD-14). 코스와 같은 이유로 BagStore와 따로 둔다 — BagPointStore 주석 참고.
  private bagPointStore: BagPointStore | null = null;
  private communitySearchStore: CommunitySearchStore | null = null;
  // SUB-9: 광고 누적 노출 뒤 한 번 뜨는 구독 안내 시트. 분석 매니저가 생긴 뒤 만든다.
  private subscriptionNudge: SubscriptionNudge | null = null;
  // 오프라인 저장(OF-1 ~ OF-8)과 그 권한 판단(OF-7). 웹·옛 바이너리에서는 만들기만 하고 아무것도 하지 않는다.
  private offlineEntitlement: OfflineEntitlement | null = null;
  private offlineTripStore: OfflineTripStore | null = null;

  private gearPreviewStore: GearPreviewStore | null = null;
  private initialized = false;
  // 초기화 진행 중 재진입 방지 — _layout의 useEffect가 초기화 완료 전에
  // 의존성 변경으로 재실행되면 initialize가 중복 호출된다(auth/already-initialized).
  private initializing = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.initialized || this.initializing) {
      return;
    }

    this.initializing = true;

    await this.l10n.initialize();
    await this.networkStatus.initialize();
    await this.firebase.initialize();
    // 구독 상태 확인은 앱 시작을 막지 않는다 — 광고 쪽이 `waitUntilResolved`로 짧게 기다린다(SUB-4).
    void this.subscriptionStore.initialize();
    const bagStore = new BagStore(this.firebase);

    this.gearStore = new GearStore(this.firebase);
    this.setBagStore(bagStore);
    this.bagTemplateStore = new BagTemplateStore(this.firebase, this.gearStore);
    this.searchStore = new SearchStore(this.firebase);
    this.communitySearchStore = new CommunitySearchStore();
    this.alertManager = AlertManager.new();
    this.toastManager = ToastManager.new();
    this.logInAlertManager = LogInAlertManager.new(this.firebase);
    this.replyStore = new ReplyStore(this.firebase);
    this.communityStore = new CommunityStore(this.firebase);
    // 코스 뒤집기(GRP-8·BD-11) — 서버가 아니라 기기에 저장하는 보기 설정. 그룹·배낭 코스가
    // 함께 쓰므로 두 스토어에 같은 인스턴스를 넘긴다(코스 모델이 만들어질 때 주입된다).
    const routeDirectionStore = RouteDirectionStore.new();

    // 기기 저장소 복원은 화면을 막지 않는다 — 복원 전에 그려진 코스도 observable이라 곧 따라간다.
    void routeDirectionStore.initialize();
    this.groupStore = new GroupStore(
      this.firebase,
      bagStore,
      routeDirectionStore
    );
    this.bagRouteStore = new BagRouteStore(this.firebase, routeDirectionStore);
    this.bagPointStore = new BagPointStore(this.firebase);
    this.campSpotStore = new CampSpotStore(this.firebase);
    this.feedContentStore = new FeedContentStore(
      this.firebase,
      this.campSpotStore
    );
    // 소모품 추천(CP-1) — 세 자리가 공유한다. 조회는 각 자리가 load()로 시작한다(세션당 1회).
    this.consumableStore = new ConsumableStore(this.firebase);
    this.campReviewStore = new CampReviewStore(this.firebase);
    this.campFavoriteStore = new CampFavoriteStore(this.firebase);
    this.analyticsManager = AnalyticsManager.new();
    // 개발·테스트 빌드 수집 제외 + 채널·OTA 번들 사용자 속성(AN-4/AN-6). 다른 전송보다 먼저 판정한다.
    this.analyticsManager.initialize();
    // Firebase 초기화 중 첫 로그인 확인 때는 analyticsManager가 아직 없어 태깅이 누락되므로,
    // 생성 직후 현재 로그인 사용자로 내부 태그를 1회 반영한다(이후 로그인/로그아웃은 Firebase가 처리).
    this.analyticsManager.identifyUser(this.firebase.getUserId() || null);
    this.notificationManager = NotificationManager.new();
    this.announcementManager = AnnouncementManager.new(this.firebase);
    // config/announcement 실시간 구독을 시작한다(닫음 목록 로드 후 구독, 웹 포함). 실패는 조용히 통과.
    void this.announcementManager.initialize();
    this.forceUpdateManager = ForceUpdateManager.new(this.firebase);
    this.featurePopupManager = FeaturePopupManager.new(this.firebase);
    // config/featurePopup 실시간 구독을 시작한다(닫음 목록 로드 후 구독, 웹 포함). 실패는 조용히 통과(FP-2).
    void this.featurePopupManager.initialize();
    this.gearPreviewStore = GearPreviewStore.new(this.gearStore);
    this.subscriptionNudge = SubscriptionNudge.new(
      this.subscriptionStore,
      this.adService,
      () => {
        openSubscription(SubscriptionEntryPoint.Nudge);
      },
      action => {
        this.analyticsManager?.logClick('subscription_nudge', { action });
      }
    );
    // 첫 여행 만들기 가이드(OB-1) — 판정은 레이아웃이 탭 도착 시 부른다.
    this.onboardingTripManager = OnboardingTripManager.new(
      this.firebase,
      bagStore
    );
    await this.initializeOffline(bagStore);
    this.setInitialized(true);
    this.initializing = false;
  }

  /**
   * 오프라인 저장 (OF-1 · OF-7). 매니페스트는 상세가 처음 그려지기 전에 읽혀 있어야 한다 — 오프라인으로
   * 시작한 앱이 저장본을 바로 열 수 있게 기다린다(AsyncStorage 한 번이라 짧다).
   */
  private async initializeOffline(bagStore: BagStore) {
    const offlineEntitlement = OfflineEntitlement.new(
      this.subscriptionStore,
      this.networkStatus,
      this.firebase
    );
    const offlineTripStore = OfflineTripStore.new({
      firebase: this.firebase,
      bagStore,
      bagRouteStore: this.bagRouteStore!,
      bagPointStore: this.bagPointStore!,
      campSpotStore: this.campSpotStore!,
      groupStore: this.groupStore!,
      networkStatus: this.networkStatus,
      entitlement: offlineEntitlement,
    });

    this.offlineEntitlement = offlineEntitlement;
    this.offlineTripStore = offlineTripStore;

    if (!this.networkStatus.isSupported()) {
      return;
    }

    await offlineEntitlement.initialize();
    await offlineTripStore.initialize();

    // OF-3: 오프라인으로 시작해 로그인 확인을 건너뛰었으면, 연결이 돌아올 때 서버로 다시 확인한다.
    reaction(
      () => this.networkStatus.isOnline(),
      online => {
        if (online) {
          void this.firebase.recheckAfterOffline();
        }
      }
    );
  }

  public getFirebase() {
    return this.firebase;
  }

  public getAdService() {
    return this.adService;
  }

  public getSubscriptionStore() {
    return this.subscriptionStore;
  }

  public getNetworkStatus() {
    return this.networkStatus;
  }

  public getOfflineTripStore() {
    return this.offlineTripStore;
  }

  public getOfflineEntitlement() {
    return this.offlineEntitlement;
  }

  public getSubscriptionNudge() {
    return this.subscriptionNudge;
  }

  public getL10n() {
    return this.l10n;
  }

  public getBagStore() {
    return this.bagStore;
  }

  public getBagTemplateStore() {
    return this.bagTemplateStore;
  }

  public getStore() {
    return this.firebase.getStore();
  }

  private setBagStore(value: BagStore) {
    this.bagStore = value;
  }

  public getGearStore() {
    return this.gearStore;
  }

  public getReplyStore() {
    return this.replyStore;
  }

  public getCommunityStore() {
    return this.communityStore;
  }

  public getGroupStore() {
    return this.groupStore;
  }

  public getBagRouteStore() {
    return this.bagRouteStore;
  }

  public getBagPointStore() {
    return this.bagPointStore;
  }

  public getCommunitySearchStore() {
    return this.communitySearchStore;
  }

  public getCampSpotStore() {
    return this.campSpotStore;
  }

  public getFeedContentStore() {
    return this.feedContentStore;
  }

  public getConsumableStore() {
    return this.consumableStore;
  }

  public getCampReviewStore() {
    return this.campReviewStore;
  }

  public getCampFavoriteStore() {
    return this.campFavoriteStore;
  }

  public getSearchStore() {
    return this.searchStore;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getAlertManager() {
    return this.alertManager;
  }

  public getToastManager() {
    return this.toastManager;
  }

  public getLogInAlertManager() {
    return this.logInAlertManager;
  }

  public getAnalyticsManager() {
    return this.analyticsManager;
  }

  public getNotificationManager() {
    return this.notificationManager;
  }

  public getAnnouncementManager() {
    return this.announcementManager;
  }

  public getForceUpdateManager() {
    return this.forceUpdateManager;
  }

  public getFeaturePopupManager() {
    return this.featurePopupManager;
  }

  public getOnboardingTripManager() {
    return this.onboardingTripManager;
  }

  public getGearPreviewStore() {
    return this.gearPreviewStore;
  }
}

const app = new App();

export default app;
