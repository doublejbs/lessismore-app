import dayjs from 'dayjs';
import app from '../app/App';
import CampSpotStore from '../store/CampSpotStore';
import BagStore from '../store/BagStore';
import BagItem from '../bag/BagItem';
import weatherService from '../weather/WeatherService';
import { CampSpot } from './CampSpotTypes';
import { BagLocation, WeatherDaily } from '../weather/WeatherTypes';

// 주간 날씨 조회 범위: 오늘 포함 7일.
const WEEKLY_DAYS = 6;

// 박지 상세(CampSite CS-3/CS-5)의 데이터 접근을 캡슐화한다.
class CampSiteDetailDispatcher {
  public static new() {
    return new CampSiteDetailDispatcher(
      app.getCampSpotStore()!,
      app.getBagStore()!
    );
  }

  private constructor(
    private readonly campSpotStore: CampSpotStore,
    private readonly bagStore: BagStore
  ) {}

  public async getSpot(id: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(id);
  }

  // 박지 좌표로 오늘부터 7일치 예보를 조회한다(CS-3 주간 날씨).
  public async getWeeklyWeather(
    location: BagLocation
  ): Promise<WeatherDaily[]> {
    const start = dayjs().startOf('day');
    const end = start.add(WEEKLY_DAYS, 'day');
    const snapshot = await weatherService.getWeather(location, start, end);

    return snapshot.daily;
  }

  public async getBags(): Promise<BagItem[]> {
    return this.bagStore.getList();
  }

  // 배낭 여행지로 저장(CS-5). 날씨 스냅샷 갱신은 기존 BagWeather 흐름에 위임한다.
  public async setBagLocation(
    bagId: string,
    location: BagLocation
  ): Promise<void> {
    await this.bagStore.updateLocation(bagId, location);
  }
}

export default CampSiteDetailDispatcher;
