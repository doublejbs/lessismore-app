import dayjs, { Dayjs } from 'dayjs';
import { makeAutoObservable } from 'mobx';
import BagStore from '../store/BagStore';
import { BagLocation } from '../bag-destination/BagLocation';
import weatherService from '../weather/WeatherService';
import { WeatherKind, WeatherSnapshot } from '../weather/WeatherTypes';

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
  private requestGeneration = 0;

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
    this.invalidateRequests();
  }

  private setLocation(value: BagLocation | null) {
    this.location = value;
    this.invalidateRequests();
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

  // 여행 기간(startDate~endDate)에 해당하는 일자만 잘라 반환한다.
  // 스냅샷은 조회 시점의 기간을 담는데, 이후 여행 날짜를 줄이면 옛 기간이 그대로 남을 수 있어
  // (isStale은 경계일 포함만 확인해 재조회를 건너뜀) 표시 단계에서 기간으로 제한한다.
  public getDailyInRange() {
    if (!this.weather) {
      return [];
    }

    const start = this.startDate.format('YYYY-MM-DD');
    const end = this.endDate.format('YYYY-MM-DD');

    return this.weather.daily.filter(d => d.date >= start && d.date <= end);
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

  private invalidateRequests() {
    this.requestGeneration += 1;
    this.setLoading(false);
  }

  // 여행 날짜 변경 시 호출: 기간을 갱신하고 스냅샷이 새 기간을 못 덮으면 재조회한다.
  public async updateTripDates(start: Dayjs, end: Dayjs) {
    this.setDates(start, end);
    await this.ensureFresh();
  }

  // 여행지 저장(DST-6). 저장 결과로 로컬 캐시를 즉시 맞춘 뒤 새 날씨를 조회한다 —
  // 좌표가 바뀌었으면 스토어가 weather를 지워 돌려주므로 이전 위치의 날씨가 곧바로 사라진다.
  // 저장 자체가 실패하면 던져서 기존 location을 유지하고 호출자가 재시도할 수 있게 한다.
  public async updateLocation(location: BagLocation) {
    const result = await this.bagStore.updateLocation(this.bagId, location);

    this.setLocation(location);
    this.setWeather(result.coordinatesChanged ? null : result.weather);
    this.setError(false);

    // 새 좌표·누락·만료 캐시는 즉시 조회하고, 같은 좌표의 유효 캐시는 isStale에서 그대로 유지한다.
    await this.ensureFresh();
  }

  // 오늘 기준 이 여행에 필요한 스냅샷 성격(구간 이동 감지용).
  private desiredKind(): WeatherKind {
    const today = dayjs().startOf('day');
    const start = this.startDate.startOf('day');
    const end = this.endDate.startOf('day');
    // WeatherService의 예보 커버 범위와 일치해야 한다(오늘+16은 API 400 — WeatherService 주석 참고).
    const forecastLow = today.subtract(92, 'day');
    const forecastHigh = today.add(15, 'day');

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
    if (snap.frozen) {
      return false;
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

    const requestGeneration = this.requestGeneration + 1;

    this.requestGeneration = requestGeneration;
    this.setLoading(true);
    this.setError(false);
    try {
      const snapshot = await weatherService.getWeather(
        loc,
        this.startDate,
        this.endDate
      );

      if (requestGeneration !== this.requestGeneration) {
        return;
      }

      const saved = await this.bagStore.updateWeather(this.bagId, loc, snapshot);

      if (!saved || requestGeneration !== this.requestGeneration) {
        return;
      }

      this.setWeather(snapshot);
    } catch (error) {
      console.error('날씨 조회 실패:', error); // l10n-ignore

      if (requestGeneration === this.requestGeneration && !this.weather) {
        this.setError(true);
      }
    } finally {
      if (requestGeneration === this.requestGeneration) {
        this.setLoading(false);
      }
    }
  }
}

export default BagWeather;
