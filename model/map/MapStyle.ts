/**
 * 앱 지도 스타일 `useless-outdoor` (MAP-1 · OF-6 · §4). 대화형 지도(`AppMapView`)·오프라인 팩·3D 리플레이·
 * 정적 썸네일(MAP-3)이 모두 이 URL 하나를 쓴다 — 스타일이 하나라 화면마다 지도 생김새가 같다.
 *
 * - OpenFreeMap `liberty` 기반 + 한국어 라벨 + AWS Terrain Tiles 지형 음영.
 *   웹 레포 `public/map/outdoor-v{n}.json`을 Firebase Hosting(`lessismore-7e070`)에서 서빙한다.
 * - **버전 규칙**: 스타일 내용을 바꾸면 파일 이름의 버전(`outdoor-v{n}`)과 `MAP_STYLE_VERSION`을
 *   함께 올린다. MapLibre 오프라인 팩은 스타일 URL에 묶여 있어 같은 URL의 내용을 바꾸면 이미 받은 팩과
 *   어긋난다. 팩 메타데이터·정적 썸네일 캐시 키에 `styleVersion`을 적어 둔다.
 */
export const MAP_STYLE_URL =
  'https://lessismore-7e070.web.app/map/outdoor-v1.json';

export const MAP_STYLE_VERSION = 1;

/**
 * 고도 타일(AWS Terrain Tiles, Mapzen Terrarium 인코딩 — 256px PNG). 등고선 계산(OF-6)에 쓴다.
 * 고도(m) = R × 256 + G + B / 256 − 32768. 공개 데이터, 출처 표기는 스타일의 attribution이 맡는다.
 */
export const TERRAIN_TILE_URL_TEMPLATE =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
