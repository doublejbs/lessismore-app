import { BagLocation } from '@/model/bag-destination/BagLocation';
import { BagPointData } from '@/model/bag-point/BagPointData';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  GroupPointData,
  GroupRouteData,
  GroupRouteSource,
} from '@/model/group/GroupData';
import { RouteData } from '@/model/route/RouteData';
import { GearData } from '@/model/store/GearStore';
import { WeatherSnapshot } from '@/model/weather/WeatherTypes';
import { isOfflineLngLatBounds, OfflineLngLatBounds } from './OfflineMapBounds';

/**
 * 스냅샷 스키마 버전 (OF-1). 저장 모양을 바꾸면 올린다 — 앱이 요구하는 버전보다 낮은 저장본은
 * `갱신이 필요해요`로 표시되고, 온라인에서 갱신하면 풀린다.
 *
 * - 1: 최초(캔버스 — 지도 없음).
 * - 2 (2026-10-12): 지도 타일 팩 + 등고선(`mapBounds`·`hasContours`, OF-6). 1은 지도가 없어 갱신 필요.
 * - 3 (2026-10-13): 연결 그룹의 코스·포인트(`groupRoutes`·`groupPoints`, OF-1). 2는 그룹 코스가 없어 갱신 필요.
 */
export const OFFLINE_SNAPSHOT_SCHEMA_VERSION = 3;

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
export type OfflineRouteData = Omit<RouteData, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  // 그린 코스 수정 시각(RD-7). 시각은 ISO 문자열이다.
  updatedAt?: string;
};

// 지도 포인트(DM-33) — 시각만 ISO 문자열이다.
export type OfflinePointData = Omit<BagPointData, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt?: string;
};

/**
 * 연결 그룹의 코스(DM-29, OF-1 2026-10-13). 배낭 코스와 같은 모양에 출처(`groupId`·`groupName`)를 더한다 —
 * 오프라인 코스 화면이 `그룹 {이름}`을 그대로 보여 준다. `storagePath`는 그룹 경로
 * (`groups/{groupId}/routes/{routeId}.gpx`) 그대로이고 원본은 배낭 코스와 같은 `routes/{routeId}.gpx`에 둔다
 * (문서 ID는 Firestore 자동 ID라 배낭 코스와 겹치지 않는다).
 * **올린 사람(`authorId`·`authorName`)은 담지 않는다** — 다른 멤버의 식별 정보다(OF-1).
 * `sourceBagId`·`sourceBagRouteId`는 중복 접기(BD-11)용 원본 참조다.
 */
export type OfflineGroupRouteData = OfflineRouteData &
  Partial<GroupRouteSource> & {
    groupId: string;
    groupName: string;
  };

// 연결 그룹의 포인트(DM-29). 올린 사람은 담지 않는다(OF-1) — 시각은 ISO 문자열.
export type OfflineGroupPointData = Omit<
  GroupPointData,
  'authorId' | 'authorName' | 'createdAt' | 'updatedAt'
> & {
  groupId: string;
  groupName: string;
  createdAt: string;
  updatedAt: string;
};

// 여행지 박지(DM-17). 사진은 받지 않는다(OF-1) — `imageUrl`을 뺀다.
export type OfflineCampSpotData = Omit<CampSpot, 'imageUrl'>;

/**
 * `offline/{bagId}/snapshot.json` 한 벌 (OF-1 · §4).
 *
 * 본인 데이터·공개 박지 + **연결 그룹의 코스·포인트**(2026-10-13, 읽기 전용)를 담는다. 그룹 쪽은
 * 코스·포인트 문서만이고 올린 사람·멤버·배낭 스냅샷 같은 다른 사용자의 데이터는 담지 않는다(OF-1).
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
  // 연결 그룹의 코스·포인트(스키마 3). 2 이하 저장본엔 없어 빈 배열로 읽는다.
  groupRoutes: OfflineGroupRouteData[];
  groupPoints: OfflineGroupPointData[];
  // 저장 시점의 연결 그룹 수(참고값). 화면은 더 이상 쓰지 않는다.
  linkedGroupCount: number;
  // 지도 팩 영역 `[west, south, east, north]`(OF-1). 코스·포인트·여행지가 모두 없으면 `null`(팩 없음).
  mapBounds: OfflineLngLatBounds | null;
  // `contours.json`을 썼는지(OF-6). 계산 실패면 `false` — 지도는 음영만 그린다.
  hasContours: boolean;
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
  const { createdAt, updatedAt, ...rest } = route;

  return {
    ...(toPlain(rest) as unknown as Omit<
      OfflineRouteData,
      'createdAt' | 'updatedAt'
    >),
    createdAt: createdAt.toISOString(),
    ...(updatedAt ? { updatedAt: updatedAt.toISOString() } : {}),
  };
};

export const fromOfflineRouteData = (route: OfflineRouteData): RouteData => {
  const { createdAt, updatedAt, ...rest } = route;

  return {
    ...rest,
    createdAt: new Date(createdAt),
    ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
  };
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

export const toOfflineGroupRouteData = (
  route: GroupRouteData,
  groupId: string,
  groupName: string
): OfflineGroupRouteData => {
  const {
    authorId: _authorId,
    authorName: _authorName,
    sourceBagId,
    sourceBagRouteId,
    ...rest
  } = route;

  return {
    ...toOfflineRouteData(rest),
    ...(sourceBagId && sourceBagRouteId
      ? { sourceBagId, sourceBagRouteId }
      : {}),
    groupId,
    groupName,
  };
};

export const fromOfflineGroupRouteData = (
  route: OfflineGroupRouteData
): GroupRouteData => {
  const { groupId: _groupId, groupName: _groupName, ...rest } = route;

  // 올린 사람은 저장하지 않았다 — 코스 화면은 작성자를 보여 주지 않는다(편집도 막혀 있다).
  return {
    ...fromOfflineRouteData(rest),
    ...(rest.sourceBagId && rest.sourceBagRouteId
      ? {
          sourceBagId: rest.sourceBagId,
          sourceBagRouteId: rest.sourceBagRouteId,
        }
      : {}),
    authorId: '',
    authorName: '',
  };
};

export const toOfflineGroupPointData = (
  point: GroupPointData,
  groupId: string,
  groupName: string
): OfflineGroupPointData => {
  const {
    authorId: _authorId,
    authorName: _authorName,
    createdAt,
    updatedAt,
    ...rest
  } = point;

  return {
    ...rest,
    groupId,
    groupName,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

export const fromOfflineGroupPointData = (
  point: OfflineGroupPointData
): GroupPointData => {
  const {
    groupId: _groupId,
    groupName: _groupName,
    createdAt,
    updatedAt,
    ...rest
  } = point;

  return {
    ...rest,
    authorId: '',
    authorName: '',
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
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

    // 스키마 1 저장본에는 지도 필드가, 2 이하에는 그룹 코스·포인트가 없다 — 없음으로 맞춘다
    // (OF-1 `갱신 필요`는 매니페스트가 판단).
    return {
      ...(data as OfflineTripSnapshotData),
      groupRoutes: Array.isArray(data.groupRoutes) ? data.groupRoutes : [],
      groupPoints: Array.isArray(data.groupPoints) ? data.groupPoints : [],
      linkedGroupCount:
        typeof data.linkedGroupCount === 'number' ? data.linkedGroupCount : 0,
      mapBounds: isOfflineLngLatBounds(data.mapBounds) ? data.mapBounds : null,
      hasContours: data.hasContours === true,
    };
  } catch {
    return null;
  }
};
