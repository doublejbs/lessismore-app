import { measureRouteBounds } from './RouteCamera';
import { RouteBounds, RouteCoordinate } from './RouteData';
import RouteDirectionStore from './RouteDirectionStore';
import {
  buildRouteElevationProfile,
  measureElevationGain,
  RouteElevationProfile,
} from './RouteElevation';

interface RouteGeometryInput {
  // 방향 키(`storagePath`). 기기 저장소에서 이 코스의 뒤집기 여부를 찾는 데 쓴다.
  directionKey: string;
  simplified: RouteCoordinate[];
  elevationGain?: number | undefined;
  elevationLoss?: number | undefined;
}

/**
 * 코스의 **방향에 따라 바뀌는 값** 한 벌 (GRP-8 코스 뒤집기, BD-11).
 *
 * 그룹 코스(`GroupRoute`)와 배낭 코스(`BagRoute`)가 이것을 하나씩 들고 위임한다 — 좌표 순서·
 * 고도 단면·상승을 두 모델에 따로 구현하면 뒤집기가 한쪽 화면에서만 맞게 된다.
 *
 * 뒤집어도 **거리는 그대로**고, Storage 원본과 코스 문서도 바뀌지 않는다. 바뀌는 것은 화면이
 * 읽는 좌표 순서(폴리라인·시작/끝 마커), 고도 단면(누적 거리·단면 방향 → 훑기 마커 대응),
 * 상승 값(→ 원래의 하강)뿐이다.
 */
class RouteGeometry {
  private readonly directionKey: string;
  private readonly simplified: RouteCoordinate[];
  private readonly elevationGain: number | undefined;
  private readonly elevationLoss: number | undefined;
  // 방향별 캐시. 좌표가 불변이라 한 번 만들면 값도 불변이다 — 지도·그래프가 매 프레임 읽는다.
  private reversedSimplified: RouteCoordinate[] | null = null;
  private readonly profiles = new Map<boolean, RouteElevationProfile | null>();
  private fallbackLoss: number | null | undefined = undefined;
  private bounds: RouteBounds | null | undefined = undefined;

  public static from(
    input: RouteGeometryInput,
    directions: RouteDirectionStore | null
  ) {
    return new RouteGeometry(input, directions);
  }

  private constructor(
    input: RouteGeometryInput,
    private readonly directions: RouteDirectionStore | null
  ) {
    this.directionKey = input.directionKey;
    // 코스마다 500점까지 온다. 복사하지 않고 그대로 들고 있는다(읽기 전용).
    this.simplified = input.simplified;
    this.elevationGain = input.elevationGain;
    this.elevationLoss = input.elevationLoss;
  }

  public getDirectionKey() {
    return this.directionKey;
  }

  // MobX observable을 읽으므로 observer 화면이 뒤집기를 따라 다시 그려진다.
  public isReversed() {
    return this.directions?.isReversed(this.directionKey) ?? false;
  }

  public toggleReversed() {
    this.directions?.toggle(this.directionKey);
  }

  // 저장된 순서 그대로의 좌표. 다시 저장(`그룹에 올리기`)할 때는 이 값을 쓴다 — 방향은 기기 설정이다.
  public getStoredSimplified() {
    return this.simplified;
  }

  // 지금 보는 방향의 좌표. 뒤집혔으면 첫 점이 원래의 끝점이다.
  public getSimplified(): RouteCoordinate[] {
    if (!this.isReversed()) {
      return this.simplified;
    }

    if (!this.reversedSimplified) {
      this.reversedSimplified = [...this.simplified].reverse();
    }

    return this.reversedSimplified;
  }

  /**
   * 코스 전체의 경계 상자 — 코스를 고를 때 카메라를 맞춘다(GRP-8, BD-11). **저장된 순서의 축약
   * 좌표**로 재므로 뒤집어도 같은 상자다. 문서의 `bounds`(원본 트랙 기준) 대신 이것을 쓰는 이유는
   * 지도에 그리는 선이 축약 좌표이기 때문이다 — 그린 선과 맞춘 상자가 어긋나지 않는다.
   */
  public getBounds(): RouteBounds | null {
    if (this.bounds === undefined) {
      this.bounds = measureRouteBounds(this.simplified);
    }

    return this.bounds;
  }

  /**
   * 지금 보는 방향의 상승(m). 뒤집혔으면 **원래의 하강**이다.
   * 하강이 저장되지 않은 옛 코스는 축약 좌표의 고도로 잰다(`getElevationLoss`).
   */
  public getElevationGain(): number | undefined {
    return this.isReversed() ? this.getElevationLoss() : this.elevationGain;
  }

  /**
   * 원래 방향의 하강(m). 2026-09-23 이전 코스는 문서에 없으므로 **축약 좌표의 `ele`로 같은
   * 3m 히스테리시스를 돌려** 계산한다 — 원본 전체 점으로 잰 값보다 조금 작을 수 있다(GRP-8).
   * 축약 좌표에도 고도가 없으면(고도 그래프 이전 코스) `undefined`다.
   */
  public getElevationLoss(): number | undefined {
    if (this.elevationLoss !== undefined) {
      return this.elevationLoss;
    }

    if (this.fallbackLoss === undefined) {
      // 역순 상승 = 하강(`measureElevationLoss`의 정의와 같다).
      this.fallbackLoss = measureElevationGain(
        [...this.simplified].reverse().map(coordinate => coordinate.ele)
      );
    }

    return this.fallbackLoss ?? undefined;
  }

  /**
   * 지금 보는 방향의 고도 단면. 뒤집힌 좌표로 다시 만들어 누적 거리가 새 시작점에서 0으로
   * 출발한다 — 그래서 훑기 표본의 좌표가 지도 위 자리와 그대로 맞는다.
   */
  public getElevationProfile(): RouteElevationProfile | null {
    const reversed = this.isReversed();

    if (!this.profiles.has(reversed)) {
      this.profiles.set(
        reversed,
        buildRouteElevationProfile(this.getSimplified())
      );
    }

    return this.profiles.get(reversed) ?? null;
  }
}

export default RouteGeometry;
