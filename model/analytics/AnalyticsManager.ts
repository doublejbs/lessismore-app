import { Platform } from 'react-native';

type AnalyticsParams = Record<string, string | number | boolean>;

type FirebaseAnalytics = {
  logEvent: (name: string, params?: AnalyticsParams) => Promise<void>;
  logScreenView: (params: {
    screen_name: string;
    screen_class: string;
  }) => Promise<void>;
};

class AnalyticsManager {
  public static new() {
    return new AnalyticsManager();
  }

  private readonly enabled = Platform.OS !== 'web';
  private currentScreen = '';
  private lastLoggedScreen = '';
  private analytics: FirebaseAnalytics | null = null;

  private constructor() {}

  public setCurrentScreen(screen: string) {
    this.currentScreen = screen;
  }

  public logClick(element: string, params?: AnalyticsParams) {
    const eventParams: AnalyticsParams = { ...params };

    if (this.currentScreen) {
      eventParams.screen = this.currentScreen;
    }

    this.logEvent(`click_${element}`, eventParams);
  }

  public logEvent(name: string, params?: AnalyticsParams) {
    if (!this.enabled) {
      return;
    }

    // GA4 이벤트 이름 제한(40자) 위반 시 SDK가 throw해 이벤트가 조용히 유실되므로 잘라서 보낸다.
    const safeName = name.slice(0, 40);

    if (safeName !== name) {
      console.warn(`AnalyticsManager 이벤트 이름 40자 초과: ${name}`);
    }

    void this.send(analytics => analytics.logEvent(safeName, params));
  }

  public logScreenView(screenName: string) {
    if (!this.enabled) {
      return;
    }

    // 같은 화면 연속 중복 전송 방지
    if (screenName === this.lastLoggedScreen) {
      return;
    }

    this.lastLoggedScreen = screenName;
    this.setCurrentScreen(screenName);
    void this.send(analytics =>
      analytics.logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      })
    );
  }

  private async send(action: (analytics: FirebaseAnalytics) => Promise<void>) {
    try {
      const analytics = this.getAnalytics();

      if (!analytics) {
        return;
      }

      await action(analytics);
    } catch (error) {
      console.warn('AnalyticsManager 전송 실패', error);
    }
  }

  private getAnalytics(): FirebaseAnalytics | null {
    if (!this.enabled) {
      return null;
    }

    if (this.analytics) {
      return this.analytics;
    }

    // RNFirebase 모듈이 웹 번들에 포함되면 웹 빌드가 깨지므로 네이티브에서만 동적 로드한다.
    const analyticsModule = require('@react-native-firebase/analytics');
    const getAnalytics = analyticsModule.default ?? analyticsModule;

    this.analytics = getAnalytics() as FirebaseAnalytics;

    return this.analytics;
  }
}

export default AnalyticsManager;
