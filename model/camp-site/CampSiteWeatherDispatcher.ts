import dayjs from 'dayjs';
import weatherService from '../weather/WeatherService';
import { WeatherDaily, WeatherLocation } from '../weather/WeatherTypes';

// 주간 날씨 조회 범위: 오늘 포함 7일.
const WEEKLY_DAYS = 6;

// 박지 상세 '날씨' 탭(CampSite CS-3)의 데이터 접근을 캡슐화한다.
class CampSiteWeatherDispatcher {
  public static new() {
    return new CampSiteWeatherDispatcher();
  }

  private constructor() {}

  // 박지 좌표로 오늘부터 7일치 예보를 조회한다(CS-3 주간 날씨).
  public async getWeeklyWeather(
    location: WeatherLocation
  ): Promise<WeatherDaily[]> {
    const start = dayjs().startOf('day');
    const end = start.add(WEEKLY_DAYS, 'day');
    const snapshot = await weatherService.getWeather(location, start, end);

    return snapshot.daily;
  }
}

export default CampSiteWeatherDispatcher;
