import { makeAutoObservable } from 'mobx';
import { Alert } from 'react-native';
import { Router } from 'expo-router';
import CampSiteWeatherDispatcher from './CampSiteWeatherDispatcher';
import { CampSpot } from './CampSpotTypes';
import { WeatherDaily } from '../weather/WeatherTypes';

// 박지 주간 날씨 전용 페이지 도메인 모델 (CampSite CS-3).
// 상세(CampSiteDetail)에서 분리된 별도 라우트 /camp-site-weather/{id} 의 상태·비즈니스 로직을 담당한다.
// 3단 래퍼(라우트 → Wrapper → View) 중 상태·비즈니스 로직을 담당한다.
class CampSiteWeather {
  public static from(router: Router, dispatcher: CampSiteWeatherDispatcher) {
    return new CampSiteWeather(router, dispatcher);
  }

  private id = '';
  private spot: CampSpot | null = null;
  private initialized = false;
  private loading = false;
  private weather: WeatherDaily[] | null = null;
  private error = false;

  private constructor(
    private readonly router: Router,
    private readonly dispatcher: CampSiteWeatherDispatcher
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    this.setId(id);
    this.setInitialized(false);

    try {
      const spot = await this.dispatcher.getSpot(id);

      if (!spot) {
        throw new Error(`camp-spot not found: ${id}`);
      }

      this.setSpot(spot);
      this.setInitialized(true);

      void this.loadWeather(spot);
    } catch (e) {
      console.error('박지 날씨 페이지 로드 실패:', e);
      Alert.alert('알림', '박지 정보를 불러오지 못했어요.', [
        { text: '확인', onPress: () => this.close() },
      ]);
    }
  }

  // 박지 좌표로 주간 예보를 조회한다(CS-3). 실패/빈 값이면 에러 상태로 두어 재시도를 노출한다.
  private async loadWeather(spot: CampSpot) {
    this.setLoading(true);
    this.setError(false);

    try {
      const daily = await this.dispatcher.getWeeklyWeather({
        name: spot.name,
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
      });

      if (daily.length === 0) {
        this.setWeather(null);
        this.setError(true);
      } else {
        this.setWeather(daily);
      }
    } catch (e) {
      console.error('박지 날씨 조회 실패:', e);
      this.setWeather(null);
      this.setError(true);
    } finally {
      this.setLoading(false);
    }
  }

  // 실패 시 재시도(CS-3). spot 이 있으면 날씨만, 없으면 처음부터 다시 로드한다.
  public async retry() {
    const spot = this.spot;

    if (spot) {
      await this.loadWeather(spot);
    } else {
      await this.initialize(this.id);
    }
  }

  private setId(value: string) {
    this.id = value;
  }

  private setSpot(value: CampSpot | null) {
    this.spot = value;
  }

  public getSpot() {
    return this.spot;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  private setWeather(value: WeatherDaily[] | null) {
    this.weather = value;
  }

  public getWeather() {
    return this.weather;
  }

  private setError(value: boolean) {
    this.error = value;
  }

  public hasError() {
    return this.error;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public close() {
    // 딥링크로 첫 화면으로 열린 경우 돌아갈 화면이 없어 back()이 실패하므로 지도 탭으로 보낸다.
    if (this.router.canGoBack()) {
      this.router.back();
    } else {
      this.router.replace('/map');
    }
  }
}

export default CampSiteWeather;
