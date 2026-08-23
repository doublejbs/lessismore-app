import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs, { Dayjs } from 'dayjs';
import { Platform } from 'react-native';
import app from '../app/App';

type NotificationData = Record<string, unknown>;

type NotificationSettings = {
  packing: boolean;
  useless: boolean;
  notice: boolean;
};

type ReminderDate = Date | Dayjs;

type NotificationResponse = {
  notification: {
    request: {
      content: {
        data?: NotificationData;
      };
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
  notice: true,
};

const PACKING_IDENTIFIER_SUFFIX = '-packing';

const USELESS_IDENTIFIER_SUFFIX = '-useless';

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

  private constructor() {}

  public async initialize() {
    if (!this.enabled || this.initialized) {
      return;
    }

    this.initialized = true;

    await this.loadSettings();

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

      const granted = await this.requestPermission();

      if (granted && this.settings.notice) {
        await this.subscribeTopic(ALL_TOPIC);
      }
    } catch (error) {
      console.warn('NotificationManager 초기화 실패', error); // l10n-ignore: console 개발자 로그
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
        this.dispatchRoute(this.getRouteFromMessage(message));
      })
    );

    void messaging
      .getInitialNotification()
      .then(message => {
        if (message) {
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
    const content = route ? { title, body, data: { route } } : { title, body };

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
  }

  public async cancelBagReminders(id: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.cancelLocal(this.getPackingIdentifier(id));
    await this.cancelLocal(this.getUselessIdentifier(id));
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
      { route: `/bag/${id}` }
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
      { route: `/useless/${id}` }
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

    this.dispatchRoute(typeof route === 'string' && route ? route : null);
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
