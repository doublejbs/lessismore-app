import { makeAutoObservable } from 'mobx';
import Firebase from '../firebase/Firebase';
import GearStore from '../store/GearStore';
import GearImageStore from '../store/GearImageStore';
import BagStore from '../store/BagStore';
import SearchStore from '../search/SearchStore';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import LogInAlertManager from '../login/LogInAlertManager';
import ReplyStore from '../store/ReplyStore';
import CampSpotStore from '../store/CampSpotStore';
import CampReviewStore from '../store/CampReviewStore';
import AnalyticsManager from '../analytics/AnalyticsManager';
import NotificationManager from '../notification/NotificationManager';

class App {
  private readonly firebase = new Firebase();
  private gearStore: GearStore | null = null;
  private gearImageStore: GearImageStore | null = null;
  private bagStore: BagStore | null = null;
  private searchStore: SearchStore | null = null;
  private alertManager: AlertManager | null = null;
  private logInAlertManager: LogInAlertManager | null = null;
  private toastManager: ToastManager | null = null;
  private replyStore: ReplyStore | null = null;
  private campSpotStore: CampSpotStore | null = null;
  private campReviewStore: CampReviewStore | null = null;
  private analyticsManager: AnalyticsManager | null = null;
  private notificationManager: NotificationManager | null = null;
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

    await this.firebase.initialize();
    this.gearStore = new GearStore(this.firebase);
    this.gearImageStore = new GearImageStore(this.firebase);
    this.setBagStore(new BagStore(this.firebase));
    this.searchStore = new SearchStore(this.firebase);
    this.alertManager = AlertManager.new();
    this.toastManager = ToastManager.new();
    this.logInAlertManager = LogInAlertManager.new(this.firebase);
    this.replyStore = new ReplyStore(this.firebase);
    this.campSpotStore = new CampSpotStore(this.firebase);
    this.campReviewStore = new CampReviewStore(this.firebase);
    this.analyticsManager = AnalyticsManager.new();
    // Firebase 초기화 중 첫 로그인 확인 때는 analyticsManager가 아직 없어 태깅이 누락되므로,
    // 생성 직후 현재 로그인 사용자로 내부 태그를 1회 반영한다(이후 로그인/로그아웃은 Firebase가 처리).
    this.analyticsManager.identifyUser(this.firebase.getUserId() || null);
    this.notificationManager = NotificationManager.new();
    this.setInitialized(true);
    this.initializing = false;
  }

  public getFirebase() {
    return this.firebase;
  }

  public getBagStore() {
    return this.bagStore;
  }

  public getStore() {
    return this.firebase.getStore();
  }

  public getStorage() {
    return this.firebase.getStorage();
  }

  private setBagStore(value: BagStore) {
    this.bagStore = value;
  }

  public getGearStore() {
    return this.gearStore;
  }

  public getGearImageStore() {
    return this.gearImageStore;
  }

  public getReplyStore() {
    return this.replyStore;
  }

  public getCampSpotStore() {
    return this.campSpotStore;
  }

  public getCampReviewStore() {
    return this.campReviewStore;
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
}

const app = new App();

export default app;
