import { Platform } from 'react-native';
import { isInternalUser } from './InternalUsers';
import { isAnalyticsExcludedBuild } from './AnalyticsEnvironment';
import { getAppVersionInfo } from '@/model/app/AppVersionInfo';

type AnalyticsParams = Record<string, string | number | boolean>;

type FirebaseAnalytics = {
  logEvent: (name: string, params?: AnalyticsParams) => Promise<void>;
  logScreenView: (params: {
    screen_name: string;
    screen_class: string;
  }) => Promise<void>;
  setUserProperty: (name: string, value: string | null) => Promise<void>;
  setUserId: (id: string | null) => Promise<void>;
  setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
};

const CLICK_PREFIX = 'click_';

class AnalyticsManager {
  public static new() {
    return new AnalyticsManager();
  }

  private enabled = Platform.OS !== 'web';
  private currentScreen = '';
  private lastLoggedScreen = '';
  private analytics: FirebaseAnalytics | null = null;

  private constructor() {}

  // App.initialize에서 1회 호출(AN-4/AN-6). 개발·테스트 빌드면 네이티브 수집을 끄고 이후 전송을
  // 전부 no-op으로 만든다. 프로덕션은 수집을 명시적으로 켜(기본값과 동일) 같은 기기에서 개발 빌드가
  // 남긴 영구 비활성 설정을 되돌리고, 채널·OTA 번들을 사용자 속성으로 붙인다.
  public initialize() {
    if (!this.enabled) {
      return;
    }

    const { channel, bundleId } = getAppVersionInfo();
    const excluded = isAnalyticsExcludedBuild(channel);

    void this.send(analytics => analytics.setAnalyticsCollectionEnabled(!excluded));

    if (excluded) {
      this.enabled = false;

      return;
    }

    void this.send(analytics =>
      analytics.setUserProperty('app_channel', channel ?? 'unknown')
    );
    void this.send(analytics =>
      analytics.setUserProperty('ota_bundle', bundleId ?? 'embedded')
    );
  }

  public setCurrentScreen(screen: string) {
    this.currentScreen = screen;
  }

  // 로그인/로그아웃 시 호출: 내부(개발자) 계정이면 `is_internal=true` 사용자 속성을 붙여
  // GA4/Firebase 대시보드에서 내부 트래픽을 필터·제외할 수 있게 한다(수집은 그대로).
  // 일반 계정·로그아웃은 'false'로 되돌려, 기기 재사용 시 속성이 잘못 남지 않게 한다.
  // 또한 로그인한 사용자의 Firebase Auth UID를 GA4 `user_id`로 설정하고, 로그아웃 시 해제한다(AN-7).
  public identifyUser(uid: string | null) {
    if (!this.enabled) {
      return;
    }

    const value = isInternalUser(uid) ? 'true' : 'false';

    void this.send(analytics => analytics.setUserProperty('is_internal', value));
    void this.send(analytics => analytics.setUserId(uid));
  }

  public logClick(element: string, params?: AnalyticsParams) {
    const eventParams: AnalyticsParams = { ...params };

    if (this.currentScreen) {
      eventParams.screen = this.currentScreen;
    }

    this.logEvent(`${CLICK_PREFIX}${this.stripClickPrefix(element)}`, eventParams);
  }

  public logEvent(name: string, params?: AnalyticsParams) {
    if (!this.enabled) {
      return;
    }

    // GA4 이벤트 이름 제한(40자) 위반 시 SDK가 throw해 이벤트가 조용히 유실되므로 잘라서 보낸다.
    const safeName = name.slice(0, 40);

    if (safeName !== name) {
      console.warn(`AnalyticsManager 이벤트 이름 40자 초과: ${name}`); // l10n-ignore: 개발자 로그
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

  // AN-5: 호출부가 접두를 붙여 넘기면 `click_click_*`가 되므로 한 번 떼고 보낸다.
  private stripClickPrefix(element: string) {
    if (!element.startsWith(CLICK_PREFIX)) {
      return element;
    }

    if (__DEV__) {
      console.warn(`AnalyticsManager.logClick에 click_ 접두 없이 넘기세요: ${element}`); // l10n-ignore: 개발자 로그
    }

    return element.slice(CLICK_PREFIX.length);
  }

  private async send(action: (analytics: FirebaseAnalytics) => Promise<void>) {
    try {
      const analytics = this.getAnalytics();

      if (!analytics) {
        return;
      }

      await action(analytics);
    } catch (error) {
      console.warn('AnalyticsManager 전송 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  private getAnalytics(): FirebaseAnalytics | null {
    // enabled가 아니라 플랫폼으로 가른다 — 수집 제외(AN-4) 뒤에도 비활성 설정 전송은 나가야 한다.
    if (Platform.OS === 'web') {
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
