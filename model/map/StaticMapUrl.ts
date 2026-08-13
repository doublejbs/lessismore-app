/**
 * NCP Static Map 이미지 URL 조립.
 *
 * 배낭 목록 카드의 지도 밴드([specs/Bag.md](../../specs/Bag.md) BAG-1)와 여행지 타일 썸네일
 * ([specs/BagDestination.md](../../specs/BagDestination.md) DST-2)이 이 하나를 공유한다 —
 * 두 화면이 각자 URL을 만들면 줌·크기·마커 규칙이 갈리고, 저작권 제약(크롭 금지)도 한쪽만
 * 지켜진다.
 *
 * **동적 지도 뷰(`@mj-studio/react-native-naver-map`)를 목록에서 쓰지 않는 이유**: NCP Mobile
 * Dynamic Map은 **뷰 생성당 과금**이라 목록에서는 스크롤이 곧 과금이다. Static Map은 요청당
 * 과금이고 `expo-image` 캐시가 재요청을 막는다.
 *
 * **저작권(NCP 약관)** — 호출부가 함께 지켜야 하는 제약이라 여기에도 남긴다:
 * - 응답 이미지를 **서버(Firestore/Storage)에 저장하지 않는다.** 결과 저장·DB화가 금지다.
 *   URL로 그때그때 로드하고 `expo-image`의 기기 캐시(`cachePolicy`)만 쓴다.
 * - 이미지에 박힌 **네이버 로고·저작권 고지를 자르거나 가리지 않는다.** 그래서 `widthPx`/
 *   `heightPx`는 **표시 박스와 같은 비율**로 넘겨야 한다 — 비율이 어긋난 채 `cover`로 채우면
 *   고지가 들어가는 가장자리가 잘린다.
 */

/**
 * 클라이언트용 엔드포인트.
 *
 * 서버용 `raster`는 secret(`x-ncp-apigw-api-key`)까지 요구하는데, 앱 번들은 비밀을 지킬 수
 * 없으므로 secret을 심지 않는다 — 키 ID만으로 인증되는 `raster-cors`를 쓴다.
 */
const STATIC_MAP_ENDPOINT =
  'https://maps.apigw.ntruss.com/map-static/v2/raster-cors';

/**
 * Static Map 전용 키 ID.
 *
 * **동적 지도 키(`app.json` → `WithNaverMapNcpKey.ncpKeyId`)를 그대로 쓰지 않는다.** 그 키로
 * 호출하면 게이트웨이 인증은 통과하는데 엔드포인트가 403을 준다(= Static Map 상품 미활성,
 * 2026-08-13 실측 — [specs/Bag.md](../../specs/Bag.md) §8). 상품이 켜지고 이 env가 채워지면
 * 코드 변경 없이 밴드가 살아나고, 비어 있으면 아래에서 `null`을 반환해 호출부가 폴백한다.
 */
const STATIC_MAP_KEY_ID = process.env.EXPO_PUBLIC_NCP_STATIC_MAP_KEY_ID ?? '';

// NCP 제약: w·h는 1~1024, level(줌)은 1~20.
const MAX_SIDE = 1024;
const MIN_LEVEL = 1;
const MAX_LEVEL = 20;

/**
 * 레티나 배율. NCP가 지원하는 값은 1 또는 2뿐이라 `PixelRatio.get()`(3배 기기 존재)을
 * 그대로 넘기지 않고 2로 고정한다 — 3배 기기에서도 2배 이미지가 1배보다 훨씬 선명하다.
 */
const SCALE = 2;

/**
 * 목록 카드 지도 밴드의 줌 레벨 — **동네 수준**.
 *
 * 밴드 높이 110pt에서 세로 스팬이 약 0.019도(≈ 2km)다(`360 × 110 / (256 × 2^13)`).
 * 마을·계곡 이름이 읽히고 여행지가 "어디쯤"인지 알아볼 수 있는 배율이다. 한 단 낮추면
 * 시·군 윤곽만 남고, 한 단 올리면 건물만 보여 어느 지역인지 사라진다.
 * (전체 화면 지도의 `latitudeDelta` 환산은 `MapZoom.ts` — 여기는 밴드 높이가 기준이라
 * 같은 레벨이라도 보이는 범위가 화면 지도보다 훨씬 좁다.)
 */
export const BAG_CARD_MAP_LEVEL = 13;

interface StaticMapOptions {
  latitude: number;
  longitude: number;
  /** 표시 박스 폭(pt). 실제 응답은 `SCALE`배 크기로 오고 같은 비율이라 크롭이 없다. */
  widthPx: number;
  /** 표시 박스 높이(pt). */
  heightPx: number;
  /** 줌 레벨(1~20). 범위를 벗어나면 잘라 맞춘다. */
  level: number;
  /** 중심에 기본 마커를 찍을지. 목록 밴드는 중심이 여행지라 찍는다. */
  withMarker?: boolean;
}

// 위도·경도가 실수이고 유효 범위 안인지. (0,0)은 좌표 미기입이 그대로 저장된 값이라 배제한다.
const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return false;
  }

  return latitude !== 0 || longitude !== 0;
};

/**
 * Static Map 이미지 URL. 만들 수 없으면 **`null`** — 호출부는 이때 밴드·썸네일을 아예 그리지
 * 않고 폴백한다(빈 회색 면·깨진 이미지 아이콘을 남기지 않는다).
 *
 * `null`이 되는 경우: 키 미설정(현재 기본 상태), 좌표 이상, 크기 0 이하.
 */
export const buildStaticMapUrl = ({
  latitude,
  longitude,
  widthPx,
  heightPx,
  level,
  withMarker = true,
}: StaticMapOptions): string | null => {
  if (!STATIC_MAP_KEY_ID) {
    return null;
  }

  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  // 레이아웃 측정 전에는 폭이 0으로 들어온다 — 그 프레임에 1×1 이미지를 요청해 캐시를
  // 오염시키지 않는다.
  const width = Math.min(Math.round(widthPx), MAX_SIDE);
  const height = Math.min(Math.round(heightPx), MAX_SIDE);

  if (width <= 0 || height <= 0) {
    return null;
  }

  const clampedLevel = Math.min(
    Math.max(Math.round(level), MIN_LEVEL),
    MAX_LEVEL
  );

  // NCP는 `center`를 `경도,위도` 순으로 받는다(위도·경도 순이 아니다).
  const params: [string, string][] = [
    ['center', `${longitude},${latitude}`],
    ['level', String(clampedLevel)],
    ['w', String(width)],
    ['h', String(height)],
    ['scale', String(SCALE)],
    ['format', 'png'],
    ['X-NCP-APIGW-API-KEY-ID', STATIC_MAP_KEY_ID],
  ];

  if (withMarker) {
    // 마커 문법은 `|`로 옵션을 잇고 `pos`는 `경도 위도`(공백 구분)다.
    params.push(['markers', `type:d|size:mid|pos:${longitude} ${latitude}`]);
  }

  /**
   * 쿼리 문자열을 직접 조립한다 — `URLSearchParams`를 쓰지 않는 이유는 RN 폴리필의
   * `toString()`이 공백을 `+`로 바꾸기 때문이다. `markers`의 `pos:{경도} {위도}`는 공백이
   * 값의 일부라 `%20`이어야 안전하다(`+`를 공백으로 되돌리지 않는 서버에서 좌표가 깨진다).
   */
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${STATIC_MAP_ENDPOINT}?${query}`;
};
