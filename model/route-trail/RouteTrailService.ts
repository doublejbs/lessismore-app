import { Functions, getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/model/app/App';
import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { RouteCoordinate } from '@/model/route/RouteData';
import RouteTrailFailReason from './RouteTrailFailReason';
import { RouteTrailResult } from './RouteTrailResult';

// 라우팅 함수가 사는 곳(§4 — 함수·Cloud Run 모두 서울 리전).
const FUNCTION_REGION = 'asia-northeast3';
const FUNCTION_NAME = 'routeTrail';
// 이보다 늦으면 직선으로 확정한다(RD-6).
const ROUTE_TRAIL_TIMEOUT_MS = 8000;
// 두 점 직선이 이보다 길면 요청하지 않는다 — 라우팅이 의미 없는 거리이고 서버 부하를 막는다(RD-6).
const ROUTE_TRAIL_MAX_DISTANCE_METERS = 20000;
// SDK 쪽 타임아웃 — 앱 타임아웃(8초)보다 조금 길게 둬 `timeout` 사유가 SDK 오류(`error`)에 앞서 나게 하고,
// 버려진 요청이 SDK 기본값(70초)만큼 붙잡혀 있지 않게 한다.
const CALLABLE_TIMEOUT_MS = ROUTE_TRAIL_TIMEOUT_MS + 2000;

interface RouteTrailPoint {
  latitude: number;
  longitude: number;
}

type RouteTrailRequest =
  | { from: { lat: number; lng: number }; to: { lat: number; lng: number } }
  | { warmup: true };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

// 서버 실패 사유 → 앱 사유. 모르는 값은 `error`로 묶는다.
const toFailReason = (reason: unknown): RouteTrailFailReason => {
  if (reason === RouteTrailFailReason.NotFound) {
    return RouteTrailFailReason.NotFound;
  }

  if (reason === RouteTrailFailReason.TooFar) {
    return RouteTrailFailReason.TooFar;
  }

  return RouteTrailFailReason.Error;
};

// 응답 좌표를 검사해 옮긴다 — 하나라도 모양이 틀리면 `null`(그 구간은 직선으로 간다).
const toCoordinates = (value: unknown): RouteCoordinate[] | null => {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const coordinates: RouteCoordinate[] = [];

  for (const item of value as unknown[]) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    const { lat, lng, ele } = item as Record<string, unknown>;

    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      return null;
    }

    coordinates.push({ lat, lng, ...(isFiniteNumber(ele) ? { ele } : {}) });
  }

  return coordinates;
};

// 응답 본문 → 결과. 함수 계약(§4): `{ found: true, coordinates, distance, ascent }` | `{ found: false, reason }`.
const toResult = (data: unknown): RouteTrailResult => {
  if (typeof data !== 'object' || data === null) {
    return { ok: false, reason: RouteTrailFailReason.Error };
  }

  const body = data as Record<string, unknown>;

  if (body.found !== true) {
    return { ok: false, reason: toFailReason(body.reason) };
  }

  const coordinates = toCoordinates(body.coordinates);

  if (!coordinates) {
    return { ok: false, reason: RouteTrailFailReason.Error };
  }

  return {
    ok: true,
    coordinates,
    distance: isFiniteNumber(body.distance) ? body.distance : 0,
  };
};

/**
 * 등산로 따라 잇기 (RD-6) — Firebase 호출형 함수 `routeTrail`(BRouter 자체 호스팅 앞단)을 부른다.
 *
 * 실패는 던지지 않고 결과로 돌려준다 — 실패한 구간은 직선으로 확정될 뿐 그리기를 막지 않는다.
 * 오프라인·20km 초과는 요청 없이 바로 실패로 돌려준다.
 */
class RouteTrailService {
  // 처음 부를 때 만든다 — Firebase 초기화(`app.initialize`)가 끝난 뒤여야 한다.
  private functions: Functions | null = null;

  public static new() {
    return new RouteTrailService();
  }

  private constructor() {}

  public async route(
    from: RouteTrailPoint,
    to: RouteTrailPoint
  ): Promise<RouteTrailResult> {
    if (app.getNetworkStatus().isOffline()) {
      return { ok: false, reason: RouteTrailFailReason.Offline };
    }

    if (getDistanceInMeters(from, to) > ROUTE_TRAIL_MAX_DISTANCE_METERS) {
      return { ok: false, reason: RouteTrailFailReason.TooFar };
    }

    return RouteTrailService.withTimeout(this.request(from, to));
  }

  // 그리기 모드에 들어갈 때 한 번 — 서버 콜드 스타트를 첫 점 전에 치른다. 결과·실패 모두 무시한다(RD-6).
  public warmup(): void {
    if (app.getNetworkStatus().isOffline()) {
      return;
    }

    // 콜드 스타트는 수 초가 걸린다 — 깨우기는 SDK 기본 타임아웃으로 기다린다.
    const callable = this.getCallable(null);

    if (!callable) {
      return;
    }

    callable({ warmup: true }).catch(() => {
      // 깨우기 실패는 다음 요청이 콜드 스타트를 치를 뿐이다.
    });
  }

  private async request(
    from: RouteTrailPoint,
    to: RouteTrailPoint
  ): Promise<RouteTrailResult> {
    const callable = this.getCallable(CALLABLE_TIMEOUT_MS);

    if (!callable) {
      return { ok: false, reason: RouteTrailFailReason.Error };
    }

    try {
      const response = await callable({
        from: { lat: from.latitude, lng: from.longitude },
        to: { lat: to.latitude, lng: to.longitude },
      });

      return toResult(response.data);
    } catch (error) {
      // 미로그인(`unauthenticated`)·한도 초과(`resource-exhausted`)·네트워크 오류 모두 직선으로 간다.
      console.warn('[RouteTrailService] 길 찾기 실패', error); // l10n-ignore: 개발자 로그

      return { ok: false, reason: RouteTrailFailReason.Error };
    }
  }

  // 8초 안에 끝나지 않으면 `timeout`으로 끝낸다 — 늦게 온 응답은 버려진다(RD-6).
  private static async withTimeout(
    request: Promise<RouteTrailResult>
  ): Promise<RouteTrailResult> {
    const timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };
    const timeout = new Promise<RouteTrailResult>(resolve => {
      timer.id = setTimeout(() => {
        resolve({ ok: false, reason: RouteTrailFailReason.Timeout });
      }, ROUTE_TRAIL_TIMEOUT_MS);
    });

    try {
      return await Promise.race([request, timeout]);
    } finally {
      if (timer.id !== null) {
        clearTimeout(timer.id);
      }
    }
  }

  private getCallable(timeout: number | null) {
    if (!this.functions) {
      const firebaseApp = app.getFirebase().getFirebaseApp();

      if (!firebaseApp) {
        return null;
      }

      this.functions = getFunctions(firebaseApp, FUNCTION_REGION);
    }

    return httpsCallable<RouteTrailRequest, unknown>(
      this.functions,
      FUNCTION_NAME,
      timeout === null ? {} : { timeout }
    );
  }
}

export default RouteTrailService;
