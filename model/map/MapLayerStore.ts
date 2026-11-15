import { makeAutoObservable, runInAction } from 'mobx';
import { Platform } from 'react-native';
import type AnalyticsManager from '@/model/analytics/AnalyticsManager';
import type L10n from '@/model/l10n/L10n';
import type NetworkStatus from '@/model/offline/NetworkStatus';
import type OfflineEntitlement from '@/model/offline/OfflineEntitlement';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import type ToastManager from '@/model/toast/ToastManager';
import MapLayer from './MapLayer';
import type MapLayerScreen from './MapLayerScreen';
import { hasSatelliteKey, probeSatelliteTile } from './SatelliteBasemap';
import SatelliteProbeResult from './SatelliteProbeResult';

// 마지막 선택(일반/위성)을 기억하는 기기 저장소 키 — 화면 공통(MAP-7).
const STORAGE_KEY = 'map.layer';

const isMapLayer = (value: unknown): value is MapLayer =>
  Object.values(MapLayer).some(layer => layer === value);

interface Dependencies {
  networkStatus: NetworkStatus;
  // 플러스(체험 포함) 판단 — 오프라인 저장·코스 그리기 게이트와 같은 소스다(SUB-11 · SUB-12).
  getPlusEntitlement: () => OfflineEntitlement | null;
  // 미구독자가 `위성`을 누르면 구독 화면을 위성 진입점 변형으로 연다(SUB-13). 권한을 얻으면 `onEntitled`.
  openPlus: (onEntitled: () => void) => void;
  getToastManager: () => ToastManager | null;
  getAnalyticsManager: () => AnalyticsManager | null;
  l10n: L10n;
}

/**
 * 지도 종류(일반/위성) 상태 (MAP-7 · SUB-13). `App`이 하나 만들어 앱 수명 동안 든다 — 세 지도 화면(배낭 코스·그룹
 * 지도·박지 지도)이 같은 값을 본다.
 *
 * - **기억**: 마지막 선택을 `AsyncStorage` `map.layer`에 둔다. 플러스가 아니면 기억 값이 위성이어도 일반을 준다
 *   (`getLayer`) — 구독이 끝나면 다음 표시부터 일반으로 돌아간다.
 * - **한도 폴백**: 위성을 켜기 전과, 기억한 위성을 지도 화면에서 처음 보일 때 타일 한 장을 받아 본다
 *   (`probeSatelliteTile`). 권한 오류면 세션 동안 위성을 끄고(`isUnavailable`) 토스트를 한 번 띄운다. 기억 값은
 *   그대로 둔다 — 다음 세션(한도가 풀렸을 수 있다)에 다시 확인한다.
 * - 키가 없는 빌드·웹이면 위성 보기 자체가 없다(`isAvailable() == false` — 전환 버튼을 그리지 않는다).
 */
class MapLayerStore {
  public static new(dependencies: Dependencies) {
    return new MapLayerStore(dependencies);
  }

  private storedLayer = MapLayer.Standard;
  // 이 세션에서 위성 권한 오류를 받았는지(한도 폴백). 켜지면 세션 끝까지 위성을 쓰지 않는다.
  private unavailable = false;
  // 이 세션에서 위성 타일을 이미 확인했는지(권한 오류가 아니었다) — 다시 찌르지 않는다.
  private verified = false;
  private probing = false;
  private started = false;

  private constructor(private readonly dependencies: Dependencies) {
    makeAutoObservable<MapLayerStore, 'dependencies' | 'started'>(this, {
      dependencies: false,
      started: false,
    });
  }

  /**
   * 기억 값을 읽는다. 화면을 막지 않는다 — 복원 전에는 일반 지도다. 한 번만 부른다(`App.initialize`).
   * 타일 확인은 여기서 하지 않는다 — 지도 화면이 처음 나타날 때(`verifyIfNeeded`) 한다(토스트가 지도 밖에서 뜨지 않게).
   */
  public async initialize(): Promise<void> {
    if (this.started || !this.isAvailable()) {
      return;
    }

    this.started = true;

    const stored = await LocalStorageManager.get<unknown>(STORAGE_KEY);

    if (isMapLayer(stored)) {
      runInAction(() => {
        this.storedLayer = stored;
      });
    }
  }

  /**
   * 기억한 위성을 보여야 하는데 이 세션에서 아직 확인하지 못했는지(온라인·플러스·폴백 아님). 확인 중에도, 네트워크
   * 실패로 끝난 뒤에도 `true`로 남는다 — 값이 바뀌지 않아 화면이 실패 직후 다시 찌르지 않고 다음 표시 때 다시 확인한다.
   */
  public needsVerification(): boolean {
    return this.getLayer() === MapLayer.Satellite && !this.verified;
  }

  // 지도 화면(전환 버튼)이 나타날 때 부른다 — 위성을 보여야 하면 타일 한 장으로 확인한다(MAP-7 한도 폴백).
  public verifyIfNeeded(): void {
    if (this.needsVerification() && !this.probing) {
      void this.verify();
    }
  }

  // 키가 든 네이티브 빌드인지 — 아니면 전환 버튼을 그리지 않는다.
  public isAvailable(): boolean {
    return Platform.OS !== 'web' && hasSatelliteKey();
  }

  /**
   * 지금 지도에 그릴 종류. 플러스가 아니거나, 오프라인이거나, 이 세션에서 한도 폴백이 걸렸으면 일반이다 —
   * 위성은 온라인 전용이라(오프라인 팩에 들지 않는다) 오프라인에서 위성을 그리면 면 채움을 끈 빈 바탕만 남는다.
   * 보던 중 끊기면 일반으로 바뀐다.
   */
  public getLayer(): MapLayer {
    if (
      this.storedLayer === MapLayer.Satellite &&
      this.isAvailable() &&
      this.isPlus() &&
      !this.unavailable &&
      this.dependencies.networkStatus.isOnline()
    ) {
      return MapLayer.Satellite;
    }

    return MapLayer.Standard;
  }

  public isPlus(): boolean {
    return this.dependencies.getPlusEntitlement()?.isEntitled() ?? false;
  }

  // 이 세션에서 위성 권한 오류로 일반 지도로 되돌렸는지 — 메뉴의 `위성`을 비활성 + `잠시 쓸 수 없어요`.
  public isUnavailable(): boolean {
    return this.unavailable;
  }

  // 위성으로 바꾸기 전 타일을 확인하는 중인지.
  public isProbing(): boolean {
    return this.probing;
  }

  /**
   * 메뉴에서 고른다(MAP-7). 측정 `click_map_layer`를 남긴다.
   * - `일반 지도` → 바로 바꾸고 기억한다.
   * - `위성` → 오프라인·폴백 중이면 무시(메뉴가 비활성이다). 플러스면 타일을 확인하고 바꾼다. 아니면 구독 화면을
   *   위성 진입점 변형으로 열고, 권한을 얻으면 그때 위성으로 바꾼다(SUB-13 `onEntitled`).
   */
  public select(layer: MapLayer, screen: MapLayerScreen): void {
    const entitled = this.isPlus();

    // `logClick`은 `screen`을 현재 화면 이름으로 덮어쓴다 — 스펙의 `screen` 값을 지키려고 이벤트를 직접 남긴다.
    this.dependencies
      .getAnalyticsManager()
      ?.logEvent('click_map_layer', { layer, screen, entitled });

    if (layer === MapLayer.Standard) {
      this.setStoredLayer(MapLayer.Standard);

      return;
    }

    if (
      !this.isAvailable() ||
      this.unavailable ||
      this.dependencies.networkStatus.isOffline()
    ) {
      return;
    }

    if (!entitled) {
      // 구매 직후에는 권한 반영이 늦을 수 있다 — 권한 검사 없이 기억 값을 위성으로 둔다(권한이 들어오면
      // `getLayer()`가 따라간다).
      this.dependencies.openPlus(() => {
        void this.applySatellite(true);
      });

      return;
    }

    void this.applySatellite();
  }

  private async applySatellite(fromEntitlement = false): Promise<void> {
    if ((!fromEntitlement && !this.isPlus()) || this.unavailable) {
      return;
    }

    if (!this.verified) {
      const ok = await this.verify();

      if (!ok) {
        return;
      }
    }

    this.setStoredLayer(MapLayer.Satellite);
  }

  /**
   * 타일 한 장으로 확인한다. 권한 오류면 폴백을 걸고 `false`. 그 밖의 실패(네트워크·타임아웃)는 막지 않지만(`true`)
   * 확인한 것으로 치지 않는다 — 다음 표시 때 다시 확인한다.
   */
  private async verify(): Promise<boolean> {
    if (this.probing) {
      return false;
    }

    this.probing = true;

    const probe = await probeSatelliteTile();

    runInAction(() => {
      this.probing = false;

      if (probe.result === SatelliteProbeResult.Ok) {
        this.verified = true;
      }
    });

    if (probe.result === SatelliteProbeResult.Unauthorized) {
      this.markUnavailable(probe.status);

      return false;
    }

    return true;
  }

  // 한도 폴백(MAP-7): 세션 동안 위성을 끄고, 세션에 한 번 토스트와 측정을 남긴다.
  private markUnavailable(status: number): void {
    if (this.unavailable) {
      return;
    }

    this.unavailable = true;
    this.dependencies
      .getAnalyticsManager()
      ?.logEvent('map_satellite_unavailable', { status });
    this.dependencies.getToastManager()?.show({
      message: this.dependencies.l10n.t('map.layer.unavailableToast'),
    });
  }

  private setStoredLayer(layer: MapLayer): void {
    this.storedLayer = layer;
    void LocalStorageManager.set(STORAGE_KEY, layer);
  }
}

export default MapLayerStore;
