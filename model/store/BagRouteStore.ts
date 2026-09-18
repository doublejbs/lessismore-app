import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import BagRoute from '../bag-route/BagRoute';
import Firebase from '../firebase/Firebase';
import { toFirestoreDate } from '../firebase/FirestoreDate';
import GroupError from '../group/GroupError';
import {
  GROUP_MAX_ROUTE_COUNT,
  GROUP_ROUTE_MAX_SIMPLIFIED_POINTS,
} from '../group/GroupLimits';
import GroupValidationError from '../group/GroupValidationError';
import { RouteCoordinate, RouteData, RouteInput } from '../route/RouteData';
import RouteValidator from '../route/RouteValidator';

/**
 * 배낭 코스 CRUD (BD-11, DM-30 `bag/{bagId}/routes/{routeId}`).
 *
 * **`GroupStore`에 넣지 않았고 `BagStore`에도 넣지 않았다.** 이유는 접근 범위다 —
 * `bag/{bagId}` 문서는 `shared == true`면 비로그인 누구나 읽는 공개 문서인데(BD-7),
 * 하위 `routes`는 **소유자만** 읽고 쓴다(DM-30). `BagStore`는 그 공개 경로
 * (`getSharedBag`)를 함께 들고 있어, 같은 파일에 두면 "이 스토어의 값은 공개될 수 있다"와
 * "이 값은 절대 공개되면 안 된다"가 섞인다. 컬렉션을 따로 둔 계약을 파일로도 따로 둔다.
 *
 * 경로만 배낭 것이고 파서·검증·업로더·상한은 그룹 코스(GRP-8)와 **같은 것**을 쓴다
 * (DM-30: 수치를 갈라 두면 사용자가 둘을 다르게 기억해야 한다).
 */
class BagRouteStore {
  public constructor(private readonly firebase: Firebase) {}

  // 코스는 Storage 경로에 routeId가 들어가므로 업로드 전에 id를 먼저 발급받는다(BD-11).
  public createRouteId(bagId: string) {
    return doc(collection(this.getStore(), 'bag', bagId, 'routes')).id;
  }

  public getRouteStoragePath(bagId: string, routeId: string) {
    return `bags/${bagId}/routes/${routeId}.gpx`;
  }

  public async getRoutes(bagId: string): Promise<BagRoute[]> {
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'bag', bagId, 'routes'),
        orderBy('createdAt', 'asc')
      )
    );

    return snapshot.docs.map(item =>
      BagRoute.from(this.toRouteData(item.id, item.data()))
    );
  }

  /**
   * 코스 등록 (BD-11). GPX 파싱과 Storage 업로드는 호출자가 끝낸 뒤 요약만 넘긴다 —
   * 이 스토어는 Firestore 문서만 쓴다.
   *
   * **상한 5개는 세어서 막는다.** 그룹은 그룹 문서의 `routeCount`와 한 커밋으로 묶어 규칙이
   * 강제하지만(여러 사람이 공유 예산을 쓰므로 필요했다), 배낭 코스는 소유자 한 사람의 것이라
   * 상한을 넘겨도 피해가 자기 배낭 안에 갇힌다. 공개 문서인 `bag`에 카운터 필드를 새로 더해
   * "이 사람이 코스를 몇 개 갖고 있다"를 공유 링크로 흘리는 것보다 이쪽이 낫다(DM-30).
   */
  public async createRoute(bagId: string, input: RouteInput): Promise<string> {
    this.requireUserId();
    // 보안 규칙 isValidBagRoutePayload 와 같은 조건으로 미리 거른다 — 업로드는 이미 끝난 뒤라
    // 여기서 거부되면 회수 경로 없는 고아 GPX가 남는다(BD-11).
    RouteValidator.validateRoute(input);

    const count = await getCountFromServer(
      collection(this.getStore(), 'bag', bagId, 'routes')
    );

    if (count.data().count >= GROUP_MAX_ROUTE_COUNT) {
      throw new GroupError(GroupValidationError.RouteLimitExceeded);
    }

    const routeData: Record<string, unknown> = {
      name: RouteValidator.toRouteName(input.name),
      storagePath: input.storagePath,
      // 규칙이 정수를 요구한다(`fileSize is int` · `pointCount is int`).
      fileSize: Math.round(input.fileSize),
      distance: input.distance,
      pointCount: Math.round(input.pointCount),
      bounds: { ...input.bounds },
      // 축약 좌표는 파서가 500점 이하로 줄여 넘기지만, 1MB 문서 한도를 지키는 마지막 방어선을 둔다.
      simplified: input.simplified
        .slice(0, GROUP_ROUTE_MAX_SIMPLIFIED_POINTS)
        .map(coordinate => ({
          lat: coordinate.lat,
          lng: coordinate.lng,
          // 고도는 있을 때만 싣는다 — Firestore에 `undefined`를 쓸 수 없고,
          // 고도 그래프는 키의 유무로 "고도 없음"을 읽는다(DM-30 `simplified`).
          ...(coordinate.ele !== undefined && Number.isFinite(coordinate.ele)
            ? { ele: coordinate.ele }
            : {}),
        })),
      createdAt: serverTimestamp(),
    };

    if (input.elevationGain !== undefined) {
      routeData.elevationGain = input.elevationGain;
    }

    await setDoc(this.routeRef(bagId, input.routeId), routeData);

    return input.routeId;
  }

  /**
   * 코스 삭제 (BD-11). Firestore 문서만 지운다 —
   * Storage 원본 삭제는 호출자가 `storagePath`로 함께 수행한다.
   */
  public async deleteRoute(bagId: string, routeId: string): Promise<void> {
    this.requireUserId();

    await deleteDoc(this.routeRef(bagId, routeId));
  }

  private routeRef(bagId: string, routeId: string) {
    return doc(this.getStore(), 'bag', bagId, 'routes', routeId);
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private requireUserId() {
    const userId = this.firebase.getUserId();

    if (!userId) {
      throw new GroupError(GroupValidationError.NotLoggedIn);
    }

    return userId;
  }

  private toRouteData(id: string, data: DocumentData): RouteData {
    const bounds = this.isRecord(data.bounds) ? data.bounds : {};
    const simplified: unknown[] = Array.isArray(data.simplified)
      ? data.simplified
      : [];

    return {
      id,
      name: data.name ?? '',
      storagePath: data.storagePath ?? '',
      fileSize: Number(data.fileSize) || 0,
      distance: Number(data.distance) || 0,
      ...(data.elevationGain !== undefined && data.elevationGain !== null
        ? { elevationGain: Number(data.elevationGain) || 0 }
        : {}),
      pointCount: Number(data.pointCount) || 0,
      bounds: {
        minLat: Number(bounds.minLat) || 0,
        maxLat: Number(bounds.maxLat) || 0,
        minLng: Number(bounds.minLng) || 0,
        maxLng: Number(bounds.maxLng) || 0,
      },
      simplified: simplified.map(coordinate => this.toCoordinate(coordinate)),
      createdAt: toFirestoreDate(data.createdAt),
    };
  }

  // Firestore 문서의 좌표 한 점. 배열 원소는 어떤 모양으로도 올 수 있으므로 값마다 다시 본다.
  private toCoordinate(value: unknown): RouteCoordinate {
    const coordinate = this.isRecord(value) ? value : {};
    const elevation = Number(coordinate.ele);

    return {
      lat: Number(coordinate.lat) || 0,
      lng: Number(coordinate.lng) || 0,
      // 고도가 없는 코스는 키를 그대로 비워 둬야 그래프가 "고도 없음"으로 읽고 자리를 비운다.
      // 0으로 채우면 평지로 그려진다(BD-11).
      ...(coordinate.ele === null ||
      coordinate.ele === undefined ||
      !Number.isFinite(elevation)
        ? {}
        : { ele: elevation }),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

export default BagRouteStore;
