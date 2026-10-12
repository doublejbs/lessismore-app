import { BagLocation } from '@/model/bag-destination/BagLocation';
import { BagPointData } from '@/model/bag-point/BagPointData';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { RouteData } from '@/model/route/RouteData';
import { GearData } from '@/model/store/GearStore';
import { WeatherSnapshot } from '@/model/weather/WeatherTypes';

/**
 * 스냅샷 스키마 버전 (OF-1). 저장 모양을 바꾸면 올린다 — 앱이 요구하는 버전보다 낮은 저장본은
 * `갱신이 필요해요`로 표시되고, 온라인에서 갱신하면 풀린다.
 */
export const OFFLINE_SNAPSHOT_SCHEMA_VERSION = 1;

// 패킹 상태(PK-2 · DM-5 `packedGears`/`packingStartedAt`/`packingCompletedAt`). 서버와 같은 필드다.
export interface OfflinePackingState {
  packedGears: string[];
  packingStartedAt?: string;
  packingCompletedAt?: string;
}

/**
 * 배낭 문서(DM-5) 중 오프라인 상세에 필요한 필드만 (OF-1). `shared`·`activity`·그룹 스냅샷처럼
 * 오프라인 화면이 쓰지 않는 필드는 담지 않는다.
 */
export interface OfflineBagData extends OfflinePackingState {
  name: string;
  weight: string;
  editDate: string;
  startDate: string;
  endDate: string;
  gears: string[];
  memo: string;
  location: BagLocation | null;
  weather: WeatherSnapshot | null;
}

// 코스(DM-30) — `createdAt`만 ISO 문자열이다(Timestamp → ISO, §4).
export type OfflineRouteData = Omit<RouteData, 'createdAt'> & {
  createdAt: string;
};

// 지도 포인트(DM-33) — 시각만 ISO 문자열이다.
export type OfflinePointData = Omit<BagPointData, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt?: string;
};

// 여행지 박지(DM-17). 사진은 받지 않는다(OF-1) — `imageUrl`을 뺀다.
export type OfflineCampSpotData = Omit<CampSpot, 'imageUrl'>;

/**
 * `offline/{bagId}/snapshot.json` 한 벌 (OF-1 · §4).
 *
 * **본인 데이터와 공개 박지만** 담는다 — 다른 사용자의 데이터·개인 식별 정보가 들어가지 않는다.
 * 연결 그룹의 코스·포인트는 저장하지 않고, 그룹이 있었다는 사실(`linkedGroupCount`)만 남겨
 * 캔버스가 `그룹 코스는 오프라인에서 보이지 않아요`를 띄울 수 있게 한다.
 */
export interface OfflineTripSnapshotData {
  schemaVersion: number;
  bagId: string;
  ownerId: string;
  savedAt: string;
  // 오프라인 패킹 토글이 서버에 아직 반영되지 않았다(OF-5). 매니페스트와 같은 값이다.
  pendingPacking: boolean;
  bag: OfflineBagData;
  gears: GearData[];
  routes: OfflineRouteData[];
  points: OfflinePointData[];
  campSpot: OfflineCampSpotData | null;
  linkedGroupCount: number;
}

type Plain =
  string | number | boolean | null | Plain[] | { [key: string]: Plain };

const isTimestampLike = (value: object): value is { toDate: () => Date } => {
  return 'toDate' in value && typeof value.toDate === 'function';
};

/**
 * Firestore 값을 JSON으로 쓸 수 있는 모양으로 바꾼다(§4). `Timestamp`·`Date` → ISO 문자열,
 * `undefined` 키는 뺀다(`exactOptionalPropertyTypes` — 없는 값은 키가 없다). 함수·센티넬은 버린다.
 */
export const toPlain = (value: unknown): Plain | undefined => {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map(item => toPlain(item))
      .filter((item): item is Plain => item !== undefined);
  }

  if (typeof value === 'object') {
    if (isTimestampLike(value)) {
      return value.toDate().toISOString();
    }

    const result: { [key: string]: Plain } = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      const plain = toPlain(item);

      if (plain !== undefined) {
        result[key] = plain;
      }
    });

    return result;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return undefined;
};

export const toOfflineRouteData = (route: RouteData): OfflineRouteData => {
  const { createdAt, ...rest } = route;

  return {
    ...(toPlain(rest) as unknown as Omit<OfflineRouteData, 'createdAt'>),
    createdAt: createdAt.toISOString(),
  };
};

export const fromOfflineRouteData = (route: OfflineRouteData): RouteData => {
  return { ...route, createdAt: new Date(route.createdAt) };
};

export const toOfflinePointData = (point: BagPointData): OfflinePointData => {
  const { createdAt, updatedAt, ...rest } = point;

  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    ...(updatedAt ? { updatedAt: updatedAt.toISOString() } : {}),
  };
};

export const fromOfflinePointData = (point: OfflinePointData): BagPointData => {
  const { createdAt, updatedAt, ...rest } = point;

  return {
    ...rest,
    createdAt: new Date(createdAt),
    ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
  };
};

export const toOfflineCampSpotData = (spot: CampSpot): OfflineCampSpotData => {
  const { imageUrl: _imageUrl, ...rest } = spot;

  return toPlain(rest) as unknown as OfflineCampSpotData;
};

/**
 * 저장본 JSON을 읽는다. 모양이 깨졌으면(앱 종료 중 반쯤 쓴 파일 등) `null` — 호출자가
 * "저장되지 않음"으로 다룬다. 스키마 버전 비교는 매니페스트가 한다(`OfflineManifest`).
 */
export const parseOfflineSnapshot = (
  text: string
): OfflineTripSnapshotData | null => {
  try {
    const data = JSON.parse(text) as Partial<OfflineTripSnapshotData> | null;

    if (
      !data ||
      typeof data.bagId !== 'string' ||
      typeof data.schemaVersion !== 'number' ||
      !data.bag ||
      !Array.isArray(data.gears) ||
      !Array.isArray(data.routes) ||
      !Array.isArray(data.points)
    ) {
      return null;
    }

    return data as OfflineTripSnapshotData;
  } catch {
    return null;
  }
};
