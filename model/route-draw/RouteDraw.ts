import { Directory, File, Paths } from 'expo-file-system';
import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import { measureRouteBounds } from '@/model/route/RouteCamera';
import { RouteCoordinate, RouteDraft } from '@/model/route/RouteData';
import {
  measureElevationGain,
  measureElevationLoss,
} from '@/model/route/RouteElevation';
import { getRouteErrorMessage } from '@/model/route/RouteErrorMessage';
import RouteExport from '@/model/route/RouteExport';
import RouteSource from '@/model/route/RouteSource';
import RouteValidator from '@/model/route/RouteValidator';
import RouteTrailFailReason from '@/model/route-trail/RouteTrailFailReason';
import { RouteTrailResult } from '@/model/route-trail/RouteTrailResult';
import RouteTrailService from '@/model/route-trail/RouteTrailService';
import { openSubscription } from '@/model/subscription/OpenSubscription';
import SubscriptionEntryPoint from '@/model/subscription/SubscriptionEntryPoint';
import TerrainElevation from '@/model/terrain/TerrainElevation';
import RouteDrawClaimResult from './RouteDrawClaimResult';
import { RouteDrawEditableRoute } from './RouteDrawEditableRoute';
import RouteDrawEntry from './RouteDrawEntry';
import { writeRouteDrawGpx } from './RouteDrawGpxWriter';
import RouteDrawMode from './RouteDrawMode';
import { RouteDrawPoint } from './RouteDrawPoint';
import { restoreRouteDrawSegments } from './RouteDrawRestore';
import { sampleRouteDrawPath } from './RouteDrawSampler';
import RouteDrawSearch from './RouteDrawSearch';
import { RouteDrawSegment } from './RouteDrawSegment';
import RouteDrawSegmentMode from './RouteDrawSegmentMode';
import RouteDrawSource from './RouteDrawSource';
import {
  RouteDrawStartCamera,
  RouteDrawStartFocus,
} from './RouteDrawStartFocus';
import { RouteDrawParent, RouteDrawTarget } from './RouteDrawTarget';

/**
 * 화면(배낭·그룹)이 주입하는 일 (RD-3).
 *
 * - `parent`: 코스가 사는 곳(배낭·그룹 id) — 무료 1회 기록(RD-8)·수정 대상(`routeTrail editing`)이 쓴다.
 * - `canSubmit`: 새 코스를 올릴 수 있는지 미리 본다(코스 상한 5개 등 — 업로드가 거절될 이유). 막히면 그 사유 문구,
 *   통과하면 `null`. 무료 1회 기록(RD-8) **전에** 부른다 — 어차피 거절될 저장에 무료 1회를 정하지 않게.
 * - `createRouteId`: 새 코스 문서 id를 미리 발급한다 — 무료 1회를 그 id로 정한 뒤 **같은 id로** 올린다(RD-8).
 * - `submit`: 만든 코스를 그 id로 올린다 — 디스패처 호출·목록 갱신까지 맡고 올린 코스 id를 돌려준다. 실패하면 사유를
 *   직접 토스트하고(가져오기와 같은 문구) `null`.
 * - `update`: 그린 코스를 고친 것을 같은 문서·같은 Storage 경로에 덮어쓴다(RD-7). 실패 처리는 `submit`과 같다.
 * - `onSaved`: 저장이 끝나 **모드를 나간 뒤** 불린다 — 올린 코스를 골라 카메라를 맞춘다(배낭 `focusEntry`, 그룹
 *   `focusRoute`). 모드를 먼저 나가야 카메라 맞춤이 하단 바가 아니라 다시 올라온 시트 높이를 비운다.
 * - `resolveDefaultName`: 이름 입력 시트의 기본값(배낭 `{여행지} 코스`, 그룹 `{그룹} 코스`). 못 구하면 빈 문자열.
 * - `resolveStartFocus`: 새로 그리기를 시작할 때 카메라를 옮길 여행지(RD-9 #2 — 배낭 여행지, 그룹 박지). 없으면 `null`이고
 *   그때는 위치 검색 인풋이 `어디서부터 그릴지 검색해 보세요`로 안내한다.
 */
export interface RouteDrawHost {
  parent: RouteDrawParent;
  canSubmit: () => string | null;
  createRouteId: () => string;
  submit: (
    draft: RouteDraft,
    localUri: string,
    routeId: string
  ) => Promise<string | null>;
  update: (
    routeId: string,
    draft: RouteDraft,
    localUri: string
  ) => Promise<string | null>;
  onSaved: (routeId: string) => void;
  resolveDefaultName: () => Promise<string>;
  resolveStartFocus?: () => RouteDrawStartFocus | null;
}

// 찍을 수 있는 점 상한(RD-2).
export const ROUTE_DRAW_MAX_POINTS = 100;
// 직전 점과 이보다 가까우면 두 번 눌림으로 보고 무시한다(m, RD-2).
export const ROUTE_DRAW_MIN_GAP_METERS = 5;
// 업로드할 GPX를 잠깐 쓰는 앱 캐시 아래 폴더(RD-3 4번). 업로드가 끝나면 파일을 지운다.
const CACHE_DIRECTORY = 'route-draw';
// 길 좌표 끝이 찍은 점에서 이보다 멀면 찍은 점을 덧붙여 잇는다(m) — 가까우면 찍은 점 자리로 바꿔 끼운다.
const TRAIL_ANCHOR_GAP_METERS = 1;
// 같은 세션에서 길 찾기가 이만큼 연달아 실패하면 "길 정보가 없는 지역" 안내로 바꾼다(RD-6, 한 번만).
const TRAIL_FAILURE_HINT_STREAK = 3;
// 이름 시트(RN Modal)가 다 내려간 뒤 구독 화면을 연다(ms) — 모달이 닫히는 중에 다른 화면을 띄우면 iOS가 무시한다.
const PAYWALL_AFTER_SHEET_MS = 400;

/**
 * 앱 세션 동안의 기억 (RD-6 — 기기 저장 안 함). 화면을 떠나면 `RouteDraw` 인스턴스가 버려지므로 모듈에 둔다.
 * - `trailEnabled`: `등산로 따라` 토글(기본 켬).
 * - `failureHintShown`: 연속 실패 안내를 이미 띄웠는지(한 번만).
 * - `trailPaywallShown`: 길 따라가 권한 없음(RD-8 `not_entitled`)으로 거절돼 구독 화면을 이미 열었는지 — 자동으로는
 *   한 번만 열고, 그 뒤로는 토스트로만 알린다.
 */
const routeDrawSession = {
  trailEnabled: true,
  failureHintShown: false,
  trailPaywallShown: false,
};

// 수정을 열었을 때의 모양(RD-7) — 이것과 다르면 "바뀐 것이 있다"(저장 활성·취소 확인).
interface RouteDrawEditBaseline {
  pointCount: number;
  segmentIds: string;
}

// 고치는 코스(RD-7). 저장은 이 id의 문서를 덮어쓴다.
interface RouteDrawEditing {
  routeId: string;
}

const toRouteCoordinate = (point: RouteDrawPoint): RouteCoordinate => ({
  lat: point.latitude,
  lng: point.longitude,
});

const toSegmentIds = (segments: readonly RouteDrawSegment[]) =>
  segments.map(segment => segment.id).join(',');

const measureCoordinatesDistance = (
  coordinates: readonly RouteCoordinate[]
): number => {
  let distance = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    distance += getDistanceInMeters(
      {
        latitude: coordinates[index - 1].lat,
        longitude: coordinates[index - 1].lng,
      },
      { latitude: coordinates[index].lat, longitude: coordinates[index].lng }
    );
  }

  return distance;
};

// 길 좌표의 두 끝을 찍은 점에 붙인다 — 찍은 점은 저장 샘플에 그대로 남아야 하고(RD-3), 선이 점에서 끊겨 보이면 안 된다.
const anchorTrailCoordinates = (
  from: RouteDrawPoint,
  to: RouteDrawPoint,
  coordinates: readonly RouteCoordinate[]
): RouteCoordinate[] => {
  const anchored = [...coordinates];
  const head = anchored[0];
  const tail = anchored[anchored.length - 1];
  const fromCoordinate = toRouteCoordinate(from);
  const toCoordinate = toRouteCoordinate(to);

  if (
    measureCoordinatesDistance([fromCoordinate, head]) < TRAIL_ANCHOR_GAP_METERS
  ) {
    anchored[0] = {
      ...fromCoordinate,
      ...(head.ele !== undefined ? { ele: head.ele } : {}),
    };
  } else {
    // 덧붙인 찍은 점은 이웃한 길 좌표의 고도를 물려받는다 — 길 따라만 쓴 코스가 지형 타일을 읽지 않게.
    anchored.unshift({
      ...fromCoordinate,
      ...(head.ele !== undefined ? { ele: head.ele } : {}),
    });
  }

  if (
    measureCoordinatesDistance([tail, toCoordinate]) < TRAIL_ANCHOR_GAP_METERS
  ) {
    anchored[anchored.length - 1] = {
      ...toCoordinate,
      ...(tail.ele !== undefined ? { ele: tail.ele } : {}),
    };
  } else {
    anchored.push({
      ...toCoordinate,
      ...(tail.ele !== undefined ? { ele: tail.ele } : {}),
    });
  }

  return anchored;
};

/**
 * 지도에서 점을 찍어 만드는 코스 (RD-1 ~ RD-6). 같은 지도 화면 안의 **모드**라 화면이 인스턴스 하나를 들고,
 * 모드에 들어가고(`start`) 나가는(`cancel`·저장 성공) 상태도 여기 둔다 — 화면을 떠나면 인스턴스와 함께 버려진다
 * (기기 저장 없음, §8).
 *
 * 저장은 "샘플링 → 고도 보강 → 상승·하강 → GPX 생성 → 캐시 파일 → 올리기(`RouteDrawSubmitter`) → 정리" 순서다.
 * 올리기 이후(검증·Storage·Firestore·상한 검사)는 가져오기와 **같은 디스패처 경로**라 데이터 계약이 바뀌지 않는다.
 */
class RouteDraw {
  private active = false;
  // 새로 그리기 / 그린 코스 수정(RD-7).
  private mode = RouteDrawMode.New;
  private editing: RouteDrawEditing | null = null;
  private editBaseline: RouteDrawEditBaseline | null = null;
  // 새로 그린 코스의 문서 id(RD-8) — 첫 저장 시도에 발급하고, 실패해 다시 저장할 때 **같은 id**를 쓴다(무료 1회 재요청이
  // 같은 코스로 통과한다). 모드를 나가면 버린다.
  private pendingRouteId: string | null = null;
  // 구독 화면에서 권한을 얻고 들어왔는지(SUB-12 `onEntitled`). 권한 판단이 아직 따라오지 못했어도 무료 1회를 쓰지 않는다.
  private entitledByPurchase = false;
  private points: RouteDrawPoint[] = [];
  // 찍은 점 `i` → `i+1` 구간(RD-6). 언제나 `points.length − 1`개(점이 없으면 0개)다.
  private segments: RouteDrawSegment[] = [];
  private trailEnabled = routeDrawSession.trailEnabled;
  // 이번 세션에서 길 찾기가 연달아 실패한 횟수 — 성공하면 0으로 돌아간다.
  private trailFailureStreak = 0;
  private nextSegmentId = 1;
  // 모드에 들어가고 나갈 때마다 올린다 — 큐에 남은 요청·늦게 온 응답이 다음 그리기에 섞이지 않게(RD-6).
  private generation = 0;
  // 길 찾기 직렬 큐 — 찍은 순서대로 하나씩 처리한다(RD-6).
  private trailQueue: Promise<void> = Promise.resolve();
  private readonly trailService = RouteTrailService.new();
  // 길을 찾는 중인 구간의 취소 함수(구간 id별) — 되돌리기·취소·화면 이탈로 구간이 사라지면 기다리지 않고 다음 차례로 넘어간다.
  private readonly trailCancels = new Map<number, () => void>();
  private saving = false;
  private nameSheetVisible = false;
  // 이름 시트를 열 때마다 올린다 — 시트가 이 값을 `key`로 받아 새로 마운트되면서 입력이 기본값으로 돌아간다.
  private nameSheetKey = 0;
  private defaultName = '';
  // 모드에 들어갈 때마다 올린다 — 늦게 온 기본 이름이 다음 그리기에 섞이지 않게.
  private sessionSeq = 0;
  // 위치 검색(RD-5) — 모드에 들어가고 나갈 때 함께 비운다.
  private readonly search: RouteDrawSearch;
  // 새로 그리기 시작 카메라(RD-9 #2) — 지도가 받아 한 번 옮긴다. 모드를 나가면 비운다.
  private startCamera: RouteDrawStartCamera | null = null;
  private startCameraSeq = 0;

  public static from(source: RouteDrawSource, host: RouteDrawHost) {
    return new RouteDraw(source, host);
  }

  private constructor(
    private readonly source: RouteDrawSource,
    private readonly host: RouteDrawHost
  ) {
    this.search = RouteDrawSearch.from(source);
    makeAutoObservable<
      RouteDraw,
      | 'source'
      | 'host'
      | 'sessionSeq'
      | 'search'
      | 'nextSegmentId'
      | 'generation'
      | 'trailQueue'
      | 'trailService'
      | 'trailFailureStreak'
      | 'trailCancels'
      | 'startCameraSeq'
    >(this, {
      source: false,
      host: false,
      sessionSeq: false,
      search: false,
      nextSegmentId: false,
      generation: false,
      trailQueue: false,
      trailService: false,
      trailFailureStreak: false,
      trailCancels: false,
      startCameraSeq: false,
    });
  }

  public getSearch(): RouteDrawSearch {
    return this.search;
  }

  public isActive(): boolean {
    return this.active;
  }

  // 새로 그리기에 들어갈 때 옮길 카메라(RD-9 #2). 여행지가 없거나 수정 모드면 `null`.
  public getStartCamera(): RouteDrawStartCamera | null {
    return this.startCamera;
  }

  public isSaving(): boolean {
    return this.saving;
  }

  public isNameSheetVisible(): boolean {
    return this.nameSheetVisible;
  }

  public getNameSheetKey(): number {
    return this.nameSheetKey;
  }

  public getDefaultName(): string {
    return this.defaultName || app.getL10n().t('routeDraw.fallbackName');
  }

  public getPoints(): readonly RouteDrawPoint[] {
    return this.points;
  }

  public getPointCount(): number {
    return this.points.length;
  }

  public getSegments(): readonly RouteDrawSegment[] {
    return this.segments;
  }

  // 구간 좌표 길이 합(m) — 길 따라 구간이면 실제 길 거리다. 하단 바 메타가 쓴다(RD-2 · RD-6).
  public getDistance(): number {
    return this.segments.reduce(
      (sum, segment) =>
        sum +
        (segment.distance ?? measureCoordinatesDistance(segment.coordinates)),
      0
    );
  }

  public isTrailEnabled(): boolean {
    return this.trailEnabled;
  }

  // 길을 찾는 중인 구간이 있는지 — 메타 `길 찾는 중…`, 저장 비활성(RD-6).
  public isRouting(): boolean {
    return this.segments.some(segment => segment.pending);
  }

  // `등산로 따라` 토글(RD-6). 이미 그린 구간은 그대로고 다음 구간부터 적용된다. 앱 세션 동안 기억한다.
  public toggleTrail() {
    this.trailEnabled = !this.trailEnabled;
    routeDrawSession.trailEnabled = this.trailEnabled;
  }

  public canUndo(): boolean {
    return this.points.length > 0 && !this.saving;
  }

  // 서로 다른 점이 2개 이상이고 길 찾는 중인 구간이 없을 때만 저장한다(RD-2 · RD-6 · §6 — 모든 점이 한 자리면 선이 아니다).
  public canSave(): boolean {
    if (this.saving || this.points.length < 2 || this.isRouting()) {
      return false;
    }

    // 수정은 바뀐 것이 있을 때만 저장한다(RD-7).
    if (this.mode === RouteDrawMode.Edit && !this.hasChanges()) {
      return false;
    }

    const first = this.points[0];

    return this.points.some(
      point => getDistanceInMeters(first, point) >= ROUTE_DRAW_MIN_GAP_METERS
    );
  }

  // 취소할 때 확인을 물을지 — 새로 그리기는 2점 이상이면, 수정은 바뀐 것이 있으면 버리는 것이 있다(RD-2 · RD-7).
  public needsDiscardConfirm(): boolean {
    if (this.mode === RouteDrawMode.Edit) {
      return this.hasChanges();
    }

    return this.points.length >= 2;
  }

  // 그린 코스를 고치는 중인지(RD-7) — 안내 줄 첫 문구·취소 확인 문구가 갈린다.
  public isEditing(): boolean {
    return this.mode === RouteDrawMode.Edit;
  }

  // 수정을 연 뒤 점·구간이 바뀌었는지(RD-7). 새로 그리기에서는 점이 하나라도 있으면 바뀐 것이다.
  public hasChanges(): boolean {
    const baseline = this.editBaseline;

    if (this.mode !== RouteDrawMode.Edit || !baseline) {
      return this.points.length > 0;
    }

    return (
      this.points.length !== baseline.pointCount ||
      toSegmentIds(this.segments) !== baseline.segmentIds
    );
  }

  /**
   * `지도에서 그리기`(RD-1 · RD-8). 그릴 수 있으면 바로 모드에 들어가고, 무료 1회를 썼으면 구독 화면(코스 그리기
   * 진입점 변형, SUB-12)을 연다 — 권한을 얻어 닫히면 그리기를 바로 시작한다. 권한을 못 읽었으면(오프라인 등) 안내만 한다.
   * `entry`는 측정용 진입 경로다(RD-9 — 빈 상태 카드·메뉴·강조 카드).
   */
  public requestStart(entry = RouteDrawEntry.Menu) {
    const entitlement = app.getRouteDrawEntitlement();

    if (entitlement?.canDrawNew()) {
      this.start(false, entry);

      return;
    }

    if (!entitlement?.isLoaded()) {
      this.showToast(app.getL10n().t('routeDraw.onlineToCheck'));

      return;
    }

    const generation = this.generation;

    openSubscription(SubscriptionEntryPoint.RouteDraw, {
      onEntitled: () => {
        // 그사이 화면을 떠났으면(dispose) 아무것도 하지 않는다.
        if (generation !== this.generation) {
          return;
        }

        this.start(true, entry);
      },
    });
  }

  /**
   * 코스 행 `⋯` → `코스 수정`(RD-7 · RD-8). 고칠 수 있으면(플러스이거나 무료로 그린 그 코스) 바로 수정 모드에 들어가고,
   * 아니면 구독 화면을 연다 — 권한을 얻어 닫히면 수정을 바로 시작한다. 권한을 못 읽었으면 안내만 한다.
   */
  public requestEdit(route: RouteDrawEditableRoute) {
    if (!route.isDrawn()) {
      return;
    }

    const entitlement = app.getRouteDrawEntitlement();

    if (entitlement?.canEdit(this.toTarget(route.getId()))) {
      this.startEdit(route);

      return;
    }

    if (!entitlement?.isLoaded()) {
      this.showToast(app.getL10n().t('routeDraw.onlineToCheck'));

      return;
    }

    const generation = this.generation;

    openSubscription(SubscriptionEntryPoint.RouteDraw, {
      onEntitled: () => {
        // 그사이 화면을 떠났으면(dispose) 아무것도 하지 않는다.
        if (generation !== this.generation) {
          return;
        }

        this.startEdit(route, true);
      },
    });
  }

  /**
   * 그리기 모드에 들어간다(RD-1). 기본 이름은 뒤에서 구해 둔다 — 이름 시트를 열 때 이미 있게. 권한 게이트는
   * `requestStart`가 본다 — `entitledByPurchase`는 구독 화면에서 권한을 얻고 들어왔다는 뜻이다(무료 1회를 쓰지 않는다).
   */
  public start(entitledByPurchase = false, entry = RouteDrawEntry.Menu) {
    this.enter(RouteDrawMode.New, entitledByPurchase);
    this.applyStartFocus();
    app.getAnalyticsManager()?.logClick('route_draw_start', {
      source: this.source,
      entry,
    });
    void this.loadDefaultName(this.sessionSeq);
  }

  /**
   * 그린 코스를 이어서 고친다(RD-7). 찍었던 점과 구간을 복원한다 — 구간 좌표는 저장된 축약 좌표를 찍은 점 위치로
   * 잘라 되살리고 **다시 라우팅하지 않는다**(복원 구간은 모두 완료 상태 · 직선으로 두되 좌표는 원래 것이다).
   * 찍은 점이 없는 문서(옛 그린 코스)면 열지 않고 `false`.
   */
  public startEdit(
    route: RouteDrawEditableRoute,
    entitledByPurchase = false
  ): boolean {
    const drawnPoints = route.getDrawnPoints();
    const restored = restoreRouteDrawSegments(
      drawnPoints,
      route.getStoredSimplified()
    );

    if (!route.isDrawn() || restored.length === 0) {
      this.showToast(app.getL10n().t('routeDraw.editUnavailable'));

      return false;
    }

    this.enter(RouteDrawMode.Edit, entitledByPurchase);

    const measured = restored.map(measureCoordinatesDistance);
    const measuredTotal = measured.reduce((sum, value) => sum + value, 0);
    // 저장된 거리(원래 길 좌표로 잰 값)를 구간 길이 비율로 나눈다 — 수정을 연 순간 바 거리가 원래 거리와 같게.
    const scale =
      measuredTotal > 0 && route.getDistance() > 0
        ? route.getDistance() / measuredTotal
        : 1;

    this.points = drawnPoints.map(point => ({
      latitude: point.lat,
      longitude: point.lng,
    }));
    this.segments = restored.map((coordinates, index) => {
      const id = this.nextSegmentId;

      this.nextSegmentId += 1;

      return {
        id,
        mode: RouteDrawSegmentMode.Straight,
        coordinates,
        pending: false,
        distance: measured[index] * scale,
        restored: true,
      };
    });
    this.editing = { routeId: route.getId() };
    this.editBaseline = {
      pointCount: this.points.length,
      segmentIds: toSegmentIds(this.segments),
    };
    this.defaultName = RouteValidator.toRouteName(route.getName());
    app.getAnalyticsManager()?.logClick('route_draw_edit_start', {
      source: this.source,
    });

    return true;
  }

  /**
   * 지도 탭 → 끝에 점을 붙인다(RD-2). 직전 점과 5m 미만이면 무시하고, 100개면 토스트로 알린다.
   * 카메라는 움직이지 않는다(화면이 옮기지 않는다).
   */
  public addPoint(point: RouteDrawPoint) {
    if (!this.active || this.saving) {
      return;
    }

    const last = this.points[this.points.length - 1];

    if (last && getDistanceInMeters(last, point) < ROUTE_DRAW_MIN_GAP_METERS) {
      return;
    }

    if (this.points.length >= ROUTE_DRAW_MAX_POINTS) {
      app
        .getToastManager()
        ?.showSimple(
          app
            .getL10n()
            .t('routeDraw.pointLimit', { max: ROUTE_DRAW_MAX_POINTS })
        );

      return;
    }

    const next: RouteDrawPoint = {
      latitude: point.latitude,
      longitude: point.longitude,
    };

    this.points = [...this.points, next];
    // 점을 찍으면 검색 임시 핀(여행지 핀 포함)과 시작 안내는 사라진다(RD-5 · RD-9 #2).
    this.search.clearPin();
    this.search.clearStartHint();

    if (last) {
      this.addSegment(last, next);
    }
  }

  // 마지막 점과 그 점으로 들어온 구간을 함께 지운다(RD-6). 대기 중이던 요청 결과는 구간 id가 없어 버려진다.
  public undo() {
    if (!this.canUndo()) {
      return;
    }

    const removed = this.segments[this.segments.length - 1];

    this.points = this.points.slice(0, -1);
    this.segments = this.segments.slice(0, this.points.length - 1);

    if (removed) {
      this.cancelTrailRequest(removed.id);
    }
  }

  /**
   * 화면을 떠날 때(호스트 언마운트) 부른다. 대기 중인 길 찾기를 끊고 세대를 올려 늦게 온 응답이 토스트·측정
   * (`route_trail_fail`)·연속 실패 횟수를 건드리지 않게 한다. 그리던 점은 인스턴스와 함께 버려진다(§8).
   */
  public dispose() {
    this.generation += 1;
    this.cancelTrailRequests();
    this.trailQueue = Promise.resolve();
    this.search.clear();
  }

  // 그리던 점을 버리고 모드를 나간다(RD-2). 확인 알럿은 화면이 띄운다.
  public cancel() {
    if (!this.active || this.saving) {
      return;
    }

    app.getAnalyticsManager()?.logClick('route_draw_cancel', {
      source: this.source,
      point_count: this.points.length,
    });
    this.reset();
  }

  // `저장` → 이름 입력 시트(RD-3).
  public requestSave() {
    if (!this.canSave()) {
      return;
    }

    this.nameSheetKey += 1;
    this.nameSheetVisible = true;
  }

  public closeNameSheet() {
    if (this.saving) {
      return;
    }

    this.nameSheetVisible = false;
  }

  /**
   * 저장 (RD-3). 성공하면 모드를 나가고 `true`. 실패하면 사유를 토스트하고 **모드에 남는다**(찍은 점이 그대로다).
   * 고도를 못 읽어도 저장은 계속된다 — 코스 자체는 유효하다.
   */
  public async save(rawName: string): Promise<boolean> {
    if (!this.active || !this.canSave()) {
      return false;
    }

    this.setSaving(true);

    let file: File | null = null;

    try {
      const name = RouteValidator.toRouteName(rawName);
      const segments = this.segments;
      // 저장 거리 = 그릴 때 바에서 본 거리(구간 좌표 길이 합). 샘플 합은 길 좌표를 골라 내 조금 짧다.
      const distance = this.getDistance();
      // 측정은 이번에 새로 그린 구간만 길 따라/직선으로 센다 — 되살린 구간(RD-7)은 원래 모드를 알 수 없어 따로 센다.
      const restoredSegmentCount = segments.filter(
        segment => segment.restored
      ).length;
      const trailSegmentCount = segments.filter(
        segment =>
          !segment.restored && segment.mode === RouteDrawSegmentMode.Trail
      ).length;
      const straightSegmentCount =
        segments.length - restoredSegmentCount - trailSegmentCount;
      // 수정 저장은 되살린 구간이 원래 길 따라였는지 알 수 없어 출처를 항상 붙인다(RD-7 — 빠뜨리면 ODbL 위반).
      const needsTrailAttribution =
        trailSegmentCount > 0 || this.mode === RouteDrawMode.Edit;
      // 되살린 구간(RD-7)은 이미 저장 샘플이라 그대로 잇는다 — 수정할 때마다 선이 성겨지지 않게.
      const samples = sampleRouteDrawPath(
        segments.map(segment => segment.coordinates),
        segments.map(segment => !!segment.restored)
      );
      const coordinates = await RouteDraw.fillElevations(samples);
      const hasElevation = coordinates.every(
        coordinate => coordinate.ele !== undefined
      );
      const elevationValues = coordinates.map(coordinate => coordinate.ele);
      const elevationGain = measureElevationGain(elevationValues);
      const elevationLoss = measureElevationLoss(elevationValues);
      const bounds = measureRouteBounds(coordinates);

      // 샘플이 2점 이상이라 생기지 않지만, 생기면 말없이 끝내지 않는다.
      if (!bounds) {
        app
          .getToastManager()
          ?.showSimple(
            getRouteErrorMessage(
              new GroupError(GroupValidationError.RouteParseFailed)
            )
          );

        return false;
      }

      const gpx = writeRouteDrawGpx({
        name,
        // 길 따라 구간이 있거나 수정 저장이면 경로 데이터 출처를 남긴다(ODbL — RD-6 · RD-7).
        description:
          app.getL10n().t('routeDraw.gpxDescription') +
          (needsTrailAttribution
            ? app.getL10n().t('routeDraw.gpxTrailAttribution')
            : ''),
        time: new Date(),
        coordinates,
      });

      file = RouteDraw.writeCacheFile(name, gpx);

      const draft: RouteDraft = {
        name,
        fileSize: file.size || new TextEncoder().encode(gpx).byteLength,
        distance,
        pointCount: coordinates.length,
        bounds,
        // 샘플은 500점 이하라 그대로 축약 좌표다(DM-29·DM-30).
        simplified: coordinates,
        // 고도가 없으면 키를 생략한다 — 0을 넣으면 "상승 0m"로 읽힌다(DM-30).
        ...(elevationGain !== null ? { elevationGain } : {}),
        ...(elevationLoss !== null ? { elevationLoss } : {}),
        // 그린 코스 표시와 찍은 점 — 수정(RD-7)에서 다시 열고 무료 1회(RD-8)를 가린다(DM-29·DM-30).
        source: RouteSource.Drawn,
        drawnPoints: this.points.map(point => ({
          lat: point.latitude,
          lng: point.longitude,
        })),
      };
      const pointCount = this.points.length;
      const mode = this.mode;
      const routeId = await this.upload(draft, file.uri);

      if (!routeId) {
        return false;
      }

      app.getAnalyticsManager()?.logClick('route_draw_save', {
        source: this.source,
        mode,
        point_count: pointCount,
        sample_count: coordinates.length,
        distance: Math.round(distance),
        has_elevation: hasElevation,
        trail_segment_count: trailSegmentCount,
        straight_segment_count: straightSegmentCount,
        restored_segment_count: restoredSegmentCount,
      });
      // 모드를 먼저 나간 뒤 그 코스로 옮긴다(`RouteDrawHost.onSaved`).
      runInAction(() => {
        this.reset();
      });

      // 업로드는 이미 끝났다 — 호스트의 후속 처리(선택·카메라)가 던져도 실패 토스트로 번지지 않게 따로 감싼다.
      try {
        this.host.onSaved(routeId);
      } catch (error) {
        console.warn('[RouteDraw] 저장 후 처리 실패', error); // l10n-ignore: 개발자 로그
      }

      if (!hasElevation) {
        app
          .getToastManager()
          ?.showSimple(app.getL10n().t('routeDraw.elevationFailed'));
      }

      return true;
    } catch (error) {
      console.warn('[RouteDraw] 코스 저장 실패', error); // l10n-ignore: 개발자 로그
      app.getToastManager()?.showSimple(getRouteErrorMessage(error));

      return false;
    } finally {
      RouteDraw.deleteCacheFile(file);
      this.setSaving(false);

      // 실패해도 시트를 내린다 — 모달 위에서는 실패 토스트가 가려진다. 점은 그대로라 다시 저장할 수 있다.
      runInAction(() => {
        this.nameSheetVisible = false;
      });
    }
  }

  /**
   * 만든 코스를 올린다. 수정이면 같은 문서를 덮어쓰고(RD-7), 새로 그리기면 id를 먼저 정해 **무료 1회를 그 id로**
   * 기록한 뒤(플러스가 아닐 때만 — RD-8) 같은 id로 올린다. 무료 1회를 이미 썼으면 저장을 멈추고 구독 화면을 연다.
   */
  private async upload(
    draft: RouteDraft,
    localUri: string
  ): Promise<string | null> {
    const editing = this.editing;

    if (this.mode === RouteDrawMode.Edit && editing) {
      return this.host.update(editing.routeId, draft, localUri);
    }

    // 저장 전 검사를 먼저(RD-8) — 상한 등으로 어차피 거절될 저장이면 무료 1회를 정하지 않는다.
    const blocked = this.host.canSubmit();

    if (blocked) {
      this.showToast(blocked);

      return null;
    }

    const routeId = this.pendingRouteId ?? this.host.createRouteId();

    runInAction(() => {
      this.pendingRouteId = routeId;
    });

    if (!(await this.claimFreeIfNeeded(routeId))) {
      return null;
    }

    return this.host.submit(draft, localUri, routeId);
  }

  // 무료 1회 기록(RD-8). 플러스(또는 구독 화면에서 막 권한을 얻음)면 묻지 않는다. 저장을 이어 가도 되면 `true`.
  private async claimFreeIfNeeded(routeId: string): Promise<boolean> {
    const entitlement = app.getRouteDrawEntitlement();

    if (this.entitledByPurchase || entitlement?.isPlus()) {
      return true;
    }

    if (!entitlement) {
      return false;
    }

    const result = await entitlement.claimFree(this.toTarget(routeId));

    if (result === RouteDrawClaimResult.Claimed) {
      return true;
    }

    if (result === RouteDrawClaimResult.Used) {
      // 이름 시트가 다 내려간 뒤 연다. 권한을 얻으면 그리던 코스 그대로 이름 시트를 다시 연다(점은 남아 있다).
      // 그사이 모드를 나갔거나 화면을 떠났으면(세대가 바뀜) 열지도, 잇지도 않는다.
      const generation = this.generation;

      setTimeout(() => {
        if (generation !== this.generation) {
          return;
        }

        openSubscription(SubscriptionEntryPoint.RouteDraw, {
          onEntitled: () => {
            if (generation !== this.generation) {
              return;
            }

            runInAction(() => {
              this.entitledByPurchase = true;
            });
            this.requestSave();
          },
        });
      }, PAYWALL_AFTER_SHEET_MS);

      return false;
    }

    this.showToast(app.getL10n().t('routeDraw.claimFailed'));

    return false;
  }

  // 이 화면의 배낭·그룹에서 코스 한 건(RD-8 `freeRoute`·`editing` 모양).
  private toTarget(routeId: string): RouteDrawTarget {
    return { ...this.host.parent, routeId };
  }

  // 길 따라 요청에 싣는 수정 대상(RD-8) — 무료로 그린 코스를 고칠 때 서버가 길을 찾아 준다.
  private getEditingTarget(): RouteDrawTarget | null {
    return this.mode === RouteDrawMode.Edit && this.editing
      ? this.toTarget(this.editing.routeId)
      : null;
  }

  private showToast(message: string) {
    app.getToastManager()?.showSimple(message);
  }

  /**
   * 새 구간을 붙인다(RD-6). 끔이면 직선으로 확정하고, 켬이면 직선 좌표로 임시(`pending`) 구간을 넣고 길 찾기를
   * 큐 뒤에 건다 — 찍은 순서대로 하나씩 처리해 빨리 연달아 찍어도 구간 순서가 꼬이지 않는다.
   */
  private addSegment(from: RouteDrawPoint, to: RouteDrawPoint) {
    const id = this.nextSegmentId;

    this.nextSegmentId += 1;
    this.segments = [
      ...this.segments,
      {
        id,
        mode: RouteDrawSegmentMode.Straight,
        coordinates: [toRouteCoordinate(from), toRouteCoordinate(to)],
        pending: this.trailEnabled,
      },
    ];

    if (!this.trailEnabled) {
      return;
    }

    const generation = this.generation;

    // 한 요청이 던져도 큐가 끊기지 않게(거절된 체인 뒤의 `then`은 돌지 않는다) 각 차례를 따로 감싼다.
    this.trailQueue = this.trailQueue
      .then(() => this.resolveTrailSegment(id, generation, from, to))
      .catch(error => {
        console.warn('[RouteDraw] 길 찾기 처리 실패', error); // l10n-ignore: 개발자 로그
      });
  }

  private cancelTrailRequest(id: number) {
    this.trailCancels.get(id)?.();
    this.trailCancels.delete(id);
  }

  private cancelTrailRequests() {
    this.trailCancels.forEach(cancel => cancel());
    this.trailCancels.clear();
  }

  private hasSegment(id: number, generation: number): boolean {
    return (
      generation === this.generation &&
      this.segments.some(segment => segment.id === id)
    );
  }

  // 큐에서 차례가 온 구간의 길을 찾는다. 그사이 되돌리기·취소로 구간이 없어졌으면 요청하지 않는다.
  private async resolveTrailSegment(
    id: number,
    generation: number,
    from: RouteDrawPoint,
    to: RouteDrawPoint
  ) {
    if (!this.hasSegment(id, generation)) {
      return;
    }

    let result: RouteTrailResult | null;
    const cancelled = new Promise<null>(resolve => {
      this.trailCancels.set(id, () => resolve(null));
    });

    try {
      // 구간이 사라지면(`cancelled`) 응답을 기다리지 않는다 — 버린 구간이 뒤 구간의 차례를 막지 않게.
      result = await Promise.race([
        this.trailService.route(from, to, this.getEditingTarget()),
        cancelled,
      ]);
    } catch (error) {
      console.warn('[RouteDraw] 길 찾기 예외', error); // l10n-ignore: 개발자 로그
      result = { ok: false, reason: RouteTrailFailReason.Error };
    } finally {
      this.trailCancels.delete(id);
    }

    if (!result) {
      return;
    }

    // 응답을 기다리는 사이 지워진 구간이면 결과를 버린다(id로 판별).
    if (!this.hasSegment(id, generation)) {
      return;
    }

    if (result.ok) {
      const coordinates = anchorTrailCoordinates(from, to, result.coordinates);

      runInAction(() => {
        this.trailFailureStreak = 0;
        this.updateSegment(id, {
          mode: RouteDrawSegmentMode.Trail,
          coordinates,
        });
      });

      return;
    }

    runInAction(() => {
      this.updateSegment(id, { mode: RouteDrawSegmentMode.Straight });
    });

    if (result.reason === RouteTrailFailReason.NotEntitled) {
      this.notifyTrailNotEntitled();

      return;
    }

    this.notifyTrailFailure(result.reason);
  }

  /**
   * 서버가 길 따라를 권한 없음으로 거절했다(RD-8) — 그 구간은 직선으로 확정됐다. 앱 세션에서 처음이면 구독 화면을 열고,
   * 그 뒤로는 토스트로만 알린다(구간마다 구독 화면이 뜨지 않게). 연속 실패 횟수에는 세지 않는다(길 정보 문제가 아니다).
   */
  private notifyTrailNotEntitled() {
    app.getAnalyticsManager()?.logEvent('route_trail_fail', {
      reason: RouteTrailFailReason.NotEntitled,
    });

    if (routeDrawSession.trailPaywallShown) {
      this.showToast(app.getL10n().t('routeDraw.trailNotEntitled'));

      return;
    }

    routeDrawSession.trailPaywallShown = true;
    openSubscription(SubscriptionEntryPoint.RouteDraw);
  }

  // 구간을 확정한다(`pending` 해제) — 배열을 새로 만들어 지도 선이 다시 그려지게 한다.
  private updateSegment(
    id: number,
    change: Pick<RouteDrawSegment, 'mode'> &
      Partial<Pick<RouteDrawSegment, 'coordinates'>>
  ) {
    this.segments = this.segments.map(segment =>
      segment.id === id ? { ...segment, ...change, pending: false } : segment
    );
  }

  // 직선으로 대체됐음을 알린다(RD-6). 같은 세션에서 3회 이상 연속이면 "길 정보가 없는 지역" 안내를 한 번만 띄운다.
  private notifyTrailFailure(reason: RouteTrailFailReason) {
    this.trailFailureStreak += 1;
    app.getAnalyticsManager()?.logEvent('route_trail_fail', { reason });

    const showHint =
      this.trailFailureStreak >= TRAIL_FAILURE_HINT_STREAK &&
      !routeDrawSession.failureHintShown;

    if (showHint) {
      routeDrawSession.failureHintShown = true;
    }

    app
      .getToastManager()
      ?.showSimple(
        app
          .getL10n()
          .t(showHint ? 'routeDraw.trailUnavailable' : 'routeDraw.trailFailed')
      );
  }

  /**
   * 샘플 고도를 채운다(RD-3 2번 · RD-6). 길 좌표의 `ele`는 그대로 두고 **고도가 없는 샘플만** 지형 타일로 읽는다 —
   * 모두 있으면 지형을 읽지 않는다. 지형을 못 읽으면 고도를 전부 뺀다(일부만 있는 그래프는 끊겨 보인다).
   * GPX·축약 좌표 모두 정수 m로 쓴다 — 다시 읽어도 같은 값이 되게.
   */
  private static async fillElevations(
    samples: readonly RouteCoordinate[]
  ): Promise<RouteCoordinate[]> {
    const missing = samples
      .map((sample, index) => (sample.ele === undefined ? index : -1))
      .filter(index => index >= 0);
    const filled = samples.map(sample => ({ ...sample }));

    if (missing.length > 0) {
      const elevations = await TerrainElevation.sampleMany(
        missing.map(index => ({
          latitude: samples[index].lat,
          longitude: samples[index].lng,
        }))
      );

      if (!elevations) {
        return samples.map(sample => ({ lat: sample.lat, lng: sample.lng }));
      }

      missing.forEach((sampleIndex, index) => {
        filled[sampleIndex] = {
          ...filled[sampleIndex],
          ele: elevations[index],
        };
      });
    }

    return filled.map(sample => ({
      lat: sample.lat,
      lng: sample.lng,
      ...(sample.ele !== undefined ? { ele: Math.round(sample.ele) } : {}),
    }));
  }

  private async loadDefaultName(seq: number) {
    let name = '';

    try {
      name = await this.host.resolveDefaultName();
    } catch (error) {
      console.warn('[RouteDraw] 기본 이름 조회 실패', error); // l10n-ignore: 개발자 로그
    }

    runInAction(() => {
      if (seq === this.sessionSeq) {
        // 비었으면 그대로 둔다 — `toRouteName`은 빈 이름을 `GPX`로 채워 `그린 코스` 폴백을 가린다.
        this.defaultName = name ? RouteValidator.toRouteName(name) : '';
      }
    });
  }

  // 모드에 들어갈 때의 공통 초기화(새로 그리기 · 수정).
  private enter(mode: RouteDrawMode, entitledByPurchase: boolean) {
    this.sessionSeq += 1;
    this.generation += 1;
    this.active = true;
    this.mode = mode;
    this.editing = null;
    this.editBaseline = null;
    this.pendingRouteId = null;
    this.entitledByPurchase = entitledByPurchase;
    this.points = [];
    this.segments = [];
    this.trailEnabled = routeDrawSession.trailEnabled;
    this.trailFailureStreak = 0;
    // 지난 세션의 늦은 요청 뒤에 줄 서지 않게 큐를 새로 연다(지난 요청 결과는 세대가 달라 버려진다).
    this.cancelTrailRequests();
    this.trailQueue = Promise.resolve();
    this.saving = false;
    this.nameSheetVisible = false;
    this.defaultName = '';
    this.search.clear();
    this.startCamera = null;
    // 서버 콜드 스타트를 첫 점 전에 치른다(RD-6). 꺼져 있어도 보낸다 — 켜는 순간 이미 깨어 있게.
    this.trailService.warmup();
  }

  private reset() {
    this.generation += 1;
    this.active = false;
    this.mode = RouteDrawMode.New;
    this.editing = null;
    this.editBaseline = null;
    this.pendingRouteId = null;
    this.entitledByPurchase = false;
    this.points = [];
    this.segments = [];
    this.cancelTrailRequests();
    this.trailQueue = Promise.resolve();
    this.nameSheetVisible = false;
    this.search.clear();
    this.startCamera = null;
  }

  /**
   * 점 0개로 새로 그리기에 들어갈 때 "어디서부터 그리지?"를 없앤다(RD-9 #2). 여행지가 있으면 카메라 요청을 남기고
   * (지도가 줌 13으로 옮긴다) 필요하면 여행지 핀을 띄운다. 없으면 위치 검색 인풋이 시작 안내를 보인다.
   */
  private applyStartFocus() {
    const focus = this.host.resolveStartFocus?.() ?? null;

    if (!focus) {
      this.search.showStartHint();

      return;
    }

    this.startCameraSeq += 1;
    this.startCamera = {
      latitude: focus.latitude,
      longitude: focus.longitude,
      seq: this.startCameraSeq,
    };

    if (focus.showPin) {
      this.search.showPin({
        latitude: focus.latitude,
        longitude: focus.longitude,
        name: focus.name,
      });
    }
  }

  private setSaving(value: boolean) {
    this.saving = value;
  }

  // `{이름}.gpx`(파일 금지 문자는 `_` — 내보내기와 같은 규칙)를 캐시 폴더에 쓴다(RD-3 4번).
  private static writeCacheFile(name: string, contents: string): File {
    const directory = new Directory(Paths.cache, CACHE_DIRECTORY);

    directory.create({ intermediates: true, idempotent: true });

    const file = new File(directory, RouteExport.toFileName(name));

    if (file.exists) {
      file.delete();
    }

    file.create({ intermediates: true });
    file.write(contents);

    return file;
  }

  // 업로드가 끝나면(성공·실패 모두) 지운다. 지우지 못해도 캐시라 저장 결과를 바꾸지 않는다.
  private static deleteCacheFile(file: File | null) {
    if (!file) {
      return;
    }

    try {
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.warn('[RouteDraw] 캐시 GPX 삭제 실패', error); // l10n-ignore: 개발자 로그
    }
  }
}

export default RouteDraw;
