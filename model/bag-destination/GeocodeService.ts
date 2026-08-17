import { GeocodeResult } from './GeocodeResult';

// 여행지 선택(BagDestination DST-3/DST-4)의 지오코딩. 한국 POI 정확도를 위해
// Kakao 로컬 API를 쓴다(REST 키 필요). 날씨 도메인은 좌표만 소비하므로 여기 있다.
const KAKAO_KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const KAKAO_COORD2ADDRESS_URL =
  'https://dapi.kakao.com/v2/local/geo/coord2address.json';
const KAKAO_COORD2REGION_URL =
  'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;

// 카카오 장소 검색을 사용하는 화면이 공유하는 호출 규칙(DST-4, CS-6).
export const GEOCODE_MIN_QUERY_LENGTH = 2;
export const GEOCODE_DEBOUNCE_MS = 400;

// 주소를 찾지 못한 좌표(바다·산악 등)도 여행지로 확정할 수 있게 하는 폴백 이름(DST-3).
export const FALLBACK_LOCATION_NAME = '선택한 위치';

const getHeaders = () => {
  if (!KAKAO_REST_KEY) {
    throw new Error(
      'Kakao REST 키가 없습니다. .env에 EXPO_PUBLIC_KAKAO_REST_KEY를 설정하세요.'
    );
  }

  return { Authorization: `KakaoAK ${KAKAO_REST_KEY}` };
};

/**
 * 지명 → 좌표 후보 목록. Kakao 로컬 키워드 검색(한국 POI 정확).
 * 좌표는 WGS84(x=경도, y=위도)로 바로 사용한다.
 */
const geocode = async (name: string): Promise<GeocodeResult[]> => {
  const trimmed = name.trim();

  if (!trimmed) {
    return [];
  }

  const headers = getHeaders();
  const url = `${KAKAO_KEYWORD_URL}?query=${encodeURIComponent(trimmed)}&size=15`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Kakao 지오코딩 실패: ${res.status}`);
  }

  const json = await res.json();
  const docs: any[] = json?.documents ?? [];

  return docs.map(d => {
    const addr = d.road_address_name || d.address_name;

    return {
      name: d.place_name,
      latitude: parseFloat(d.y),
      longitude: parseFloat(d.x),
      ...(addr ? { subtitle: addr } : {}),
    };
  });
};

/**
 * 좌표 → 지명(지도 선택용 역지오코딩). Kakao coord2address → 없으면 행정구역명 폴백.
 * 둘 다 없으면 FALLBACK_LOCATION_NAME을 반환해 확정 자체는 막지 않는다(DST-3).
 */
const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const headers = getHeaders();

  const addrRes = await fetch(
    `${KAKAO_COORD2ADDRESS_URL}?x=${longitude}&y=${latitude}`,
    { headers }
  );

  if (addrRes.ok) {
    const json = await addrRes.json();
    const doc = json?.documents?.[0];
    const name = doc?.road_address?.address_name || doc?.address?.address_name;

    if (name) {
      return name;
    }
  }

  // 도로/지번 주소가 없으면(바다/산악 등) 행정구역명으로 폴백.
  const regionRes = await fetch(
    `${KAKAO_COORD2REGION_URL}?x=${longitude}&y=${latitude}`,
    { headers }
  );

  if (regionRes.ok) {
    const json = await regionRes.json();
    const name = json?.documents?.[0]?.address_name;

    if (name) {
      return name;
    }
  }

  return FALLBACK_LOCATION_NAME;
};

const geocodeService = { geocode, reverseGeocode };

export default geocodeService;
