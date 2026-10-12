import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { DocumentData } from 'firebase/firestore';
import { Directory, File } from 'expo-file-system';
import app from '@/model/app/App';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import type Firebase from '@/model/firebase/Firebase';
import {
  measureRouteBounds,
  mergeRouteBounds,
} from '@/model/route/RouteCamera';
import RouteUpload from '@/model/route/RouteUpload';
import type BagPointStore from '@/model/store/BagPointStore';
import type BagRouteStore from '@/model/store/BagRouteStore';
import type BagStore from '@/model/store/BagStore';
import type CampSpotStore from '@/model/store/CampSpotStore';
import { GearData } from '@/model/store/GearStore';
import type GroupStore from '@/model/store/GroupStore';
import { WeatherSnapshot } from '@/model/weather/WeatherTypes';
import type NetworkStatus from './NetworkStatus';
import {
  buildOfflineContours,
  isOfflineContourCollection,
  OfflineContourCollection,
} from './OfflineContours';
import {
  getOfflineMapBounds,
  isLngLatBoundsInside,
  OfflineLngLatBounds,
} from './OfflineMapBounds';
import OfflineMapPack, { OfflineMapPackAbortError } from './OfflineMapPack';
import type OfflineEntitlement from './OfflineEntitlement';
import OfflineManifest, { OfflineManifestEntry } from './OfflineManifest';
import OfflineSaveError from './OfflineSaveError';
import OfflineSaveErrorType from './OfflineSaveErrorType';
import OfflineTripAccess from './OfflineTripAccess';
import OfflineTripFiles from './OfflineTripFiles';
import {
  OFFLINE_SNAPSHOT_SCHEMA_VERSION,
  OfflineBagData,
  OfflinePackingState,
  OfflineTripSnapshotData,
  parseOfflineSnapshot,
  toOfflineCampSpotData,
  toOfflinePointData,
  toOfflineRouteData,
  toPlain,
} from './OfflineTripSnapshot';

// 저장할 수 있는 여행 수(OF-1).
export const OFFLINE_MAX_TRIPS = 10;
// 이만큼 남지 않았으면 쓰기 전에 `저장 공간이 부족해요`로 끝낸다(보통 1~3MB — 여유를 둔다).
const MIN_FREE_DISK_BYTES = 20 * 1024 * 1024;
// 조용한 자동 갱신(OF-2)의 최소 간격 — 상세에 다시 포커스될 때마다(패킹 화면에서 돌아올 때 등)
// GPX까지 다시 받지 않게 한다. 사용자가 고친 내용은 그다음 진입에서 맞춰진다.
const SILENT_REFRESH_INTERVAL_MS = 60 * 1000;
// 로그아웃 직전 반영 안 된 패킹 체크를 서버에 올려 보는 최대 시간(OF-5). 넘기면 버리고 로그아웃한다.
const LOGOUT_PACKING_SYNC_TIMEOUT_MS = 3000;
// 전부 지우기(`removeAll`)가 진행 중인 여행별 작업을 기다리는 최대 시간. 넘기면 기다리지 않고 지운다 —
// 늦게 끝난 저장은 세대 값이 바뀌어 항목을 다시 넣지 않는다.
const OFFLINE_QUEUE_DRAIN_TIMEOUT_MS = 5000;
// 반영 안 된 패킹 체크를 서버에 올리는 최대 시간. Firestore 쓰기가 멈춰도 여행별 줄이 막히지 않게 한다.
const PACKING_SYNC_TIMEOUT_MS = 5000;
// 디스크 부족을 알리는 오류 메시지 조각(iOS `NSFileWriteOutOfSpaceError`·안드로이드 `ENOSPC`).
const DISK_FULL_PATTERNS = ['no space', 'enospc', 'out of space', 'disk full'];

export interface OfflineSaveOptions {
  // 구독 화면에서 방금 권한을 얻어 부른 저장(SUB-11 `onEntitled`). 권한 판단이 아직 따라오지 못했어도 저장한다.
  entitledByPurchase?: boolean;
  // 새 영역이 이미 받은 지도 팩 안에 들어오면 팩·등고선을 다시 받지 않는다(OF-2 — 조용한 자동 갱신만).
  // 명시적 저장·`지금 갱신`은 늘 다시 받는다.
  reuseMapPack?: boolean;
}

// 지도 팩·등고선 단계의 결과(저장본에 적는 값).
interface OfflineMapAssets {
  mapBounds: OfflineLngLatBounds | null;
  hasContours: boolean;
  contourBytes: number;
  mapBytes: number;
  // 이번에 새로 받은 팩 id. 저장본이 자리를 잡으면 옛 팩을 지우고, 실패하면 이 팩을 지운다.
  newPackId: string | null;
}

const noop = () => undefined;

// `promise`가 `ms` 안에 끝나면(성공·실패 무관) `true`, 시간을 넘기면 `false`.
const waitWithTimeout = async (
  promise: Promise<unknown>,
  ms: number
): Promise<boolean> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<boolean>(resolve => {
    timeoutId = setTimeout(() => resolve(false), ms);
  });

  try {
    return await Promise.race([
      promise.then(
        () => true,
        () => true
      ),
      timeout,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

interface Dependencies {
  firebase: Firebase;
  bagStore: BagStore;
  bagRouteStore: BagRouteStore;
  bagPointStore: BagPointStore;
  campSpotStore: CampSpotStore;
  groupStore: GroupStore;
  networkStatus: NetworkStatus;
  entitlement: OfflineEntitlement;
}

const toStringOrEmpty = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const toStringArray = (value: unknown): string[] => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const isDiskFullError = (error: unknown): boolean => {
  const message = String(
    (error as { message?: unknown } | null)?.message ?? error ?? ''
  ).toLowerCase();

  return DISK_FULL_PATTERNS.some(pattern => message.includes(pattern));
};

// 배낭 문서(DM-5)에서 오프라인 상세가 쓰는 필드만 고른다(OF-1). 그 밖의 필드는 저장하지 않는다.
const toOfflineBagData = (data: DocumentData): OfflineBagData => {
  const plain = (toPlain(data) ?? {}) as Record<string, unknown>;
  const packingStartedAt = toStringOrEmpty(plain.packingStartedAt);
  const packingCompletedAt = toStringOrEmpty(plain.packingCompletedAt);

  return {
    name: toStringOrEmpty(plain.name),
    weight: String(plain.weight ?? '0'),
    editDate: toStringOrEmpty(plain.editDate),
    startDate: toStringOrEmpty(plain.startDate),
    endDate: toStringOrEmpty(plain.endDate),
    gears: toStringArray(plain.gears),
    memo: toStringOrEmpty(plain.memo),
    location: (plain.location as BagLocation | undefined) ?? null,
    weather: (plain.weather as WeatherSnapshot | undefined) ?? null,
    packedGears: toStringArray(plain.packedGears),
    ...(packingStartedAt ? { packingStartedAt } : {}),
    ...(packingCompletedAt ? { packingCompletedAt } : {}),
  };
};

/**
 * 여행 오프라인 저장 (OF-1 ~ OF-5). 저장·갱신·삭제·목록·읽기와 오프라인 패킹의 서버 반영을 맡는다.
 *
 * - 파일: `offline/{bagId}/snapshot.json` + `offline/{bagId}/routes/{routeId}.gpx`, 목록은 매니페스트.
 * - **반쪽 저장본을 남기지 않는다**(OF-2): `offline/{bagId}.tmp/`에 다 쓴 뒤에만 자리를 바꾼다 —
 *   기존 저장본을 `{bagId}.old`로 비키고, tmp를 제자리로 옮긴 뒤 `.old`를 지운다(옮기다 실패하면
 *   `.old`를 되돌린다). 앱이 저장 중에 꺼지면 다음 시작 때 `.old`만 남은 저장본을 되돌리고
 *   매니페스트에 없는 디렉터리를 지운다(§6).
 * - **쓰기는 여행마다 한 줄로 선다**: 저장·갱신·패킹 쓰기·서버 반영·삭제가 같은 여행에서 겹치지 않는다.
 *   전부 지우기(`removeAll`)는 모든 줄을 기다린 뒤 혼자 돌고, 그 전에 시작된 저장은 세대 값이 바뀌어
 *   항목을 다시 넣지 않는다.
 * - 저장·갱신은 온라인 + 권한(OF-7)일 때만. 열람 판단은 `getAccess`.
 * - 오프라인 패킹 토글은 저장본에 즉시 쓰고 `pendingPacking`을 세운 뒤, 연결이 돌아오면 서버의
 *   `bag.packedGears`(+ `packingStartedAt`/`packingCompletedAt`)에 덮어쓴다(OF-5 — 마지막 토글 기준).
 */
class OfflineTripStore {
  public static new(dependencies: Dependencies) {
    return new OfflineTripStore(dependencies);
  }

  private entries: OfflineManifestEntry[] = [];
  private savingIds: string[] = [];
  // 지도 팩을 받는 중인 여행의 진행률(0~100, OF-2 `지도 저장 중 · {n}%`).
  private savingProgress = new Map<string, number>();
  private loaded = false;
  private syncing: Promise<void> | null = null;
  // 여행별 쓰기 줄(꼬리 프라미스 — 실패해도 거부되지 않는다)과 전부 지우기 줄.
  private bagQueues = new Map<string, Promise<void>>();
  private globalQueue: Promise<void> = Promise.resolve();
  // `removeAll`마다 올린다 — 그 전에 들어온 저장은 끝나도 항목을 넣지 않는다.
  private generation = 0;
  // 진행 중인 저장의 중단 스위치. `removeAll`(로그아웃)이 모두 끊는다 — 받던 등고선·지도 팩이 멈춘다.
  private saveControllers = new Set<AbortController>();
  private readonly firebase: Firebase;
  private readonly bagStore: BagStore;
  private readonly bagRouteStore: BagRouteStore;
  private readonly bagPointStore: BagPointStore;
  private readonly campSpotStore: CampSpotStore;
  private readonly groupStore: GroupStore;
  private readonly networkStatus: NetworkStatus;
  private readonly entitlement: OfflineEntitlement;

  private constructor(dependencies: Dependencies) {
    this.firebase = dependencies.firebase;
    this.bagStore = dependencies.bagStore;
    this.bagRouteStore = dependencies.bagRouteStore;
    this.bagPointStore = dependencies.bagPointStore;
    this.campSpotStore = dependencies.campSpotStore;
    this.groupStore = dependencies.groupStore;
    this.networkStatus = dependencies.networkStatus;
    this.entitlement = dependencies.entitlement;

    makeAutoObservable<
      OfflineTripStore,
      | 'firebase'
      | 'bagStore'
      | 'bagRouteStore'
      | 'bagPointStore'
      | 'campSpotStore'
      | 'groupStore'
      | 'networkStatus'
      | 'entitlement'
      | 'syncing'
      | 'bagQueues'
      | 'globalQueue'
      | 'generation'
      | 'saveControllers'
    >(this, {
      firebase: false,
      bagStore: false,
      bagRouteStore: false,
      bagPointStore: false,
      campSpotStore: false,
      groupStore: false,
      networkStatus: false,
      entitlement: false,
      syncing: false,
      bagQueues: false,
      globalQueue: false,
      generation: false,
      saveControllers: false,
    });
  }

  // 오프라인 저장을 쓸 수 있는 환경인지(네이티브 + 연결 감지 모듈). 웹은 타일·배너·오프라인 지도가 없다(§5).
  public isSupported(): boolean {
    return this.networkStatus.isSupported();
  }

  // `App.initialize`가 1회 부른다. 매니페스트를 읽고, 남은 반쪽 디렉터리를 치우고, 복귀 반영을 건다.
  public async initialize(): Promise<void> {
    if (this.loaded || !this.isSupported()) {
      return;
    }

    const entries = await OfflineManifest.load();

    // 갱신 도중 꺼져 `.old`만 남았으면 먼저 되돌린다(§6).
    entries.forEach(entry => {
      OfflineTripFiles.restoreBackupIfMissing(entry.bagId);
    });

    // 지금 로그인한 사용자의 것만 남긴다 — 로그아웃 상태거나 다른 계정의 저장본은 지운다(OF-2).
    // 파일이 없는 항목(저장 중 종료 등)도 뺀다(§6).
    const userId = this.firebase.getUserId();
    const valid = entries.filter(
      entry =>
        !!userId &&
        entry.ownerId === userId &&
        OfflineTripFiles.getSnapshotFile(
          OfflineTripFiles.getTripDirectory(entry.bagId)
        ).exists
    );

    runInAction(() => {
      this.entries = valid;
      this.loaded = true;
    });

    if (valid.length !== entries.length) {
      await OfflineManifest.save(valid);
    }

    this.removeOrphanDirectories();

    // §6: 매니페스트에 없는 지도 팩(받다 만 팩·지운 저장본의 팩)도 같은 자리에서 지운다. 전부 지우기 줄에
    // 세워 이 정리가 끝나기 전에 새 저장이 팩을 만들지 않게 한다(새 팩이 고아로 지워지지 않게).
    const keepBagIds = valid.map(entry => entry.bagId);

    void this.runExclusive(() =>
      OfflineMapPack.removeOrphans(keepBagIds).catch(noop)
    );

    // OF-5: 연결이 돌아오면(또는 앱이 온라인으로 시작하면) 오프라인 패킹 체크를 서버에 반영한다.
    reaction(
      () => this.networkStatus.isOnline() && this.firebase.isLoggedIn(),
      ready => {
        if (ready) {
          void this.syncPendingPacking();
        }
      },
      { fireImmediately: true }
    );
  }

  // 지금 로그인한 사용자가 저장한 여행만. 출발일이 늦은 것부터(여행 탭 목록 순서와 같다 — BAG-1).
  public getEntries(): OfflineManifestEntry[] {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return [];
    }

    return this.entries
      .filter(entry => entry.ownerId === userId)
      .slice()
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  public getEntry(bagId: string): OfflineManifestEntry | null {
    return this.getEntries().find(entry => entry.bagId === bagId) ?? null;
  }

  public isSaved(bagId: string): boolean {
    return this.getEntry(bagId) !== null;
  }

  public isSaving(bagId: string): boolean {
    return this.savingIds.includes(bagId);
  }

  // 지도 팩을 받는 중이면 진행률(0~100), 아니면 `null`(OF-2 타일 부제).
  public getSavingProgress(bagId: string): number | null {
    return this.savingProgress.get(bagId) ?? null;
  }

  public needsUpgrade(bagId: string): boolean {
    const entry = this.getEntry(bagId);

    return entry !== null && OfflineManifest.needsUpgrade(entry);
  }

  public isEntitled(): boolean {
    return this.entitlement.isEntitled();
  }

  // 오프라인에서 이 여행을 열 수 있는지(OF-5 · OF-7). 온라인이면 늘 `Online`.
  public getAccess(bagId: string): OfflineTripAccess {
    if (this.networkStatus.isOnline()) {
      return OfflineTripAccess.Online;
    }

    const entry = this.getEntry(bagId);

    if (!entry) {
      return OfflineTripAccess.NotSaved;
    }

    if (!this.entitlement.isEntitled()) {
      return OfflineTripAccess.Locked;
    }

    if (OfflineManifest.needsUpgrade(entry)) {
      return OfflineTripAccess.NeedsUpgrade;
    }

    return OfflineTripAccess.Available;
  }

  /**
   * 저장·갱신 (OF-1 · OF-2). 실패하면 `OfflineSaveError`를 던지고 기존 저장본은 그대로 남는다.
   * 오프라인 패킹 체크가 아직 서버에 없으면 **먼저 반영한다** — 그러지 않으면 갱신이 서버의 옛 패킹
   * 상태로 저장본을 덮어 산에서 한 체크가 사라진다.
   */
  public async save(
    bagId: string,
    options: OfflineSaveOptions = {}
  ): Promise<OfflineManifestEntry> {
    if (this.isSaving(bagId)) {
      throw new OfflineSaveError(OfflineSaveErrorType.Unknown);
    }

    const generation = this.generation;

    return this.runForBag(bagId, () =>
      this.saveNow(bagId, generation, options)
    );
  }

  private async saveNow(
    bagId: string,
    generation: number,
    options: OfflineSaveOptions
  ): Promise<OfflineManifestEntry> {
    if (generation !== this.generation) {
      throw new OfflineSaveError(OfflineSaveErrorType.Unknown);
    }

    if (!this.networkStatus.isOnline()) {
      throw new OfflineSaveError(OfflineSaveErrorType.Offline);
    }

    if (!options.entitledByPurchase && !this.entitlement.isEntitled()) {
      throw new OfflineSaveError(OfflineSaveErrorType.NotEntitled);
    }

    const existing = this.getEntry(bagId);

    if (!existing && this.getEntries().length >= OFFLINE_MAX_TRIPS) {
      throw new OfflineSaveError(OfflineSaveErrorType.LimitExceeded);
    }

    const available = OfflineTripFiles.getAvailableDiskSpace();

    if (available !== null && available < MIN_FREE_DISK_BYTES) {
      throw new OfflineSaveError(OfflineSaveErrorType.DiskFull);
    }

    if (this.isSaving(bagId)) {
      throw new OfflineSaveError(OfflineSaveErrorType.Unknown);
    }

    this.setSaving(bagId, true);

    const tempDirectory = OfflineTripFiles.getTempDirectory(bagId);
    const controller = new AbortController();
    // 저장 중 연결이 끊기면 받던 등고선·지도 팩을 바로 멈춘다(끝까지 기다려 봐야 실패한다).
    const disposeOfflineWatch = reaction(
      () => this.networkStatus.isOffline(),
      offline => {
        if (offline) {
          controller.abort();
        }
      }
    );

    this.saveControllers.add(controller);

    try {
      if (existing?.pendingPacking) {
        await this.syncPacking(bagId);
      }

      const { entry, hasContours } = await this.writeSnapshot(
        bagId,
        tempDirectory,
        generation,
        options,
        controller.signal
      );

      this.upsertEntry(entry);
      await OfflineManifest.save(this.entries);
      app.getAnalyticsManager()?.logEvent('offline_saved', {
        bytes: entry.bytes,
        route_count: entry.routeCount,
        point_count: entry.pointCount,
        map_bytes: entry.mapBytes,
        has_contours: hasContours,
      });

      return entry;
    } catch (error) {
      console.warn('[OfflineTripStore] 오프라인 저장 실패', error); // l10n-ignore: 개발자 로그
      // 경로로 다시 만든다 — 이름을 바꾼 뒤의 객체는 새 자리(완성된 저장본)를 가리킬 수 있다.
      OfflineTripFiles.deleteQuietly(OfflineTripFiles.getTempDirectory(bagId));
      await this.dropEntryIfFilesMissing(bagId);

      if (error instanceof OfflineSaveError) {
        throw error;
      }

      throw new OfflineSaveError(
        isDiskFullError(error)
          ? OfflineSaveErrorType.DiskFull
          : OfflineSaveErrorType.Unknown
      );
    } finally {
      disposeOfflineWatch();
      this.saveControllers.delete(controller);
      this.setSaving(bagId, false);
      this.setSavingProgress(bagId, null);
    }
  }

  /**
   * 조용한 자동 갱신 (OF-2). 저장된 여행의 상세를 온라인에서 열 때 부른다. 실패는 알리지 않는다.
   * 방금 저장·갱신했으면(1분 안) 건너뛴다. 코스·포인트 영역이 이미 받은 지도 팩 안이면 팩·등고선을
   * 다시 받지 않는다(OF-2).
   */
  public async refreshSilently(bagId: string): Promise<void> {
    const entry = this.getEntry(bagId);

    if (
      !entry ||
      this.isSaving(bagId) ||
      !this.networkStatus.isOnline() ||
      !this.entitlement.isEntitled()
    ) {
      return;
    }

    const elapsed = Date.now() - Date.parse(entry.savedAt);

    if (
      Number.isFinite(elapsed) &&
      elapsed < SILENT_REFRESH_INTERVAL_MS &&
      !OfflineManifest.needsUpgrade(entry)
    ) {
      return;
    }

    try {
      await this.save(bagId, { reuseMapPack: true });
    } catch {
      // OF-2: 조용한 갱신은 실패해도 알리지 않는다 — 기존 저장본이 남는다.
    }
  }

  public async remove(bagId: string): Promise<void> {
    await this.runForBag(bagId, () => this.removeNow(bagId));
  }

  private async removeNow(bagId: string): Promise<void> {
    OfflineTripFiles.deleteQuietly(OfflineTripFiles.getTripDirectory(bagId));
    OfflineTripFiles.deleteQuietly(OfflineTripFiles.getTempDirectory(bagId));
    OfflineTripFiles.deleteQuietly(OfflineTripFiles.getBackupDirectory(bagId));
    // 지도 팩도 함께 지운다(OF-2). 실패는 개발자 로그로 남고, 남은 팩은 다음 초기화의 고아 정리가 지운다.
    await OfflineMapPack.remove(bagId).catch(noop);

    if (!this.entries.some(entry => entry.bagId === bagId)) {
      return;
    }

    runInAction(() => {
      this.entries = this.entries.filter(entry => entry.bagId !== bagId);
    });
    await OfflineManifest.save(this.entries);
  }

  // 로그아웃·탈퇴(OF-2) — 같은 기기에 다른 사람이 로그인해도 남의 여행이 보이지 않게 전부 지운다.
  public async removeAll(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    // 지금 진행 중이거나 줄 선 저장은 끝나도 항목을 다시 넣지 않는다. 받던 등고선·지도 팩은 끊는다 —
    // 받는 Promise가 거부되어 여행별 줄이 비므로 아래 대기가 시간 초과까지 늘어지지 않는다.
    this.generation += 1;
    this.saveControllers.forEach(controller => controller.abort());
    this.saveControllers.clear();

    await this.runExclusive(async () => {
      OfflineTripFiles.deleteQuietly(OfflineTripFiles.getRoot());
      // 지도 팩 포함(OF-2). 실패해도 로그아웃을 막지 않는다 — 다음 초기화의 고아 정리가 지운다.
      await OfflineMapPack.removeAll().catch(noop);
      runInAction(() => {
        this.entries = [];
      });
      await OfflineManifest.clear();
    });
  }

  /**
   * 로그아웃 직전(OF-5): 온라인이면 반영 안 된 패킹 체크를 서버에 올려 본다. 3초를 넘기거나 실패하면
   * 버린다 — 로그아웃을 막지 않는다. 인증이 살아 있을 때(signOut 전) 불러야 한다.
   */
  public async syncPendingPackingBeforeLogout(): Promise<void> {
    if (!this.isSupported() || !this.networkStatus.isOnline()) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<void>(resolve => {
      timeoutId = setTimeout(resolve, LOGOUT_PACKING_SYNC_TIMEOUT_MS);
    });

    try {
      await Promise.race([this.syncPendingPacking().catch(noop), timeout]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // 저장본을 읽는다(OF-5 · OF-6). 없거나 깨졌거나 남의 것이면 `null`.
  public async load(bagId: string): Promise<OfflineTripSnapshotData | null> {
    const entry = this.getEntry(bagId);

    if (!entry) {
      return null;
    }

    try {
      const file = OfflineTripFiles.getSnapshotFile(
        OfflineTripFiles.getTripDirectory(bagId)
      );

      if (!file.exists) {
        return null;
      }

      const snapshot = parseOfflineSnapshot(await file.text());

      if (!snapshot || snapshot.ownerId !== entry.ownerId) {
        return null;
      }

      return snapshot;
    } catch (error) {
      console.warn('[OfflineTripStore] 저장본 읽기 실패', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  // 저장본의 등고선(OF-6). 없거나(계산 실패·구버전) 깨졌으면 `null` — 지도는 음영만 그린다.
  public async loadContours(
    bagId: string
  ): Promise<OfflineContourCollection | null> {
    if (!this.getEntry(bagId)) {
      return null;
    }

    try {
      const file = OfflineTripFiles.getContoursFile(
        OfflineTripFiles.getTripDirectory(bagId)
      );

      if (!file.exists) {
        return null;
      }

      const data: unknown = JSON.parse(await file.text());

      return isOfflineContourCollection(data) ? data : null;
    } catch (error) {
      console.warn('[OfflineTripStore] 등고선 읽기 실패', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  // 저장본의 지도 팩 영역 `[west, south, east, north]`(OF-1). 저장하지 않았거나 팩이 없으면 `null`.
  public async getMapBounds(
    bagId: string
  ): Promise<OfflineLngLatBounds | null> {
    return (await this.load(bagId))?.mapBounds ?? null;
  }

  /**
   * 패킹 상태를 저장본에 쓴다 (OF-5). `pending`이면 서버 반영 대기로 표시한다(오프라인 토글).
   * 온라인에서 서버에 저장한 직후에는 `pending: false`로 불러 저장본만 맞춘다. 저장하지 않은 여행이면 false.
   */
  public async updatePacking(
    bagId: string,
    packing: OfflinePackingState,
    pending: boolean
  ): Promise<boolean> {
    return this.runForBag(bagId, () =>
      this.updatePackingNow(bagId, packing, pending)
    );
  }

  private async updatePackingNow(
    bagId: string,
    packing: OfflinePackingState,
    pending: boolean
  ): Promise<boolean> {
    const snapshot = await this.load(bagId);

    if (!snapshot) {
      return false;
    }

    // 옵셔널 패킹 필드는 새 값에서 다시 정한다 — 완료를 풀면 `packingCompletedAt` 키가 사라져야 한다.
    const {
      packingStartedAt: _previousStartedAt,
      packingCompletedAt: _previousCompletedAt,
      ...bag
    } = snapshot.bag;
    const next: OfflineTripSnapshotData = {
      ...snapshot,
      pendingPacking: pending,
      bag: {
        ...bag,
        packedGears: [...packing.packedGears],
        ...(packing.packingStartedAt
          ? { packingStartedAt: packing.packingStartedAt }
          : {}),
        ...(packing.packingCompletedAt
          ? { packingCompletedAt: packing.packingCompletedAt }
          : {}),
      },
    };

    const tripDirectory = OfflineTripFiles.getTripDirectory(bagId);
    const previousSnapshotBytes =
      OfflineTripFiles.getSnapshotFile(tripDirectory).size || 0;
    let snapshotBytes = 0;

    try {
      snapshotBytes = this.writeSnapshotFile(tripDirectory, next);
    } catch (error) {
      console.warn('[OfflineTripStore] 패킹 저장본 쓰기 실패', error); // l10n-ignore: 개발자 로그

      return false;
    }

    const entry = this.getEntry(bagId);
    // 저장본 크기가 바뀌었으니 목록의 크기(`저장됨 · 1.8MB`)도 맞춘다 — GPX 몫은 그대로다.
    const bytes = Math.max(
      0,
      (entry?.bytes ?? 0) - previousSnapshotBytes + snapshotBytes
    );

    if (entry && (entry.pendingPacking !== pending || entry.bytes !== bytes)) {
      this.upsertEntry({ ...entry, pendingPacking: pending, bytes });
      await OfflineManifest.save(this.entries);
    }

    return true;
  }

  /**
   * 오프라인 패킹 체크를 서버에 반영한다 (OF-5). 실패한 여행은 `pendingPacking`을 그대로 두어 다음
   * 온라인 진입에서 다시 시도한다. 한 건이라도 반영되면 `offline_packing_synced`(`count`)를 남긴다.
   */
  public async syncPendingPacking(): Promise<void> {
    // 이미 반영 중이면 그 반영을 함께 기다린다(로그아웃 직전 반영이 끝을 볼 수 있게).
    if (this.syncing) {
      return this.syncing;
    }

    if (!this.networkStatus.isOnline()) {
      return;
    }

    const pending = this.getEntries().filter(entry => entry.pendingPacking);

    if (pending.length === 0) {
      return;
    }

    const run = this.syncPendingEntries(pending.map(entry => entry.bagId));

    this.syncing = run;

    try {
      await run;
    } finally {
      this.syncing = null;
    }
  }

  private async syncPendingEntries(bagIds: string[]): Promise<void> {
    let count = 0;

    for (const bagId of bagIds) {
      try {
        await this.runForBag(bagId, () => this.syncPacking(bagId));
        count += 1;
      } catch (error) {
        console.warn('[OfflineTripStore] 패킹 서버 반영 실패', error); // l10n-ignore: 개발자 로그
      }
    }

    if (count > 0) {
      app.getAnalyticsManager()?.logEvent('offline_packing_synced', { count });
    }
  }

  // 저장해 둔 GPX 원본(OF-6 GPX 내보내기). 저장하지 않은 코스면 `null`.
  public findRouteFile(storagePath: string): File | null {
    return OfflineTripFiles.findRouteFileByStoragePath(storagePath);
  }

  /**
   * 한 여행의 패킹을 서버에 덮어쓴다(마지막 토글 기준 — OF-5). 쓰는 필드는 온라인 패킹(PK-2)과 같다:
   * `packedGears` 통째, `packingStartedAt`(있으면), 완료면 `packingCompletedAt`, 아니면 그 필드 삭제.
   */
  private async syncPacking(bagId: string): Promise<void> {
    const snapshot = await this.load(bagId);

    if (!snapshot || !snapshot.pendingPacking) {
      return;
    }

    const { packedGears, packingStartedAt, packingCompletedAt } = snapshot.bag;

    const saving = this.bagStore.savePacking(bagId, packedGears, {
      ...(packingStartedAt ? { packingStartedAt } : {}),
      ...(packingCompletedAt
        ? { packingCompletedAt }
        : { removePackingCompletedAt: true }),
    });
    const finished = await waitWithTimeout(saving, PACKING_SYNC_TIMEOUT_MS);

    if (!finished) {
      throw new Error('packing sync timed out');
    }

    // 이미 끝났다 — 실패였으면 여기서 그대로 던진다.
    await saving;

    await this.updatePackingNow(
      bagId,
      {
        packedGears,
        ...(packingStartedAt ? { packingStartedAt } : {}),
        ...(packingCompletedAt ? { packingCompletedAt } : {}),
      },
      false
    );
  }

  /**
   * 저장본 한 벌을 쓴다 (OF-1 · OF-2). 순서: 스냅샷 원료·GPX → 영역 → 등고선 → 스냅샷 → **지도 팩** →
   * 디렉터리 교체. 팩은 `bagId` 메타데이터로 찾으므로 디렉터리와 독립이라 교체 **전에** 받는다 — 팩을
   * 못 받으면 던져서 임시 디렉터리만 지우면 된다(지도 없는 저장본을 남기지 않는다, 기존 저장본은 그대로).
   */
  private async writeSnapshot(
    bagId: string,
    tempDirectory: Directory,
    generation: number,
    options: OfflineSaveOptions,
    signal: AbortSignal
  ): Promise<{ entry: OfflineManifestEntry; hasContours: boolean }> {
    const userId = this.firebase.getUserId();
    const source = await this.bagStore.getOfflineSource(bagId);

    if (!userId || !source) {
      throw new OfflineSaveError(OfflineSaveErrorType.NotFound);
    }

    const bag = toOfflineBagData(source.bag);
    const [routes, points, linkedGroupCount, campSpot] = await Promise.all([
      this.bagRouteStore.getRouteDataList(bagId),
      this.bagPointStore.getPointDataList(bagId),
      this.groupStore
        .getGroupsByBag(bagId)
        .then(groups => groups.length)
        .catch(() => 0),
      this.loadCampSpot(bag.location),
    ]);

    OfflineTripFiles.deleteQuietly(tempDirectory);
    tempDirectory.create({ intermediates: true, idempotent: true });
    OfflineTripFiles.getRoutesDirectory(tempDirectory).create({
      intermediates: true,
      idempotent: true,
    });

    let bytes = 0;

    // 원본 GPX(내보내기·정밀 경로용, OF-1). 하나라도 못 받으면 저장 전체를 실패로 본다.
    for (const route of routes) {
      if (!route.storagePath) {
        continue;
      }

      const url = await RouteUpload.from(this.firebase).getDownloadUrl(
        route.storagePath
      );
      const file = await File.downloadFileAsync(
        url,
        OfflineTripFiles.getRouteFile(tempDirectory, route.id),
        { idempotent: true }
      );

      bytes += file.size || 0;
    }

    // 지도 팩 영역(OF-1): 코스·포인트 전체 상자를 넓힌 것. 없으면 여행지(박지·위치) 둘레.
    const contentBounds = mergeRouteBounds([
      ...routes.map(route => route.bounds ?? null),
      measureRouteBounds(
        points.map(point => ({ lat: point.latitude, lng: point.longitude }))
      ),
    ]);
    const fallbackLocation = campSpot?.location ?? bag.location;
    const contentMapBounds = getOfflineMapBounds(
      contentBounds,
      fallbackLocation
        ? { lat: fallbackLocation.latitude, lng: fallbackLocation.longitude }
        : null
    );
    // 등고선·지도 팩(무거운 단계) 전에 로그아웃·연결 끊김을 확인한다.
    this.assertCanContinue(generation, signal);

    const reusable = options.reuseMapPack
      ? await this.findReusableMapAssets(
          bagId,
          contentMapBounds,
          tempDirectory,
          signal
        )
      : null;
    const assets: OfflineMapAssets = reusable ?? {
      mapBounds: contentMapBounds,
      ...(await this.writeContours(contentMapBounds, tempDirectory, signal)),
      mapBytes: 0,
      newPackId: null,
    };

    // 등고선 계산이 중단돼 `null`이 됐으면 등고선 없는 저장본을 남기지 않는다.
    this.assertCanContinue(generation, signal);

    bytes += assets.contourBytes;

    const savedAt = new Date().toISOString();
    const snapshot: OfflineTripSnapshotData = {
      schemaVersion: OFFLINE_SNAPSHOT_SCHEMA_VERSION,
      bagId,
      ownerId: userId,
      savedAt,
      pendingPacking: false,
      bag,
      gears: (toPlain(source.gears) ?? []) as unknown as GearData[],
      routes: routes.map(toOfflineRouteData),
      points: points.map(toOfflinePointData),
      campSpot,
      linkedGroupCount,
      mapBounds: assets.mapBounds,
      hasContours: assets.hasContours,
    };

    bytes += this.writeSnapshotFile(tempDirectory, snapshot);

    // 지도 팩(OF-2 `지도 저장 중 · {n}%`). 끝내 못 받으면 저장 전체가 실패한다 — 받던 팩은 지워지고
    // 기존 저장본(과 그 팩)은 그대로 남는다.
    if (!reusable && assets.mapBounds) {
      this.assertCanContinue(generation, signal);
      this.setSavingProgress(bagId, 0);

      try {
        const pack = await OfflineMapPack.download(
          bagId,
          userId,
          assets.mapBounds,
          percentage => {
            this.setSavingProgress(bagId, percentage);
          },
          signal
        );

        assets.mapBytes = pack.bytes;
        assets.newPackId = pack.packId;
      } catch (error) {
        throw new OfflineSaveError(
          error instanceof OfflineMapPackAbortError &&
            this.networkStatus.isOffline()
            ? OfflineSaveErrorType.Offline
            : OfflineSaveErrorType.Unknown
        );
      }
    }

    bytes += assets.mapBytes;

    try {
      // 받는 사이 로그아웃(`removeAll`)됐으면 자리를 차지하지 않는다.
      if (generation !== this.generation) {
        throw new OfflineSaveError(OfflineSaveErrorType.Unknown);
      }

      // 다 쓴 뒤에만 자리를 바꾼다 — 그 전에 실패하면 기존 저장본이 남는다(OF-2).
      OfflineTripFiles.replaceTripDirectory(bagId, tempDirectory);
    } catch (error) {
      if (assets.newPackId) {
        await OfflineMapPack.removePack(assets.newPackId).catch(noop);
      }

      throw error;
    }

    // 새 저장본이 자리를 잡았으니 옛 팩(·받다 만 팩)을 지운다. 실패해도 저장은 성공이다.
    if (assets.newPackId) {
      await OfflineMapPack.removeExcept(bagId, assets.newPackId).catch(noop);
    } else if (!assets.mapBounds) {
      // 영역이 없어 팩 없이 저장했다 — 예전에 받은 팩이 남아 있으면 지운다.
      await OfflineMapPack.remove(bagId).catch(noop);
    }

    const entry: OfflineManifestEntry = {
      bagId,
      ownerId: userId,
      name: bag.name,
      startDate: bag.startDate,
      endDate: bag.endDate,
      bytes,
      mapBytes: assets.mapBytes,
      savedAt,
      schemaVersion: OFFLINE_SNAPSHOT_SCHEMA_VERSION,
      pendingPacking: false,
      routeCount: routes.length,
      pointCount: points.length,
    };

    return { entry, hasContours: assets.hasContours };
  }

  // 로그아웃(`removeAll` — 세대 값 변경)·중단(연결 끊김)이면 저장을 끝낸다.
  private assertCanContinue(generation: number, signal: AbortSignal) {
    if (generation !== this.generation) {
      throw new OfflineSaveError(OfflineSaveErrorType.Unknown);
    }

    if (signal.aborted) {
      throw new OfflineSaveError(
        this.networkStatus.isOffline()
          ? OfflineSaveErrorType.Offline
          : OfflineSaveErrorType.Unknown
      );
    }
  }

  /**
   * 조용한 자동 갱신(OF-2)에서 지도 팩을 다시 쓸 수 있으면 그 값을 돌려준다 — 새 영역이 기존 팩 영역 안에
   * 들어오고(또는 둘 다 없음), 기존 저장본이 지금 스키마일 때. 등고선도 기존 파일을 임시 디렉터리로 옮겨
   * 다시 계산하지 않는다(팩 영역 기준으로 계산한 것이다). 다시 쓸 수 없으면 `null`.
   */
  private async findReusableMapAssets(
    bagId: string,
    contentMapBounds: OfflineLngLatBounds | null,
    tempDirectory: Directory,
    signal: AbortSignal
  ): Promise<OfflineMapAssets | null> {
    const entry = this.getEntry(bagId);

    if (!entry || OfflineManifest.needsUpgrade(entry)) {
      return null;
    }

    const previous = await this.load(bagId);

    if (!previous) {
      return null;
    }

    if (!contentMapBounds) {
      // 영역이 없으면 팩도 필요 없다 — 기존 팩은 저장 뒤 지운다(새로 받을 것이 없다).
      return null;
    }

    const packBounds = await OfflineMapPack.getBounds(bagId).catch(() => null);

    if (
      !packBounds ||
      !previous.mapBounds ||
      !isLngLatBoundsInside(contentMapBounds, packBounds)
    ) {
      return null;
    }

    let hasContours = false;
    let contourBytes = 0;

    try {
      const contours = OfflineTripFiles.getContoursFile(
        OfflineTripFiles.getTripDirectory(bagId)
      );

      if (previous.hasContours && contours.exists) {
        const target = OfflineTripFiles.getContoursFile(tempDirectory);

        contours.copy(target);
        hasContours = true;
        contourBytes = target.size || 0;
      }
    } catch (error) {
      console.warn('[OfflineTripStore] 등고선 복사 실패', error); // l10n-ignore: 개발자 로그
    }

    if (!hasContours) {
      const written = await this.writeContours(
        previous.mapBounds,
        tempDirectory,
        signal
      );

      hasContours = written.hasContours;
      contourBytes = written.contourBytes;
    }

    return {
      mapBounds: previous.mapBounds,
      hasContours,
      contourBytes,
      mapBytes: entry.mapBytes,
      newPackId: null,
    };
  }

  // 등고선을 계산해 `contours.json`으로 쓴다(OF-6). 실패해도 저장을 막지 않는다 — 파일 없이 `false`.
  private async writeContours(
    mapBounds: OfflineLngLatBounds | null,
    directory: Directory,
    signal: AbortSignal
  ): Promise<{ hasContours: boolean; contourBytes: number }> {
    if (!mapBounds) {
      return { hasContours: false, contourBytes: 0 };
    }

    const contours = await buildOfflineContours(mapBounds, { signal });

    if (!contours) {
      return { hasContours: false, contourBytes: 0 };
    }

    try {
      const file = OfflineTripFiles.getContoursFile(directory);

      if (!file.exists) {
        file.create({ intermediates: true });
      }

      file.write(JSON.stringify(contours));

      return { hasContours: true, contourBytes: file.size || 0 };
    } catch (error) {
      // 디스크 부족이면 이어지는 쓰기도 실패해 저장 전체가 `저장 공간이 부족해요`로 끝난다.
      console.warn('[OfflineTripStore] 등고선 쓰기 실패', error); // l10n-ignore: 개발자 로그

      try {
        const file = OfflineTripFiles.getContoursFile(directory);

        if (file.exists) {
          file.delete();
        }
      } catch {
        // 반쯤 쓴 파일이 남아도 `hasContours: false`라 읽지 않는다.
      }

      return { hasContours: false, contourBytes: 0 };
    }
  }

  // 스냅샷 파일을 쓰고 크기(바이트)를 돌려준다.
  private writeSnapshotFile(
    directory: Directory,
    snapshot: OfflineTripSnapshotData
  ): number {
    const file = OfflineTripFiles.getSnapshotFile(directory);

    if (!file.exists) {
      file.create({ intermediates: true });
    }

    file.write(JSON.stringify(snapshot));

    return file.size || 0;
  }

  // 여행지 박지(DM-17, CS-4 주의사항 포함). 삭제·비활성 박지는 박지로 취급하지 않는다(DST-7).
  private async loadCampSpot(location: BagLocation | null) {
    const campSpotId = location?.campSpotId;

    if (!campSpotId) {
      return null;
    }

    try {
      const spot = await this.campSpotStore.getSpot(campSpotId);

      return spot && spot.status === 'active'
        ? toOfflineCampSpotData(spot)
        : null;
    } catch (error) {
      console.warn('[OfflineTripStore] 박지 조회 실패', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  // §6: 저장 중 앱이 꺼져 남은 임시 디렉터리·매니페스트에 없는 디렉터리를 지운다.
  private removeOrphanDirectories() {
    try {
      const root = OfflineTripFiles.getRoot();

      if (!root.exists) {
        return;
      }

      const known = new Set(this.entries.map(entry => entry.bagId));

      root.list().forEach(item => {
        if (item instanceof Directory && !known.has(item.name)) {
          OfflineTripFiles.deleteQuietly(item);
        }
      });
    } catch (error) {
      console.warn('[OfflineTripStore] 저장본 정리 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  // 갱신 실패 뒤 저장본 자리가 비었으면(되돌리기도 실패) 매니페스트에서도 뺀다 — 열 수 없는 항목을 남기지 않는다.
  private async dropEntryIfFilesMissing(bagId: string): Promise<void> {
    const exists = OfflineTripFiles.getSnapshotFile(
      OfflineTripFiles.getTripDirectory(bagId)
    ).exists;

    if (exists || !this.entries.some(entry => entry.bagId === bagId)) {
      return;
    }

    runInAction(() => {
      this.entries = this.entries.filter(entry => entry.bagId !== bagId);
    });
    await OfflineManifest.save(this.entries);
  }

  // 같은 여행의 쓰기를 한 줄로 세운다. 앞선 작업이 실패해도 다음 작업은 돈다. 전부 지우기가 끝난 뒤에 돈다.
  private runForBag<T>(bagId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.bagQueues.get(bagId) ?? Promise.resolve();
    const result = Promise.all([previous, this.globalQueue]).then(task);
    const tail = result.then(noop, noop);

    this.bagQueues.set(bagId, tail);
    void tail.then(() => {
      if (this.bagQueues.get(bagId) === tail) {
        this.bagQueues.delete(bagId);
      }
    });

    return result;
  }

  // 모든 여행의 줄이 빈 뒤 혼자 돈다(전부 지우기). 그동안 새로 들어온 쓰기는 이 작업 뒤로 선다.
  // 여행별 작업이 멈춰도 `OFFLINE_QUEUE_DRAIN_TIMEOUT_MS`를 넘기면 기다리지 않고 돈다.
  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const drain = Promise.all([this.globalQueue, ...this.bagQueues.values()]);
    const result = waitWithTimeout(drain, OFFLINE_QUEUE_DRAIN_TIMEOUT_MS).then(
      drained => {
        if (!drained) {
          console.warn('[OfflineTripStore] 여행 작업 대기 시간 초과'); // l10n-ignore: 개발자 로그
        }

        return task();
      }
    );

    this.globalQueue = result.then(noop, noop);

    return result;
  }

  private upsertEntry(entry: OfflineManifestEntry) {
    const others = this.entries.filter(item => item.bagId !== entry.bagId);

    this.entries = [...others, entry];
  }

  private setSavingProgress(bagId: string, percentage: number | null) {
    if (percentage === null) {
      this.savingProgress.delete(bagId);

      return;
    }

    this.savingProgress.set(bagId, Math.round(percentage));
  }

  private setSaving(bagId: string, saving: boolean) {
    const others = this.savingIds.filter(id => id !== bagId);

    this.savingIds = saving ? [...others, bagId] : others;
  }
}

export default OfflineTripStore;
