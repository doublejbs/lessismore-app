// 배낭 여행지 날씨 도메인 타입.
// Open-Meteo(무료·키 없음) 단독 연동. 자세한 설계는 날씨 스펙 참고.

/**
 * 날씨 조회에 필요한 최소 위치 정보.
 * 여행지 자체는 배낭 여행지 도메인이 소유하며(`model/bag-destination/BagLocation`),
 * 날씨 도메인은 그 좌표·표시명을 읽어 스냅샷만 만든다(WT-6).
 */
export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

/** 하루치 날씨 데이터의 출처. 일별 배지 표기에 사용. */
export type WeatherSource = 'forecast' | 'archive' | 'normal';

/**
 * 스냅샷 전체의 성격.
 * - forecast: 향후 16일 이내 예보
 * - archive: 과거 실측
 * - normal: 먼 미래 평년값(과거 N년 평균)
 * - mixed: 기간이 여러 구간에 걸침
 */
export type WeatherKind = WeatherSource | 'mixed';

/** 여행 기간 중 하루치 날씨. */
export interface WeatherDaily {
  date: string; // YYYY-MM-DD
  code: number; // WMO weather_code
  tempMax: number;
  tempMin: number;
  source: WeatherSource;
  precipProb?: number; // 예보용 강수확률(%)
  precipSum?: number; // 실측/평년값 강수량(mm)
  windSpeedMax?: number; // 최대 풍속(m/s)
  windGustMax?: number; // 최대 돌풍(m/s)
}

/**
 * 배낭에 저장되는 날씨 스냅샷. Firestore `bag.weather` 필드.
 * 캐시 신선도 판단(fetchedAt/kind/frozen/좌표)에 필요한 메타를 함께 보관한다.
 */
export interface WeatherSnapshot {
  fetchedAt: string; // ISO. TTL 판단용
  kind: WeatherKind;
  frozen: boolean; // 과거 여행이면 true → 재조회 안 함
  latitude: number; // 스냅샷 당시 좌표(위치 변경 감지)
  longitude: number;
  locationName: string;
  daily: WeatherDaily[];
}
