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
import RouteValidator from '@/model/route/RouteValidator';
import TerrainElevation from '@/model/terrain/TerrainElevation';
import { writeRouteDrawGpx } from './RouteDrawGpxWriter';
import { RouteDrawPoint } from './RouteDrawPoint';
import { sampleRouteDrawLine } from './RouteDrawSampler';
import RouteDrawSource from './RouteDrawSource';

/**
 * 화면(배낭·그룹)이 주입하는 일 (RD-3).
 *
 * - `submit`: 만든 코스를 올린다 — 디스패처 호출·목록 갱신까지 맡고 올린 코스 id를 돌려준다. 실패하면 사유를 직접
 *   토스트하고(가져오기와 같은 문구) `null`.
 * - `onSaved`: 저장이 끝나 **모드를 나간 뒤** 불린다 — 올린 코스를 골라 카메라를 맞춘다(배낭 `focusEntry`, 그룹
 *   `focusRoute`). 모드를 먼저 나가야 카메라 맞춤이 하단 바가 아니라 다시 올라온 시트 높이를 비운다.
 * - `resolveDefaultName`: 이름 입력 시트의 기본값(배낭 `{여행지} 코스`, 그룹 `{그룹} 코스`). 못 구하면 빈 문자열.
 */
export interface RouteDrawHost {
  submit: (draft: RouteDraft, localUri: string) => Promise<string | null>;
  onSaved: (routeId: string) => void;
  resolveDefaultName: () => Promise<string>;
}

// 찍을 수 있는 점 상한(RD-2).
export const ROUTE_DRAW_MAX_POINTS = 100;
// 직전 점과 이보다 가까우면 두 번 눌림으로 보고 무시한다(m, RD-2).
export const ROUTE_DRAW_MIN_GAP_METERS = 5;
// 업로드할 GPX를 잠깐 쓰는 앱 캐시 아래 폴더(RD-3 4번). 업로드가 끝나면 파일을 지운다.
const CACHE_DIRECTORY = 'route-draw';

/**
 * 지도에서 점을 찍어 만드는 코스 (RD-1 ~ RD-4). 같은 지도 화면 안의 **모드**라 화면이 인스턴스 하나를 들고,
 * 모드에 들어가고(`start`) 나가는(`cancel`·저장 성공) 상태도 여기 둔다 — 화면을 떠나면 인스턴스와 함께 버려진다
 * (기기 저장 없음, §8).
 *
 * 저장은 "샘플링 → 고도 보강 → 상승·하강 → GPX 생성 → 캐시 파일 → 올리기(`RouteDrawSubmitter`) → 정리" 순서다.
 * 올리기 이후(검증·Storage·Firestore·상한 검사)는 가져오기와 **같은 디스패처 경로**라 데이터 계약이 바뀌지 않는다.
 */
class RouteDraw {
  private active = false;
  private points: RouteDrawPoint[] = [];
  private saving = false;
  private nameSheetVisible = false;
  // 이름 시트를 열 때마다 올린다 — 시트가 이 값을 `key`로 받아 새로 마운트되면서 입력이 기본값으로 돌아간다.
  private nameSheetKey = 0;
  private defaultName = '';
  // 모드에 들어갈 때마다 올린다 — 늦게 온 기본 이름이 다음 그리기에 섞이지 않게.
  private sessionSeq = 0;

  public static from(source: RouteDrawSource, host: RouteDrawHost) {
    return new RouteDraw(source, host);
  }

  private constructor(
    private readonly source: RouteDrawSource,
    private readonly host: RouteDrawHost
  ) {
    makeAutoObservable<RouteDraw, 'source' | 'host' | 'sessionSeq'>(this, {
      source: false,
      host: false,
      sessionSeq: false,
    });
  }

  public isActive(): boolean {
    return this.active;
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

  // 찍은 점을 잇는 직선 거리 합(m). 하단 바 메타가 쓴다(RD-2).
  public getDistance(): number {
    return this.points.reduce(
      (sum, point, index) =>
        index === 0
          ? sum
          : sum + getDistanceInMeters(this.points[index - 1], point),
      0
    );
  }

  // 지도 선 좌표(`[lng, lat]`).
  public getLineCoordinates(): number[][] {
    return this.points.map(point => [point.longitude, point.latitude]);
  }

  public canUndo(): boolean {
    return this.points.length > 0 && !this.saving;
  }

  // 서로 다른 점이 2개 이상일 때만 저장한다(RD-2 · §6 — 모든 점이 한 자리면 선이 아니다).
  public canSave(): boolean {
    if (this.saving || this.points.length < 2) {
      return false;
    }

    const first = this.points[0];

    return this.points.some(
      point => getDistanceInMeters(first, point) >= ROUTE_DRAW_MIN_GAP_METERS
    );
  }

  // 취소할 때 확인을 물을지 — 2점 이상이면 버리는 것이 있다(RD-2).
  public needsDiscardConfirm(): boolean {
    return this.points.length >= 2;
  }

  // 그리기 모드에 들어간다(RD-1). 기본 이름은 뒤에서 구해 둔다 — 이름 시트를 열 때 이미 있게.
  public start() {
    this.sessionSeq += 1;
    this.active = true;
    this.points = [];
    this.saving = false;
    this.nameSheetVisible = false;
    this.defaultName = '';
    app.getAnalyticsManager()?.logClick('route_draw_start', {
      source: this.source,
    });
    void this.loadDefaultName(this.sessionSeq);
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

    this.points = [
      ...this.points,
      { latitude: point.latitude, longitude: point.longitude },
    ];
  }

  public undo() {
    if (!this.canUndo()) {
      return;
    }

    this.points = this.points.slice(0, -1);
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
      const samples = sampleRouteDrawLine(this.points);
      const elevations = await TerrainElevation.sampleMany(samples);
      const hasElevation = elevations !== null;
      const coordinates: RouteCoordinate[] = samples.map((sample, index) => ({
        lat: sample.latitude,
        lng: sample.longitude,
        // GPX에도 정수 m로 쓴다 — 축약 좌표를 원본과 같은 값으로 둔다(다시 읽어도 같다).
        ...(elevations ? { ele: Math.round(elevations[index]) } : {}),
      }));
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
        description: app.getL10n().t('routeDraw.gpxDescription'),
        time: new Date(),
        coordinates,
      });

      file = RouteDraw.writeCacheFile(name, gpx);

      const distance = RouteDraw.measureDistance(coordinates);
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
      };
      const pointCount = this.points.length;
      const routeId = await this.host.submit(draft, file.uri);

      if (!routeId) {
        return false;
      }

      app.getAnalyticsManager()?.logClick('route_draw_save', {
        source: this.source,
        point_count: pointCount,
        sample_count: coordinates.length,
        distance: Math.round(distance),
        has_elevation: hasElevation,
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

  private reset() {
    this.active = false;
    this.points = [];
    this.nameSheetVisible = false;
  }

  private setSaving(value: boolean) {
    this.saving = value;
  }

  private static measureDistance(coordinates: readonly RouteCoordinate[]) {
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
