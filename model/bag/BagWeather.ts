import dayjs, { Dayjs } from 'dayjs';
import { makeAutoObservable } from 'mobx';
import BagStore from '../store/BagStore';
import weatherService from '../weather/WeatherService';
import {
  BagLocation,
  WeatherKind,
  WeatherSnapshot,
} from '../weather/WeatherTypes';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FORECAST_TTL = 3 * HOUR;
const NORMAL_TTL = 7 * DAY;

/**
 * 배낭 하나의 여행지 위치 + 날씨 스냅샷을 담당하는 모델(BagMemo와 유사한 경량 모델).
 * 상세 화면 카드는 BagDetail이 hydrate해 공유하고, 날씨 편집 화면은 load()로 단독 사용한다.
 * 캐시 신선도(위치 변경/날짜 미커버/구간 이동/TTL)를 판단해 필요할 때만 재조회·저장한다.
 */
class BagWeather {
  public static of(bagId: string, bagStore: BagStore) {
    return new BagWeather(bagId, bagStore);
  }

  private location: BagLocation | null = null;
  private weather: WeatherSnapshot | null = null;
  private startDate: Dayjs = dayjs();
  private endDate: Dayjs = dayjs();
  private loading = false;
  private error = false;

  private constructor(
    private readonly bagId: string,
    private readonly bagStore: BagStore
  ) {
    makeAutoObservable(this);
  }

  // 날씨 화면 단독 사용: 배낭 문서에서 직접 로드 후 신선도 갱신.
  public async load() {
    const { startDate, endDate, location, weather } =
      await this.bagStore.getBagWeatherData(this.bagId);
    if (startDate && endDate) {
      this.setDates(dayjs(startDate), dayjs(endDate));
    }
    this.setLocation(location);
    this.setWeather(weather);
    await this.ensureFresh();
  }

  // BagDetail이 이미 읽은 데이터를 주입(중복 문서 읽기 방지).
  public hydrate(
    location: BagLocation | null,
    weather: WeatherSnapshot | null,
    startDate: Dayjs,
    endDate: Dayjs
  ) {
    this.setLocation(location);
    this.setWeather(weather);
    this.setDates(startDate, endDate);
  }

  private setDates(start: Dayjs, end: Dayjs) {
    this.startDate = start;
    this.endDate = end;
  }

  private setLocation(value: BagLocation | null) {
    this.location = value;
  }

  public getLocation() {
    return this.location;
  }

  public hasLocation() {
    return this.location !== null;
  }

  private setWeather(value: WeatherSnapshot | null) {
    this.weather = value;
  }

  public getWeather() {
    return this.weather;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  private setError(value: boolean) {
    this.error = value;
  }

  public hasError() {
    return this.error;
  }

  public getStartDate() {
    return this.startDate;
  }

  public getEndDate() {
    return this.endDate;
  }

  // 지명 검색(지오코딩) 위임.
  public async searchLocations(name: string) {
    return weatherService.geocode(name);
  }

  // 위치를 저장하고 좌표 변경으로 스냅샷을 무효화 → 즉시 재조회.
  public async updateLocation(location: BagLocation) {
    await this.bagStore.updateLocation(this.bagId, location);
    this.setLocation(location);
    await this.ensureFresh();
  }

  // 오늘 기준 이 여행에 필요한 스냅샷 성격(구간 이동 감지용).
  private desiredKind(): WeatherKind {
    const today = dayjs().startOf('day');
    const start = this.startDate.startOf('day');
    const end = this.endDate.startOf('day');
    const forecastLow = today.subtract(92, 'day');
    const forecastHigh = today.add(16, 'day');

    const kinds = new Set<WeatherKind>();
    if (start.isBefore(forecastLow)) {
      kinds.add('archive');
    }
    if (!start.isAfter(forecastHigh) && !end.isBefore(forecastLow)) {
      kinds.add('forecast');
    }
    if (end.isAfter(forecastHigh)) {
      kinds.add('normal');
    }
    return kinds.size === 1 ? [...kinds][0] : 'mixed';
  }

  private isStale(): boolean {
    const snap = this.weather;
    const loc = this.location;
    if (!snap || !loc) {
      return true;
    }
    if (snap.latitude !== loc.latitude || snap.longitude !== loc.longitude) {
      return true;
    }
    const dates = new Set(snap.daily.map(d => d.date));
    if (
      !dates.has(this.startDate.format('YYYY-MM-DD')) ||
      !dates.has(this.endDate.format('YYYY-MM-DD'))
    ) {
      return true;
    }
    if (snap.kind !== this.desiredKind()) {
      return true;
    }
    if (snap.frozen) {
      return false;
    }
    const ttl =
      snap.kind === 'forecast' || snap.kind === 'mixed'
        ? FORECAST_TTL
        : NORMAL_TTL;
    return Date.now() - new Date(snap.fetchedAt).getTime() > ttl;
  }

  // 필요 시에만 날씨를 조회·저장한다.
  public async ensureFresh() {
    const loc = this.location;
    if (!loc || !this.isStale()) {
      return;
    }
    this.setLoading(true);
    this.setError(false);
    try {
      const snapshot = await weatherService.getWeather(
        loc,
        this.startDate,
        this.endDate
      );
      await this.bagStore.updateWeather(this.bagId, snapshot);
      this.setWeather(snapshot);
    } catch (error) {
      console.error('날씨 조회 실패:', error);
      if (!this.weather) {
        this.setError(true);
      }
    } finally {
      this.setLoading(false);
    }
  }
}

export default BagWeather;
