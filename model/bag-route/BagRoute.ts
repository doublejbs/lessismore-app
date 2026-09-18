import { RouteData, RouteDraft } from '@/model/route/RouteData';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import {
  buildRouteElevationProfile,
  RouteElevationProfile,
} from '@/model/route/RouteElevation';
import { formatRouteDistance } from '@/model/route/RouteFormat';

/**
 * 배낭 코스(GPX) 한 건 (BD-11, DM-30 `bag/{bagId}/routes/{routeId}`).
 *
 * 그룹 코스(`GroupRoute`)와 **같은 필드**를 갖되 작성자가 없다 — 배낭 코스는 소유자 한 사람의
 * 것이라 누가 올렸는지를 적을 이유가 없다(DM-30). 나머지는 같은 인터페이스(`RouteDisplay`)라
 * 지도·그래프·목록 행이 둘을 가리지 않는다.
 */
class BagRoute implements RouteDisplay {
  private readonly id: string;
  private readonly name: string;
  private readonly storagePath: string;
  private readonly fileSize: number;
  private readonly distance: number;
  private readonly elevationGain: number | undefined;
  private readonly pointCount: number;
  private readonly bounds: RouteData['bounds'];
  private readonly simplified: RouteData['simplified'];
  private readonly createdAt: Date;
  // 고도 단면은 좌표 500점을 훑어 만든다 — 그래프를 훑는 동안 매 프레임 다시 만들지 않도록
  // 처음 물었을 때 한 번 만들어 들고 있는다(BD-11). 좌표가 불변이라 값도 불변이다.
  private elevationProfile: RouteElevationProfile | null = null;
  private elevationProfileBuilt = false;

  public static from(data: RouteData) {
    return new BagRoute(data);
  }

  public constructor(data: RouteData) {
    this.id = data.id;
    this.name = data.name;
    this.storagePath = data.storagePath;
    this.fileSize = data.fileSize;
    this.distance = data.distance;
    this.elevationGain = data.elevationGain;
    this.pointCount = data.pointCount;
    this.bounds = data.bounds;
    // 지도가 카메라를 움직일 때마다 읽으므로 복사하지 않고 그대로 들고 있는다(읽기 전용).
    this.simplified = data.simplified;
    this.createdAt = data.createdAt;
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getStoragePath() {
    return this.storagePath;
  }

  public getDistance() {
    return this.distance;
  }

  public getElevationGain() {
    return this.elevationGain;
  }

  public getSimplified() {
    return this.simplified;
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  public getDistanceText() {
    return formatRouteDistance(this.distance);
  }

  /**
   * 이 코스를 그대로 다시 저장할 수 있는 모양 (BD-11 `그룹에 올리기`).
   * 원본 GPX를 다시 파싱하지 않는다 — 저장된 값이 곧 파싱 결과다.
   */
  public toDraft(): RouteDraft {
    return {
      name: this.name,
      fileSize: this.fileSize,
      distance: this.distance,
      pointCount: this.pointCount,
      bounds: { ...this.bounds },
      simplified: this.simplified,
      ...(this.elevationGain === undefined
        ? {}
        : { elevationGain: this.elevationGain }),
    };
  }

  /**
   * 고도 단면 (BD-11). 고도가 없는 코스는 `null`이고,
   * 그때 화면은 그래프를 그리지 않고 자리도 비운다.
   */
  public getElevationProfile(): RouteElevationProfile | null {
    if (!this.elevationProfileBuilt) {
      this.elevationProfileBuilt = true;
      this.elevationProfile = buildRouteElevationProfile(this.simplified);
    }

    return this.elevationProfile;
  }
}

export default BagRoute;
