import dayjs from 'dayjs';
import app from '../app/App';
import CampSpotStore from '../store/CampSpotStore';
import weatherService from '../weather/WeatherService';
import { CampSpot } from './CampSpotTypes';
import { BagLocation, WeatherDaily } from '../weather/WeatherTypes';

// 주간 날씨 조회 범위: 오늘 포함 7일.
const WEEKLY_DAYS = 6;

// 박지 주간 날씨 전용 페이지(CampSite CS-3)의 데이터 접근을 캡슐화한다.
class CampSiteWeatherDispatcher {
  public static new() {
    return new CampSiteWeatherDispatcher(app.getCampSpotStore()!);
  }

  private constructor(private readonly campSpotStore: CampSpotStore) {}

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
}

export default CampSiteWeatherDispatcher;
