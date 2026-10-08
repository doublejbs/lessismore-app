import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs, { Dayjs } from 'dayjs';
import { Platform } from 'react-native';
import app from '../app/App';
import NotificationType from './NotificationType';
import NotificationPermissionStatus from './NotificationPermissionStatus';
import {
  absorbDelivered,
  EMPTY_REENGAGEMENT_STATE,
  parseReengagementState,
  planReengagement,
  ReengagementPlan,
  ReengagementState,
  ReengagementTrip,
} from './ReengagementPlanner';

type NotificationData = Record<string, unknown>;

type NotificationSettings = {
  packing: boolean;
  useless: boolean;
  // 여행 추천 알림(NT-7 다음 여행 계획 · NT-8 주말 박지 추천)
  reengage: boolean;
  notice: boolean;
};

type ReminderDate = Date | Dayjs;

type NotificationResponse = {
  notification: {
    request: {
      identifier?: string;
      content: {
        data?: NotificationData;
      };
      // 원격 푸시면 type이 'push'다(expo-notifications NotificationTrigger).
      trigger?: { type?: string } | null;
    };
  };
};

type ScheduledNotification = {
  identifier: string;
};

type ExpoNotifications = {
  SchedulableTriggerInputTypes: { DATE: 'date' };
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
  getPermissionsAsync: () => Promise<{
    granted: boolean;
    canAskAgain: boolean;
    // expo-notifications PermissionStatus: 'granted' | 'denied' | 'undetermined'
    status?: string;
  }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  scheduleNotificationAsync: (input: {
    identifier?: string;
    content: { title: string; body: string; data?: NotificationData };
    trigger: { type: 'date'; date: Date } | null;
  }) => Promise<string>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<ScheduledNotification[]>;
  addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponse) => void
  ) => { remove: () => void };
  getLastNotificationResponseAsync: () => Promise<NotificationResponse | null>;
};

type RemoteMessage = {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
};

type Unsubscribe = () => void;

type FirebaseMessaging = {
  subscribeToTopic: (topic: string) => Promise<void>;
  unsubscribeFromTopic: (topic: string) => Promise<void>;
  onMessage: (listener: (message: RemoteMessage) => void) => Unsubscribe;
  onNotificationOpenedApp: (
    listener: (message: RemoteMessage) => void
  ) => Unsubscribe;
  getInitialNotification: () => Promise<RemoteMessage | null>;
};

type ResponseRouteListener = (route: string) => void;

const ALL_TOPIC = 'all';

const SETTINGS_STORAGE_KEY = 'notification-settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  packing: true,
  useless: true,
  reengage: true,
  notice: true,
};

const PACKING_IDENTIFIER_SUFFIX = '-packing';

const USELESS_IDENTIFIER_SUFFIX = '-useless';

const REENGAGEMENT_STATE_STORAGE_KEY = 'notification-reengagement-state';

const NEXT_TRIP_IDENTIFIER = 'reengage-next-trip';

const WEEKEND_IDENTIFIER_PREFIX = 'reengage-weekend-';

// NT-8 체인 최대 건수(WEEKEND_MAX_UNANSWERED)와 같은 수의 고정 식별자 — 저장소 없이 전부 취소할 수 있다.
const WEEKEND_IDENTIFIERS = [1, 2, 3].map(
  index => `${WEEKEND_IDENTIFIER_PREFIX}${index}`
);

const WEEKEND_ROUTE = '/map';

// 배낭 생성·수정 직후 연달아 오는 요청(재예약 루프 등)을 한 번의 동기화로 묶는다(NT-9).
const REENGAGEMENT_SYNC_DEBOUNCE_MS = 800;

const DEV_FIRE_DELAY_MS = 10 * 1000;

const OPEN_LOG_DEDUPE_MS = 3 * 1000;

class NotificationManager {
  public static new() {
    return new NotificationManager();
  }

  private readonly enabled = Platform.OS !== 'web';
  private notifications: ExpoNotifications | null = null;
  private messaging: FirebaseMessaging | null = null;
  private initialized = false;
  private responseRouteListeners: ResponseRouteListener[] = [];
  private messagingUnsubscribers: Unsubscribe[] = [];
  private pendingRoute: string | null = null;
  private settings: NotificationSettings = { ...DEFAULT_SETTINGS };
  private settingsReady: Promise<void> | null = null;
  private reengagementSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private reengagementSyncing = false;
  private reengagementSyncPending = false;
  private lastOpenLoggedAt = 0;
  private initializePromise: Promise<void> | null = null;
  // 시작 시 권한 요청(NT-1)은 세션당 1회 — 레이아웃 effect가 여러 번 불러도 한 번만 한다.
  private launchPermissionHandled = false;

  private constructor() {}

  public initialize(): Promise<void> {
    if (!this.enabled) {
      return Promise.resolve();
    }

    if (!this.initializePromise) {
      this.initializePromise = this.runInitialize();
    }

    return this.initializePromise;
  }

  // 리스너·핸들러 등록과 **이미 허용된 경우의** 후속 처리만 한다. 권한 요청은 하지 않는다 —
  // 요청 시점은 레이아웃이 로그인·약관·첫 여행 가이드 판정을 확인한 뒤 정한다(NT-1, OB-8).
  private async runInitialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.settingsReady = this.loadSettings();

    await this.settingsReady;

    try {
      const notifications = this.getNotifications();

      if (!notifications) {
        return;
      }

      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      notifications.addNotificationResponseReceivedListener(response => {
        this.handleResponse(response);
      });

      const lastResponse =
        await notifications.getLastNotificationResponseAsync();

      if (lastResponse) {
        this.handleResponse(lastResponse);
      }

      this.setupRemoteMessaging(notifications);

      const current = await notifications.getPermissionsAsync();

      if (current.granted) {
        await this.handlePermissionGranted();
      }
    } catch (error) {
      console.warn('NotificationManager 초기화 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  // 권한이 허용된 상태에서 할 후속 처리 — 공지 토픽 구독(설정 ON) + 재방문 리마인더 동기화(NT-5·NT-9).
  private async handlePermissionGranted() {
    if (this.settings.notice) {
      await this.subscribeTopic(ALL_TOPIC);
    }

    this.requestReengagementSync();
  }

  // 시작 시 권한 요청(NT-1 개정, OB-8). 레이아웃이 로그인 + 약관 동의 + 첫 여행 가이드 판정 뒤에
  // 부른다. 세션당 1회이고, 미결정일 때만 OS 대화상자를 띄운다.
  public async requestPermissionAtLaunch(): Promise<void> {
    if (!this.enabled || this.launchPermissionHandled) {
      return;
    }

    this.launchPermissionHandled = true;
    await this.initialize();
    await this.requestPermissionIfUndetermined();
  }

  // 이번 세션의 시작 시 요청을 건너뛴다 — 첫 여행 가이드를 띄운 세션은 가이드 완료 단계가 첫 질문이다(OB-8).
  public skipLaunchPermission(): void {
    this.launchPermissionHandled = true;
  }

  // 맥락 요청(OB-7 `알림 받고 여행 만들기`)과 시작 시 요청이 같이 쓴다. 미결정이 아니면 묻지 않고
  // 현재 상태를 돌려준다 — 어떤 경로로도 두 번 묻지 않는다(OB-8).
  public async requestPermissionIfUndetermined(): Promise<NotificationPermissionStatus> {
    const status = await this.getPermissionStatus();

    if (status !== NotificationPermissionStatus.Undetermined) {
      return status;
    }

    const granted = await this.requestPermission();

    if (granted) {
      await this.handlePermissionGranted();

      return NotificationPermissionStatus.Granted;
    }

    return NotificationPermissionStatus.Denied;
  }

  public async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (!this.enabled) {
      return NotificationPermissionStatus.Unavailable;
    }

    try {
      const notifications = this.getNotifications();

      if (!notifications) {
        return NotificationPermissionStatus.Unavailable;
      }

      const current = await notifications.getPermissionsAsync();

      if (current.granted) {
        return NotificationPermissionStatus.Granted;
      }

      // status가 없는 구버전 응답은 canAskAgain으로 추정한다.
      if (current.status === NotificationPermissionStatus.Undetermined) {
        return NotificationPermissionStatus.Undetermined;
      }

      if (current.status === undefined && current.canAskAgain) {
        return NotificationPermissionStatus.Undetermined;
      }

      return NotificationPermissionStatus.Denied;
    } catch (error) {
      console.warn('NotificationManager 권한 상태 조회 실패', error); // l10n-ignore: console 개발자 로그

      return NotificationPermissionStatus.Unavailable;
    }
  }

  private setupRemoteMessaging(notifications: ExpoNotifications) {
    const messaging = this.getMessaging();

    if (!messaging) {
      return;
    }

    // FCM은 expo-notifications 핸들러/리스너로 잡히지 않아 RNFirebase messaging API를 직접 배선한다.
    this.messagingUnsubscribers.push(
      messaging.onMessage(message => {
        void this.presentForegroundMessage(notifications, message);
      })
    );

    this.messagingUnsubscribers.push(
      messaging.onNotificationOpenedApp(message => {
        this.logOpen(this.getTypeFromMessage(message));
        this.dispatchRoute(this.getRouteFromMessage(message));
      })
    );

    void messaging
      .getInitialNotification()
      .then(message => {
        if (message) {
          this.logOpen(this.getTypeFromMessage(message));
          this.dispatchRoute(this.getRouteFromMessage(message));
        }
      })
      .catch(() => undefined);
  }

  private async presentForegroundMessage(
    notifications: ExpoNotifications,
    message: RemoteMessage
  ): Promise<void> {
    // 포그라운드 FCM은 배너가 뜨지 않으므로 즉시 로컬 알림으로 다시 표시한다.
    // 사용자가 이 로컬 알림을 탭하면 expo 응답 리스너가 route를 처리하므로 여기서 라우팅은 배선하지 않는다.
    const title = message.notification?.title ?? message.data?.title;
    const body = message.notification?.body ?? message.data?.body ?? '';

    if (!title) {
      return;
    }

    const route = message.data?.route;
    // 다시 표시한 로컬 알림을 탭해도 원격 공지로 집계되도록 유형을 싣는다(NT-10).
    const type = this.getTypeFromMessage(message);
    const content = route
      ? { title, body, data: { route, type } }
      : { title, body, data: { type } };

    try {
      await notifications.scheduleNotificationAsync({ content, trigger: null });
    } catch (error) {
      console.warn('NotificationManager 포그라운드 푸시 표시 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private getRouteFromMessage(message: RemoteMessage): string | null {
    const route = message.data?.route;

    return typeof route === 'string' && route ? route : null;
  }

  private getTypeFromMessage(message: RemoteMessage): string {
    const type = message.data?.type;

    return typeof type === 'string' && type ? type : NotificationType.Notice;
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const notifications = this.getNotifications();

      if (!notifications) {
        return false;
      }

      const current = await notifications.getPermissionsAsync();

      if (current.granted) {
        return true;
      }

      if (!current.canAskAgain) {
        return false;
      }

      const requested = await notifications.requestPermissionsAsync();

      return requested.granted;
    } catch (error) {
      console.warn('NotificationManager 권한 요청 실패', error); // l10n-ignore: console 개발자 로그

      return false;
    }
  }

  public async scheduleLocal(
    id: string,
    title: string,
    body: string,
    date: Date,
    data?: NotificationData
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const time = date.getTime();

    // Invalid Date(NaN)는 비교 연산이 모두 false라 과거 검사를 통과해 버리고,
    // 네이티브 trigger로 넘어가면 expo-notifications Swift assertion으로 앱이 크래시한다(NT 엣지 케이스).
    if (!Number.isFinite(time) || time <= Date.now()) {
      return;
    }

    try {
      const notifications = this.getNotifications();

      if (!notifications) {
        return;
      }

      const content = data ? { title, body, data } : { title, body };

      await notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    } catch (error) {
      console.warn('NotificationManager 로컬 알림 예약 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  public async cancelLocal(id: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const notifications = this.getNotifications();

      if (!notifications) {
        return;
      }

      await notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.warn('NotificationManager 로컬 알림 취소 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  public async scheduleBagReminders(
    id: string,
    name: string,
    startDate: ReminderDate,
    endDate: ReminderDate
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.schedulePackingReminder(id, name, startDate);
    await this.scheduleUselessReminder(id, name, endDate);

    // 여행이 생기거나 날짜가 바뀌면 재방문 리마인더 기준도 바뀐다(NT-9).
    this.requestReengagementSync();
  }

  public async cancelBagReminders(id: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.cancelLocal(this.getPackingIdentifier(id));
    await this.cancelLocal(this.getUselessIdentifier(id));

    // 삭제된 여행이 재방문 리마인더 기준이었을 수 있다(NT-9).
    this.requestReengagementSync();
  }

  private async schedulePackingReminder(
    id: string,
    name: string,
    startDate: ReminderDate
  ): Promise<void> {
    const identifier = this.getPackingIdentifier(id);

    await this.cancelLocal(identifier);

    if (!this.settings.packing) {
      return;
    }

    const date = dayjs(startDate)
      .subtract(1, 'day')
      .hour(19)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate();

    await this.scheduleLocal(
      identifier,
      app.getL10n().t('notification.reminder.packingTitle', { name }),
      app.getL10n().t('notification.reminder.packingBody'),
      date,
      { route: `/bag/${id}`, type: NotificationType.Packing }
    );
  }

  private async scheduleUselessReminder(
    id: string,
    name: string,
    endDate: ReminderDate
  ): Promise<void> {
    const identifier = this.getUselessIdentifier(id);

    await this.cancelLocal(identifier);

    if (!this.settings.useless) {
      return;
    }

    const date = dayjs(endDate)
      .add(1, 'day')
      .hour(21)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate();

    await this.scheduleLocal(
      identifier,
      app.getL10n().t('notification.reminder.uselessTitle', { name }),
      app.getL10n().t('notification.reminder.uselessBody'),
      date,
      { route: `/useless/${id}`, type: NotificationType.Useless }
    );
  }

  private getPackingIdentifier(id: string): string {
    return `bag-${id}${PACKING_IDENTIFIER_SUFFIX}`;
  }

  private getUselessIdentifier(id: string): string {
    return `bag-${id}${USELESS_IDENTIFIER_SUFFIX}`;
  }

  public async setPackingEnabled(value: boolean): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.settings = { ...this.settings, packing: value };

    await this.saveSettings();

    if (value) {
      await this.rescheduleBagReminders();
    } else {
      await this.cancelReminders(PACKING_IDENTIFIER_SUFFIX);
    }
  }

  public async setUselessEnabled(value: boolean): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.settings = { ...this.settings, useless: value };

    await this.saveSettings();

    if (value) {
      await this.rescheduleBagReminders();
    } else {
      await this.cancelReminders(USELESS_IDENTIFIER_SUFFIX);
    }
  }

  public async setReengageEnabled(value: boolean): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.settings = { ...this.settings, reengage: value };

    await this.saveSettings();

    await this.syncReengagementReminders();
  }

  /**
   * 재방문 리마인더(NT-7·NT-8) 동기화를 디바운스해 요청한다(NT-9).
   * 앱 시작·포그라운드·로그인 변화·배낭 변경 직후에 부른다. 웹은 no-op.
   */
  public requestReengagementSync(): void {
    if (!this.enabled) {
      return;
    }

    if (this.reengagementSyncTimer) {
      clearTimeout(this.reengagementSyncTimer);
    }

    this.reengagementSyncTimer = setTimeout(() => {
      this.reengagementSyncTimer = null;
      void this.syncReengagementReminders();
    }, REENGAGEMENT_SYNC_DEBOUNCE_MS);
  }

  // 현재 배낭 목록 → 계획 → 기존 reengage-* 취소 후 재예약. 멱등이며 동시에 한 번만 돈다.
  public async syncReengagementReminders(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (this.reengagementSyncing) {
      this.reengagementSyncPending = true;

      return;
    }

    this.reengagementSyncing = true;

    try {
      await this.runReengagementSync();
    } catch (error) {
      console.warn('NotificationManager 재방문 리마인더 동기화 실패', error); // l10n-ignore: console 개발자 로그
    } finally {
      this.reengagementSyncing = false;
    }

    if (this.reengagementSyncPending) {
      this.reengagementSyncPending = false;
      await this.syncReengagementReminders();
    }
  }

  private async runReengagementSync(): Promise<void> {
    // 초기화(설정 로드) 전에는 토글 값을 모른다 — 초기화가 끝나면 다시 요청된다.
    if (!this.settingsReady) {
      return;
    }

    await this.settingsReady;

    const now = Date.now();
    const state = absorbDelivered(await this.loadReengagementState(), now);

    if (!(await this.canScheduleReengagement())) {
      await this.cancelReengagementReminders();
      await this.saveReengagementState({
        ...state,
        nextTrip: null,
        weekendFireAts: [],
      });

      return;
    }

    const trips = await this.fetchReengagementTrips();

    // 조회 실패(오프라인 등)는 빈 목록과 다르다 — 기존 예약을 그대로 두고 다음 동기화로 미룬다.
    if (!trips) {
      return;
    }

    const plan = planReengagement(trips, state, now);

    await this.applyReengagementPlan(plan);
    await this.saveReengagementState({
      ...state,
      nextTrip: plan.nextTrip
        ? { key: plan.nextTrip.key, fireAt: plan.nextTrip.fireAt }
        : null,
      weekendFireAts: plan.weekendFireAts,
    });
  }

  // 설정 ON + OS 권한 허용 + 로그인. 권한은 조회만 하고 요청하지 않는다(NT-9).
  private async canScheduleReengagement(): Promise<boolean> {
    if (!this.settings.reengage || !app.getFirebase().isLoggedIn()) {
      return false;
    }

    const notifications = this.getNotifications();

    if (!notifications) {
      return false;
    }

    const permission = await notifications.getPermissionsAsync();

    return permission.granted;
  }

  private async fetchReengagementTrips(): Promise<ReengagementTrip[] | null> {
    const bagStore = app.getBagStore();

    if (!bagStore) {
      return null;
    }

    try {
      const bags = await bagStore.getListOrThrow();

      return bags.flatMap(bag => {
        const start = bag.getTripStart();
        const end = bag.getTripEnd();

        if (!start || !end) {
          return [];
        }

        return [
          {
            id: bag.getID(),
            name: bag.getName(),
            startMs: start.valueOf(),
            endMs: end.valueOf(),
          },
        ];
      });
    } catch (error) {
      console.warn('NotificationManager 재방문 리마인더 배낭 조회 실패', error); // l10n-ignore: console 개발자 로그

      return null;
    }
  }

  private async applyReengagementPlan(plan: ReengagementPlan): Promise<void> {
    await this.cancelReengagementReminders();

    if (plan.nextTrip) {
      await this.scheduleNextTripReminder(
        NEXT_TRIP_IDENTIFIER,
        plan.nextTrip.tripId,
        plan.nextTrip.tripName,
        new Date(plan.nextTrip.fireAt)
      );
    }

    for (const [index, fireAt] of plan.weekendFireAts.entries()) {
      const identifier = WEEKEND_IDENTIFIERS[index];

      if (!identifier) {
        break;
      }

      await this.scheduleWeekendReminder(identifier, new Date(fireAt));
    }
  }

  private async scheduleNextTripReminder(
    identifier: string,
    tripId: string,
    tripName: string,
    date: Date
  ): Promise<void> {
    await this.scheduleLocal(
      identifier,
      app.getL10n().t('notification.reminder.nextTripTitle'),
      app.getL10n().t('notification.reminder.nextTripBody'),
      date,
      {
        route: this.getNextTripRoute(tripId, tripName),
        type: NotificationType.NextTrip,
      }
    );
  }

  private async scheduleWeekendReminder(
    identifier: string,
    date: Date
  ): Promise<void> {
    await this.scheduleLocal(
      identifier,
      app.getL10n().t('notification.reminder.weekendCampTitle'),
      app.getL10n().t('notification.reminder.weekendCampBody'),
      date,
      { route: WEEKEND_ROUTE, type: NotificationType.WeekendCamp }
    );
  }

  // 지난 여행을 원본으로 한 배낭 복사 폼(BD-8)으로 보낸다(NT-7).
  private getNextTripRoute(tripId: string, tripName: string): string {
    const query = [
      `sourceId=${encodeURIComponent(tripId)}`,
      `sourceName=${encodeURIComponent(tripName)}`,
      'entrySource=notification',
    ].join('&');

    return `/bag-copy?${query}`;
  }

  private async cancelReengagementReminders(): Promise<void> {
    await this.cancelLocal(NEXT_TRIP_IDENTIFIER);

    for (const identifier of WEEKEND_IDENTIFIERS) {
      await this.cancelLocal(identifier);
    }
  }

  private async loadReengagementState(): Promise<ReengagementState> {
    try {
      const stored = await AsyncStorage.getItem(REENGAGEMENT_STATE_STORAGE_KEY);

      return stored
        ? parseReengagementState(JSON.parse(stored))
        : { ...EMPTY_REENGAGEMENT_STATE };
    } catch (error) {
      console.warn('NotificationManager 재방문 리마인더 상태 로드 실패', error); // l10n-ignore: console 개발자 로그

      return { ...EMPTY_REENGAGEMENT_STATE };
    }
  }

  private async saveReengagementState(state: ReengagementState): Promise<void> {
    try {
      await AsyncStorage.setItem(
        REENGAGEMENT_STATE_STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn('NotificationManager 재방문 리마인더 상태 저장 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  // 개발 빌드 전용(NT-9): 재방문 리마인더를 10초 뒤 실제 문구·딥링크로 발송한다. 저장 상태는 바꾸지 않는다.
  public async debugFireReengagement(type: NotificationType): Promise<void> {
    if (!__DEV__ || !this.enabled) {
      return;
    }

    const date = new Date(Date.now() + DEV_FIRE_DELAY_MS);

    if (type === NotificationType.WeekendCamp) {
      await this.scheduleWeekendReminder('dev-reengage-weekend', date);

      return;
    }

    const trips = (await this.fetchReengagementTrips()) ?? [];
    const latest = [...trips].sort((a, b) => b.endMs - a.endMs)[0];

    if (!latest) {
      console.warn('NotificationManager DEV: 배낭이 없어 다음 여행 알림을 보낼 수 없음'); // l10n-ignore: console 개발자 로그

      return;
    }

    await this.scheduleNextTripReminder(
      'dev-reengage-next-trip',
      latest.id,
      latest.name,
      date
    );
  }

  // 개발 빌드 전용(NT-9): 저장 상태와 OS에 예약된 reengage-* 목록을 콘솔에 출력한다.
  public async debugLogReengagement(): Promise<void> {
    if (!__DEV__ || !this.enabled) {
      return;
    }

    await this.syncReengagementReminders();

    const state = await this.loadReengagementState();
    const scheduled =
      (await this.getNotifications()?.getAllScheduledNotificationsAsync()) ??
      [];
    const formatTime = (time: number) =>
      dayjs(time).format('YYYY-MM-DD ddd HH:mm');

    console.warn(
      'NotificationManager DEV 재방문 리마인더', // l10n-ignore: console 개발자 로그
      JSON.stringify(
        {
          nextTrip: state.nextTrip
            ? { ...state.nextTrip, at: formatTime(state.nextTrip.fireAt) }
            : null,
          weekend: state.weekendFireAts.map(formatTime),
          deliveredNextTripKeys: state.deliveredNextTripKeys,
          lastWeekendDeliveredAt: state.lastWeekendDeliveredAt
            ? formatTime(state.lastWeekendDeliveredAt)
            : null,
          scheduled: scheduled
            .map(notification => notification.identifier)
            .filter(identifier => identifier.startsWith('reengage-')),
        },
        null,
        2
      )
    );
  }

  public async setNoticeEnabled(value: boolean): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.settings = { ...this.settings, notice: value };

    await this.saveSettings();

    if (value) {
      await this.subscribeTopic(ALL_TOPIC);
    } else {
      await this.unsubscribeTopic(ALL_TOPIC);
    }
  }

  private async rescheduleBagReminders(): Promise<void> {
    try {
      const bags = (await app.getBagStore()?.getList()) ?? [];

      for (const bag of bags) {
        await this.scheduleBagReminders(
          bag.getID(),
          bag.getName(),
          dayjs(bag.getStartDate()),
          dayjs(bag.getEndDate())
        );
      }
    } catch (error) {
      console.warn('NotificationManager 리마인더 재예약 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private async cancelReminders(suffix: string): Promise<void> {
    try {
      const notifications = this.getNotifications();

      if (!notifications) {
        return;
      }

      const scheduled = await notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduled) {
        if (notification.identifier.endsWith(suffix)) {
          await this.cancelLocal(notification.identifier);
        }
      }
    } catch (error) {
      console.warn('NotificationManager 리마인더 취소 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private async loadSettings(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<NotificationSettings>;

      this.settings = { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      console.warn('NotificationManager 설정 로드 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  private async saveSettings(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(this.settings)
      );
    } catch (error) {
      console.warn('NotificationManager 설정 저장 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  public async subscribeTopic(topic: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const messaging = this.getMessaging();

      if (!messaging) {
        return;
      }

      await messaging.subscribeToTopic(topic);
    } catch (error) {
      console.warn('NotificationManager 토픽 구독 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  public async unsubscribeTopic(topic: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const messaging = this.getMessaging();

      if (!messaging) {
        return;
      }

      await messaging.unsubscribeFromTopic(topic);
    } catch (error) {
      console.warn('NotificationManager 토픽 구독 해제 실패', error); // l10n-ignore: console 개발자 로그
    }
  }

  public addResponseRouteListener(listener: ResponseRouteListener) {
    this.responseRouteListeners.push(listener);

    if (this.pendingRoute) {
      const route = this.pendingRoute;
      this.pendingRoute = null;

      listener(route);
    }

    return () => {
      this.responseRouteListeners = this.responseRouteListeners.filter(
        current => current !== listener
      );
    };
  }

  private handleResponse(response: NotificationResponse) {
    const route = response.notification.request.content.data?.route;

    this.logOpen(this.getTypeFromResponse(response));
    this.dispatchRoute(typeof route === 'string' && route ? route : null);
  }

  // data.type 우선, 없으면(NT-10 이전 예약분) 식별자 접미사로 추정한다.
  private getTypeFromResponse(response: NotificationResponse): string {
    const { identifier, content, trigger } = response.notification.request;
    const type = content.data?.type;

    if (typeof type === 'string' && type) {
      return type;
    }

    if (identifier?.endsWith(PACKING_IDENTIFIER_SUFFIX)) {
      return NotificationType.Packing;
    }

    if (identifier?.endsWith(USELESS_IDENTIFIER_SUFFIX)) {
      return NotificationType.Useless;
    }

    // 원격 푸시를 expo 리스너가 받은 경우 — RNFirebase 경로와 같이 `notice`로 본다(NT-10).
    if (trigger?.type === 'push') {
      return NotificationType.Notice;
    }

    return NotificationType.Unknown;
  }

  // 한 번의 탭이 여러 경로로 들어올 수 있다 — 콜드 스타트에서 응답 리스너와
  // getLastNotificationResponseAsync가 같은 응답을, 원격 푸시는 RNFirebase와 expo 리스너가
  // 함께 받는다. NT-10의 "1회"를 지키려고 짧은 창 안의 두 번째 열기는 보내지 않는다
  // (경로마다 유형 추정이 다를 수 있어 유형과 무관하게 묶는다).
  private logOpen(type: string) {
    const now = Date.now();

    if (now - this.lastOpenLoggedAt < OPEN_LOG_DEDUPE_MS) {
      return;
    }

    this.lastOpenLoggedAt = now;
    app.getAnalyticsManager()?.logEvent('notification_open', { type });
  }

  private dispatchRoute(route: string | null) {
    if (!route) {
      return;
    }

    if (this.responseRouteListeners.length === 0) {
      this.pendingRoute = route;

      return;
    }

    this.responseRouteListeners.forEach(listener => {
      listener(route);
    });
  }

  private getNotifications(): ExpoNotifications | null {
    if (!this.enabled) {
      return null;
    }

    if (this.notifications) {
      return this.notifications;
    }

    // expo-notifications가 웹 번들에 포함되면 웹 빌드가 깨지므로 네이티브에서만 동적 로드한다.
    this.notifications = require('expo-notifications') as ExpoNotifications;

    return this.notifications;
  }

  private getMessaging(): FirebaseMessaging | null {
    if (!this.enabled) {
      return null;
    }

    if (this.messaging) {
      return this.messaging;
    }

    // RNFirebase messaging이 웹 번들에 포함되면 웹 빌드가 깨지므로 네이티브에서만 동적 로드한다.
    const messagingModule = require('@react-native-firebase/messaging') as {
      default?: () => FirebaseMessaging;
    } & (() => FirebaseMessaging);
    const getMessaging = messagingModule.default ?? messagingModule;

    this.messaging = getMessaging();

    return this.messaging;
  }
}

export default NotificationManager;
