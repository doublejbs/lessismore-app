import { makeAutoObservable } from 'mobx';
import { Alert, Linking, Platform } from 'react-native';
import { Router } from 'expo-router';
import app from '../app/App';
import Firebase from '../firebase/Firebase';
import ToastManager from '../toast/ToastManager';
import LogInAlertManager from '../login/LogInAlertManager';
import AnalyticsManager from '../analytics/AnalyticsManager';
import BagItem from '../bag/BagItem';
import CampSiteDetailDispatcher from './CampSiteDetailDispatcher';
import { CampSpot } from './CampSpotTypes';
import { WeatherDaily } from '../weather/WeatherTypes';

// 박지 상세 도메인 모델 (CampSite CS-3/CS-4/CS-5).
// 3단 래퍼(라우트 → Wrapper → View) 중 상태·비즈니스 로직을 담당한다.
class CampSiteDetail {
  public static new(router: Router, dispatcher: CampSiteDetailDispatcher) {
    return new CampSiteDetail(
      router,
      dispatcher,
      app.getFirebase(),
      app.getToastManager()!,
      app.getLogInAlertManager()!,
      app.getAnalyticsManager()
    );
  }

  private spot: CampSpot | null = null;
  private initialized = false;
  private weather: WeatherDaily[] | null = null;
  private bags: BagItem[] = [];
  private showBagSheet = false;

  private constructor(
    private readonly router: Router,
    private readonly dispatcher: CampSiteDetailDispatcher,
    private readonly firebase: Firebase,
    private readonly toastManager: ToastManager,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly analyticsManager: AnalyticsManager | null
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    this.setInitialized(false);

    try {
      const spot = await this.dispatcher.getSpot(id);

      if (!spot) {
        throw new Error(`camp-spot not found: ${id}`);
      }

      this.setSpot(spot);
      this.analyticsManager?.logClick('camp_site');
      this.setInitialized(true);

      void this.loadWeather(spot);
    } catch (e) {
      console.error('박지 상세 로드 실패:', e);
      Alert.alert('알림', '박지 정보를 불러오지 못했어요.', [
        { text: '확인', onPress: () => this.close() },
      ]);
    }
  }

  // 주간 날씨(CS-3). 실패/빈 값이면 섹션을 생략하도록 null 을 유지한다(조용히).
  private async loadWeather(spot: CampSpot) {
    try {
      const daily = await this.dispatcher.getWeeklyWeather({
        name: spot.name,
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
      });

      this.setWeather(daily.length > 0 ? daily : null);
    } catch (e) {
      console.error('박지 날씨 조회 실패:', e);
      this.setWeather(null);
    }
  }

  private setSpot(value: CampSpot | null) {
    this.spot = value;
  }

  public getSpot() {
    return this.spot;
  }

  private setWeather(value: WeatherDaily[] | null) {
    this.weather = value;
  }

  public getWeather() {
    return this.weather;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public close() {
    this.router.back();
  }

  // 길찾기(CS-3): 외부 지도앱을 좌표로 연다. 실패는 조용히 무시.
  public async openDirections() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    this.analyticsManager?.logClick('camp_site_directions');

    const { latitude, longitude } = spot.location;
    const url =
      Platform.OS === 'ios'
        ? `maps://?ll=${latitude},${longitude}&q=${encodeURIComponent(spot.name)}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${spot.name})`;

    try {
      await Linking.openURL(url);
    } catch {
      // 외부 지도앱 열기 실패는 조용히 무시
    }
  }

  // 배낭 여행지로 설정 버튼(CS-5). 비로그인·배낭 0개는 눌렀을 때 안내한다.
  public async openBagSheet() {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    const bags = await this.dispatcher.getBags();

    if (bags.length === 0) {
      this.toastManager.show({ message: '설정할 배낭이 없어요.' });
      return;
    }

    this.setBags(bags);
    this.setShowBagSheet(true);
  }

  public closeBagSheet() {
    this.setShowBagSheet(false);
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public getBags() {
    return this.bags;
  }

  private setShowBagSheet(value: boolean) {
    this.showBagSheet = value;
  }

  public shouldShowBagSheet() {
    return this.showBagSheet;
  }

  // 선택한 배낭의 location 에 박지 좌표를 저장한다(CS-5).
  public async selectBag(bag: BagItem) {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    await this.dispatcher.setBagLocation(bag.getID(), {
      name: spot.name,
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
    });

    this.toastManager.show({ message: '여행지로 설정했어요.' });
    this.closeBagSheet();
  }
}

export default CampSiteDetail;
