import SatelliteProbeResult from './SatelliteProbeResult';

/**
 * 위성 보기 (MAP-7) — Esri World Imagery(ArcGIS Location Platform) 래스터 타일과, 그 위에 남길 `useless-outdoor`
 * 레이어 규칙. 스타일 JSON을 다시 받지 않고 런타임에 레이어를 끼우고 `visibility`를 바꾼다(`MapSatelliteLayersView`).
 *
 * - **키**: 앱 빌드 환경변수 `EXPO_PUBLIC_ESRI_BASEMAP_KEY`(베이스맵 조회 권한만 준 키 — EAS 환경 변수 + 로컬
 *   `.env`). 코드·저장소에 넣지 않는다. 비어 있으면 위성 보기를 그리지 않는다(전환 버튼 없음).
 * - **레이어 id**는 `outdoor-v1.json`(MAP_STYLE_VERSION 1) 기준이다. 스타일 버전을 올리면 아래 목록을 다시 맞춘다.
 */
const ESRI_BASEMAP_KEY = process.env.EXPO_PUBLIC_ESRI_BASEMAP_KEY ?? '';

const SATELLITE_TILE_BASE =
  'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile';

export const SATELLITE_SOURCE_ID = 'app-satellite';
export const SATELLITE_LAYER_ID = 'app-satellite-raster';
export const SATELLITE_TILE_SIZE = 256;
export const SATELLITE_MAX_ZOOM = 19;
// Esri 표준 출처 문구(라이선스 의무) — 지도 출처 ⓘ에 OpenStreetMap·OpenFreeMap과 함께 뜬다.
export const SATELLITE_ATTRIBUTION =
  'Esri, Maxar, Earthstar Geographics, and the GIS User Community'; // l10n-ignore: 라이선스 표준 문구

/**
 * 위성 래스터를 이 레이어 **아래**에 끼운다 — 스타일의 첫 도로 레이어(`tunnel_*` 케이싱)다. 그 아래(배경·Natural
 * Earth 음영·면 채움·지형 음영·물길·공항)는 위성이 덮고, 그 위(도로·등산로·철도·경계·라벨)는 위성 위에 남는다.
 * 앱이 붙이는 레이어(등고선·코스 선·포인트·내 위치)는 스타일 뒤에 붙으므로 모두 위성 위다.
 */
export const SATELLITE_BEFORE_LAYER_ID = 'tunnel_motorway_link_casing';

// 위성일 때 끄는 스타일 레이어 — 지형 음영과 면 채움(땅·숲·물·건물). 타입은 스타일 JSON의 `type` 그대로다
// (기존 레이어를 다시 잡을 때 같은 타입으로 넘겨야 한다).
export const SATELLITE_HIDDEN_LAYERS: readonly {
  id: string;
  type: 'fill' | 'line' | 'raster' | 'hillshade' | 'fill-extrusion';
}[] = [
  { id: 'natural_earth', type: 'raster' },
  { id: 'park', type: 'fill' },
  { id: 'park_outline', type: 'line' },
  { id: 'landuse_residential', type: 'fill' },
  { id: 'landcover_wood', type: 'fill' },
  { id: 'landcover_grass', type: 'fill' },
  { id: 'landcover_ice', type: 'fill' },
  { id: 'landcover_wetland', type: 'fill' },
  { id: 'landuse_pitch', type: 'fill' },
  { id: 'landuse_track', type: 'fill' },
  { id: 'landuse_cemetery', type: 'fill' },
  { id: 'landuse_hospital', type: 'fill' },
  { id: 'landuse_school', type: 'fill' },
  { id: 'hillshade', type: 'hillshade' },
  { id: 'water', type: 'fill' },
  { id: 'landcover_sand', type: 'fill' },
  { id: 'aeroway_fill', type: 'fill' },
  { id: 'road_area_pattern', type: 'fill' },
  { id: 'building', type: 'fill' },
  { id: 'building-3d', type: 'fill-extrusion' },
];

// 키가 든 빌드인지. 없으면 위성 보기를 그리지 않는다(MAP-7).
export const hasSatelliteKey = (): boolean => ESRI_BASEMAP_KEY.length > 0;

const withToken = (path: string) =>
  `${SATELLITE_TILE_BASE}/${path}?token=${encodeURIComponent(ESRI_BASEMAP_KEY)}`;

// MapLibre 래스터 소스 타일 주소(Esri는 `{z}/{y}/{x}` 순서다).
export const getSatelliteTileUrlTemplate = (): string =>
  withToken('{z}/{y}/{x}');

// 미리 찔러 볼 타일(서울 부근, 줌 7). 권한(키·한도)만 확인하므로 화면 위치와 무관한 한 장이면 된다.
const PROBE_TILE = { z: 7, x: 109, y: 49 };
const PROBE_TIMEOUT_MS = 8000;
// Esri 권한 오류 — 401·403 HTTP, 498(잘못된 토큰)·499(토큰 필요)는 HTTP 코드로도, 200 + JSON 본문으로도 온다.
const UNAUTHORIZED_CODES = new Set([401, 403, 498, 499]);

export interface SatelliteProbe {
  result: SatelliteProbeResult;
  // 측정 `map_satellite_unavailable`의 `status` — HTTP 코드 또는 Esri 오류 코드, 네트워크 실패면 0.
  status: number;
}

const readEsriErrorCode = async (response: Response): Promise<number> => {
  try {
    const body = (await response.json()) as { error?: { code?: unknown } };
    const code = body?.error?.code;

    return typeof code === 'number' ? code : 0;
  } catch {
    return 0;
  }
};

/**
 * 위성 타일 한 장을 받아 본다(MAP-7 한도 폴백). 이미지면 `Ok`, 권한 오류면 `Unauthorized`, 그 밖의 실패는 `Failed`.
 * MapLibre는 타일 하나하나의 실패를 앱에 알리지 않으므로 위성을 켜기 전(그리고 세션 첫 위성 표시 전)에 이렇게 확인한다.
 */
export const probeSatelliteTile = async (): Promise<SatelliteProbe> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(
      withToken(`${PROBE_TILE.z}/${PROBE_TILE.y}/${PROBE_TILE.x}`),
      { headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal }
    );
    const contentType = response.headers.get('content-type') ?? '';

    if (UNAUTHORIZED_CODES.has(response.status)) {
      return {
        result: SatelliteProbeResult.Unauthorized,
        status: response.status,
      };
    }

    if (!response.ok) {
      return { result: SatelliteProbeResult.Failed, status: response.status };
    }

    if (contentType.startsWith('image/')) {
      return { result: SatelliteProbeResult.Ok, status: response.status };
    }

    // 200인데 이미지가 아니면 Esri 오류 응답(JSON `{ error: { code } }`)이다 — 권한 오류는 코드로 가른다.
    const code = await readEsriErrorCode(response);

    return {
      result: UNAUTHORIZED_CODES.has(code)
        ? SatelliteProbeResult.Unauthorized
        : SatelliteProbeResult.Failed,
      status: code || response.status,
    };
  } catch {
    return { result: SatelliteProbeResult.Failed, status: 0 };
  } finally {
    clearTimeout(timer);
  }
};
