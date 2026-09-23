import { RouteData, RouteDraft } from '@/model/route/RouteData';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import { RouteElevationProfile } from '@/model/route/RouteElevation';
import { formatRouteDistance } from '@/model/route/RouteFormat';
import RouteDirectionStore from '@/model/route/RouteDirectionStore';
import RouteGeometry from '@/model/route/RouteGeometry';

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
  // 저장된 상승 그대로(원래 방향). 다시 저장할 때(`toDraft`) 쓴다 — 화면은 `geometry`를 읽는다.
  private readonly elevationGain: number | undefined;
  private readonly pointCount: number;
  private readonly bounds: RouteData['bounds'];
  private readonly createdAt: Date;
  /**
   * 방향에 따라 바뀌는 값(좌표 순서·고도 단면·상승) — 그룹 코스와 같은 구현을 쓴다(GRP-8 뒤집기).
   * 고도 단면은 방향별로 한 번만 만들어 들고 있는다 — 그래프를 훑는 동안 매 프레임 다시 만들지 않게.
   */
  private readonly geometry: RouteGeometry;

  /**
   * `directions`는 기기에 저장한 뒤집기 설정이다. 없으면(테스트·앱 초기화 전) 항상 원래 방향이다.
   */
  public static from(
    data: RouteData,
    directions: RouteDirectionStore | null = null
  ) {
    return new BagRoute(data, directions);
  }

  public constructor(
    data: RouteData,
    directions: RouteDirectionStore | null = null
  ) {
    this.id = data.id;
    this.name = data.name;
    this.storagePath = data.storagePath;
    this.fileSize = data.fileSize;
    this.distance = data.distance;
    this.elevationGain = data.elevationGain;
    this.pointCount = data.pointCount;
    this.bounds = data.bounds;
    // 지도가 카메라를 움직일 때마다 읽으므로 복사하지 않고 그대로 넘긴다(읽기 전용).
    this.geometry = RouteGeometry.from(
      {
        directionKey: data.storagePath || `bags/?/routes/${data.id}`,
        simplified: data.simplified,
        elevationGain: data.elevationGain,
        elevationLoss: data.elevationLoss,
      },
      directions
    );
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

  public getDirectionKey() {
    return this.geometry.getDirectionKey();
  }

  public isReversed() {
    return this.geometry.isReversed();
  }

  public toggleReversed() {
    this.geometry.toggleReversed();
  }

  // 지금 보는 방향의 상승. 뒤집혔으면 원래의 하강이다(GRP-8).
  public getElevationGain() {
    return this.geometry.getElevationGain();
  }

  // 지금 보는 방향 순서의 축약 좌표(읽기 전용).
  public getSimplified() {
    return this.geometry.getSimplified();
  }

  // 코스를 고를 때 카메라를 맞추는 상자(GRP-8, BD-11). 방향과 무관하다.
  public getBounds() {
    return this.geometry.getBounds();
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
   * **저장된 방향 그대로** 옮긴다 — 뒤집기는 이 기기의 보기 설정이라 그룹 멤버에게 따라가지 않는다(GRP-8).
   */
  public toDraft(): RouteDraft {
    // 옛 코스(하강 미저장)는 축약 좌표로 잰 폴백 값을 싣는다 — 그룹 쪽에서 다시 잴 필요가 없다.
    const elevationLoss = this.geometry.getElevationLoss();

    return {
      name: this.name,
      fileSize: this.fileSize,
      distance: this.distance,
      pointCount: this.pointCount,
      bounds: { ...this.bounds },
      simplified: this.geometry.getStoredSimplified(),
      ...(this.elevationGain === undefined
        ? {}
        : { elevationGain: this.elevationGain }),
      ...(elevationLoss === undefined ? {} : { elevationLoss }),
    };
  }

  /**
   * 고도 단면 (BD-11). 고도가 없는 코스는 `null`이고,
   * 그때 화면은 그래프를 그리지 않고 자리도 비운다.
   */
  public getElevationProfile(): RouteElevationProfile | null {
    return this.geometry.getElevationProfile();
  }
}

export default BagRoute;
