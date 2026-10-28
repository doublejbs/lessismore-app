import LocalStorageManager from '@/model/storage/LocalStorageManager';
import { OFFLINE_SNAPSHOT_SCHEMA_VERSION } from './OfflineTripSnapshot';

// AsyncStorage 키(OF-1 · §4). 저장된 여행 목록만 담는다 — 내용은 `offline/{bagId}/snapshot.json`.
const MANIFEST_KEY = 'offline.manifest';

/**
 * 저장된 여행 한 건 (OF-1 매니페스트). 여행 탭 오프라인 목록(OF-4)과 타일 부제(OF-2)가 이 값만으로
 * 그려진다 — 목록을 그리려고 스냅샷 파일을 열지 않는다.
 */
export interface OfflineManifestEntry {
  bagId: string;
  // 저장한 사용자. 다른 계정으로 로그인한 기기에서 남의 여행이 보이지 않게 걸러 낸다(OF-2).
  ownerId: string;
  name: string;
  startDate: string;
  endDate: string;
  // 스냅샷 + GPX 원본 + 등고선 + 지도 팩의 합(바이트). 타일 부제·목록이 보여 주는 값이다.
  bytes: number;
  // 그중 지도 팩 몫(바이트, OF-1). 팩이 없으면 0.
  mapBytes: number;
  savedAt: string;
  schemaVersion: number;
  // 오프라인 패킹 토글이 서버에 아직 반영되지 않았다(OF-5).
  pendingPacking: boolean;
  routeCount: number;
  pointCount: number;
}

const isEntry = (value: unknown): value is OfflineManifestEntry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Partial<OfflineManifestEntry>;

  return (
    typeof entry.bagId === 'string' &&
    entry.bagId.length > 0 &&
    typeof entry.ownerId === 'string' &&
    typeof entry.savedAt === 'string' &&
    typeof entry.schemaVersion === 'number'
  );
};

// 매니페스트 읽기·쓰기 (OF-1). 순서는 저장 시각 순이 아니라 화면이 정한다.
class OfflineManifest {
  public static async load(): Promise<OfflineManifestEntry[]> {
    const stored = await LocalStorageManager.get<unknown>(MANIFEST_KEY);

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored.filter(isEntry).map(entry => ({
      ...entry,
      name: typeof entry.name === 'string' ? entry.name : '',
      startDate: typeof entry.startDate === 'string' ? entry.startDate : '',
      endDate: typeof entry.endDate === 'string' ? entry.endDate : '',
      bytes: Number(entry.bytes) || 0,
      mapBytes: Number(entry.mapBytes) || 0,
      pendingPacking: entry.pendingPacking === true,
      routeCount: Number(entry.routeCount) || 0,
      pointCount: Number(entry.pointCount) || 0,
    }));
  }

  public static async save(entries: OfflineManifestEntry[]): Promise<void> {
    await LocalStorageManager.set(MANIFEST_KEY, entries);
  }

  public static async clear(): Promise<void> {
    await LocalStorageManager.remove(MANIFEST_KEY);
  }

  // 앱이 요구하는 스키마보다 낮으면 갱신이 필요하다(OF-1).
  public static needsUpgrade(entry: OfflineManifestEntry): boolean {
    return entry.schemaVersion < OFFLINE_SNAPSHOT_SCHEMA_VERSION;
  }
}

export default OfflineManifest;
