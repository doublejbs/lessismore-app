import { makeAutoObservable } from 'mobx';
import CampSiteWeatherDispatcher from './CampSiteWeatherDispatcher';
import { CampSpot } from './CampSpotTypes';
import { WeatherDaily } from '../weather/WeatherTypes';

// 박지 상세 '날씨' 탭(CampSite CS-3)의 주간 예보 상태·비즈니스 로직.
// 박지는 상세가 이미 로드해 뒀으므로 id로 다시 조회하지 않고 spot을 받아 초기화한다.
class CampSiteWeather {
  public static from(dispatcher: CampSiteWeatherDispatcher) {
    return new CampSiteWeather(dispatcher);
  }

  private spot: CampSpot | null = null;
  private initialized = false;
  private loading = false;
  private weather: WeatherDaily[] | null = null;
  private error = false;

  private constructor(private readonly dispatcher: CampSiteWeatherDispatcher) {
    makeAutoObservable(this);
  }

  // 날씨 탭 첫 진입에만 조회한다(CS-3) — 이후 탭을 오가도 조회 결과를 재사용한다.
  public async initialize(spot: CampSpot) {
    if (this.initialized) {
      return;
    }

    this.setSpot(spot);
    this.setInitialized(true);

    await this.loadWeather(spot);
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

  // 실패 시 재시도(CS-3).
  public async retry() {
    const spot = this.spot;

    if (!spot) {
      return;
    }

    await this.loadWeather(spot);
  }

  private setSpot(value: CampSpot | null) {
    this.spot = value;
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
}

export default CampSiteWeather;
