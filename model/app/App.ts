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
  private analyticsManager: AnalyticsManager | null = null;
  private notificationManager: NotificationManager | null = null;
  private initialized = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
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
    this.analyticsManager = AnalyticsManager.new();
    this.notificationManager = NotificationManager.new();
    this.setInitialized(true);
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
