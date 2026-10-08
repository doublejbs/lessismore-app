import { makeAutoObservable, observable } from 'mobx';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RouteCoordinate } from './RouteData';
import { RouteDisplay } from './RouteDisplay';
import RouteEndpointKind from './RouteEndpointKind';

type ReverseGeocode = (latitude: number, longitude: number) => Promise<string>;

interface Translator {
  t(key: string, params?: Record<string, unknown>): string;
}

interface ToastPresenter {
  show(params: { message: string }): void;
}

interface RouteEndpointSelection {
  routeId: string;
  kind: RouteEndpointKind;
}

// 화면이 카드에 그리는 끝점 — 좌표는 **지금 보는 방향**의 첫 점·끝 점이다(마커와 같은 점).
export interface RouteEndpoint {
  kind: RouteEndpointKind;
  coordinate: RouteCoordinate;
}

// 좌표는 소수 5자리(약 1m)로 보인다(GRP-8). 역지오코딩 캐시 키도 같은 자리수다.
const COORDINATE_DIGITS = 5;

/**
 * 코스 출발·도착 마커의 위치 정보 카드 (GRP-8). 그룹 지도와 배낭 코스 화면이 같은 모델을 쓴다.
 *
 * - 고른 끝점은 코스 id와 종류(출발/도착)만 기억한다 — 좌표는 그릴 때마다 코스에서 다시 읽는다.
 *   그래야 카드를 띄운 채 방향을 뒤집어도 마커와 같은 점을 가리킨다.
 * - 역지오코딩 결과는 좌표별로 이 객체의 수명(= 화면 수명) 동안 기억한다. 실패도 기억해 다시 묻지 않는다.
 */
class RouteEndpointInfo {
  public static from(
    reverseGeocode: ReverseGeocode,
    fallbackAddress: string,
    l10n: Translator,
    toastManager: ToastPresenter | null
  ) {
    return new RouteEndpointInfo(
      reverseGeocode,
      fallbackAddress,
      l10n,
      toastManager
    );
  }

  private selection: RouteEndpointSelection | null = null;
  // 좌표 키 → 주소. `null`이면 찾지 못했다(줄을 뺀다). 키가 없으면 아직 묻지 않았거나 묻는 중이다.
  private readonly addresses = observable.map<string, string | null>();
  // 묻는 중인 좌표 키. 답이 오기 전에 같은 점을 다시 눌러도 요청을 겹치지 않는다.
  private readonly pendingKeys = new Set<string>();

  private constructor(
    private readonly reverseGeocode: ReverseGeocode,
    // 역지오코딩이 주소를 못 찾았을 때 돌려주는 폴백 이름. 카드에서는 실패로 본다(줄을 뺀다).
    private readonly fallbackAddress: string,
    private readonly l10n: Translator,
    private readonly toastManager: ToastPresenter | null
  ) {
    makeAutoObservable<
      RouteEndpointInfo,
      | 'reverseGeocode'
      | 'fallbackAddress'
      | 'l10n'
      | 'toastManager'
      | 'pendingKeys'
    >(this, {
      pendingKeys: false,
      reverseGeocode: false,
      fallbackAddress: false,
      l10n: false,
      toastManager: false,
    });
  }

  public static getCoordinateKey(coordinate: RouteCoordinate): string {
    return `${coordinate.lat.toFixed(COORDINATE_DIGITS)},${coordinate.lng.toFixed(COORDINATE_DIGITS)}`;
  }

  // 복사·표시에 같이 쓰는 좌표 문구: `35.49393, 129.08124`.
  public static getCoordinateText(coordinate: RouteCoordinate): string {
    return `${coordinate.lat.toFixed(COORDINATE_DIGITS)}, ${coordinate.lng.toFixed(COORDINATE_DIGITS)}`;
  }

  public static resolveCoordinate(
    route: RouteDisplay,
    kind: RouteEndpointKind
  ): RouteCoordinate | null {
    const coordinates = route.getSimplified();

    if (coordinates.length < 2) {
      return null;
    }

    if (kind === RouteEndpointKind.Start) {
      return coordinates[0];
    }

    return coordinates[coordinates.length - 1];
  }

  public select(route: RouteDisplay, kind: RouteEndpointKind): void {
    this.selection = { routeId: route.getId(), kind };

    const coordinate = RouteEndpointInfo.resolveCoordinate(route, kind);

    if (coordinate) {
      void this.requestAddress(coordinate);
    }
  }

  public clear(): void {
    this.selection = null;
  }

  public hasSelection(): boolean {
    return this.selection !== null;
  }

  // 고른 끝점을 이 코스 기준으로 푼다. 다른 코스로 바뀌었으면 카드를 그리지 않는다(`null`).
  public getEndpoint(route: RouteDisplay | null): RouteEndpoint | null {
    const selection = this.selection;

    if (!route || !selection || selection.routeId !== route.getId()) {
      return null;
    }

    const coordinate = RouteEndpointInfo.resolveCoordinate(
      route,
      selection.kind
    );

    if (!coordinate) {
      return null;
    }

    return { kind: selection.kind, coordinate };
  }

  public isAddressLoading(coordinate: RouteCoordinate): boolean {
    return !this.addresses.has(RouteEndpointInfo.getCoordinateKey(coordinate));
  }

  // 찾은 주소. 묻는 중이거나 못 찾았으면 `null`이다.
  public getAddress(coordinate: RouteCoordinate): string | null {
    return (
      this.addresses.get(RouteEndpointInfo.getCoordinateKey(coordinate)) ?? null
    );
  }

  public getKindLabel(kind: RouteEndpointKind): string {
    if (kind === RouteEndpointKind.Start) {
      return this.l10n.t('route.endpoint.start');
    }

    return this.l10n.t('route.endpoint.end');
  }

  /**
   * 메타 한 줄(숫자 먼저, HM-8): `고도 1,234m · 35.49393, 129.08124`.
   * 고도가 없는 GPX면 고도 조각을 뺀다.
   */
  public getMetaText(coordinate: RouteCoordinate, language: string): string {
    const coordinateText = RouteEndpointInfo.getCoordinateText(coordinate);

    if (coordinate.ele === undefined) {
      return coordinateText;
    }

    const elevation = this.l10n.t('route.endpoint.elevation', {
      value: Math.round(coordinate.ele).toLocaleString(language),
    });

    return `${elevation}${this.l10n.t('route.endpoint.separator')}${coordinateText}`;
  }

  /**
   * 길찾기(도보): 네이버 지도 앱 → 없으면 네이버 지도 웹 길찾기로 폴백한다.
   * 박지 상세의 `nmap://place` 폴백(CS-3)과 같은 문법이다.
   */
  public async openDirections(
    coordinate: RouteCoordinate,
    destinationName: string
  ): Promise<void> {
    const { lat, lng } = coordinate;
    const name = encodeURIComponent(destinationName);
    const appUrl = `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${name}&appname=com.doublejbs.useless`;
    const webUrl = `https://map.naver.com/p/directions/-/${lng},${lat},${name}/-/walk`;

    try {
      await Linking.openURL(appUrl);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        // 웹 폴백까지 실패하면 조용히 무시
      }
    }
  }

  public async copyCoordinate(coordinate: RouteCoordinate): Promise<void> {
    try {
      await Clipboard.setStringAsync(
        RouteEndpointInfo.getCoordinateText(coordinate)
      );
      this.toastManager?.show({
        message: this.l10n.t('route.endpoint.copied'),
      });
    } catch {
      // 클립보드 실패는 조용히 무시
    }
  }

  private async requestAddress(coordinate: RouteCoordinate): Promise<void> {
    const key = RouteEndpointInfo.getCoordinateKey(coordinate);

    if (this.addresses.has(key) || this.pendingKeys.has(key)) {
      return;
    }

    this.pendingKeys.add(key);

    const address = await this.fetchAddress(coordinate);

    this.pendingKeys.delete(key);
    this.setAddress(key, address);
  }

  private async fetchAddress(
    coordinate: RouteCoordinate
  ): Promise<string | null> {
    try {
      const address = await this.reverseGeocode(coordinate.lat, coordinate.lng);

      if (!address || address === this.fallbackAddress) {
        return null;
      }

      return address;
    } catch {
      return null;
    }
  }

  private setAddress(key: string, address: string | null): void {
    this.addresses.set(key, address);
  }
}

export default RouteEndpointInfo;
