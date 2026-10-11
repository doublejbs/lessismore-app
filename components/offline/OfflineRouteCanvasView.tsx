import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import MapMyLocationButtonView from '@/components/map/MapMyLocationButtonView';
import { useMyLocationHeadingMode } from '@/components/map/useMyLocationHeadingMode';
import PointCalloutView from '@/components/point/PointCalloutView';
import usePointRouteMark from '@/components/point/usePointRouteMark';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import {
  Acg,
  AcgLayout,
  AcgShadow,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import { MapCoordinate } from '@/hooks/useMapCurrentLocation';
import app from '@/model/app/App';
import { getBagPointMeta } from '@/model/bag-point/BagPointLabels';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRouteList from '@/model/bag-route/BagRouteList';
import MyLocationMode from '@/model/location/MyLocationMode';
import OfflineCanvasProjection, {
  getScaleBar,
  toScreen,
  toSvgMatrix,
} from '@/model/offline/OfflineCanvasProjection';
import OfflineCanvasReason from '@/model/offline/OfflineCanvasReason';
import MapPoint from '@/model/point/MapPoint';
import { mergeRouteBounds } from '@/model/route/RouteCamera';
import { RouteElevationSample } from '@/model/route/RouteElevation';
import OfflineCanvasMyLocationView from './OfflineCanvasMyLocationView';
import OfflineCanvasNorthView from './OfflineCanvasNorthView';
import OfflineCanvasPointMarkerView from './OfflineCanvasPointMarkerView';
import OfflineCanvasScaleBarView from './OfflineCanvasScaleBarView';
import OfflineSnapshotBandView from './OfflineSnapshotBandView';
import useOfflineCanvasCamera from './useOfflineCanvasCamera';

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
  reason: OfflineCanvasReason;
  // 상단 오버레이를 헤더 아래로 내린다(지도와 같은 규칙 — iOS 투명 헤더).
  topInset: number;
}

// 코스 전체를 맞출 때 가장자리 여백(px). 시작·끝 점과 포인트 마커가 잘리지 않게.
const FIT_PADDING = 40;
// `내 위치`·포인트로 옮길 때 최소 확대(px/m) — 지도의 0.05°·0.02° 범위와 비슷한 축척.
const LOCATION_SCALE = 0.07;
const POINT_FOCUS_SCALE = 0.18;
// 코스 선 굵기(px) — 지도 폴리라인(RoutePathOverlayView)과 같은 값.
const ROUTE_WIDTH = 6;
const ROUTE_DIM_WIDTH = 4;
const ENDPOINT_RADIUS = 7;
// 방향 모드가 아닐 때 훅에 넘기는 줌(캔버스는 줌 대신 축척을 쓴다 — 값은 쓰이지 않는다).
const FALLBACK_ZOOM = 14;
const CONTROL_BOTTOM_OFFSET = 16;

/**
 * 오프라인 코스 캔버스 (OF-6) — 지도 타일 없이 흰 바탕 위에 코스·포인트·내 위치·축척·북쪽을 그린다.
 * 등고선·지명은 없다(있어 보이게 꾸미지 않는다 — 가짜 지형은 산에서 위험하다).
 *
 * - 처음에는 코스·포인트 전체를 맞추고, 드래그·핀치로 옮기고 확대한다(지도와 같은 제스처).
 * - `내 위치`는 지도와 **같은 훅**(`useMyLocationHeadingMode`)이다 — ① 이동 → ② 방향 모드(캔버스가 바라보는
 *   방향으로 돈다) → ③ 끄기(북쪽 위). 손으로 움직이면 따라가기만 풀리고 부채꼴은 남는다(BD-11과 같다).
 * - 고도 그래프·훑기·포인트 탭 시 그래프 표시는 지도 화면과 같은 컴포넌트를 쓴다(축약 좌표에 고도가 있다).
 * - 오프라인 전용이 아니라 "지도가 없을 때의 코스 뷰"다 — 온라인에서 지도가 뜨지 않을 때도 쓴다.
 */
const OfflineRouteCanvasView: FC<Props> = ({
  bagRouteList,
  bagPointList,
  reason,
  topInset,
}) => {
  const l10n = app.getL10n();
  const entries = bagRouteList.getEntries();
  const selected = bagRouteList.getSelectedEntry();
  const selectedKey = bagRouteList.getSelectedKey();
  const selectedRoute = selected?.route ?? null;
  const focusRequest = bagRouteList.getFocusRequest();
  const pointFocusRequest = bagPointList.getFocusRequest();
  const focusedEntry = bagPointList.getFocusedEntry();
  const focusedPoint = focusedEntry?.point ?? null;
  const visiblePoints = bagPointList.getVisiblePoints();
  const routesInitialized = bagRouteList.isInitialized();
  const pointsInitialized = bagPointList.isInitialized();
  const pointRouteMark = usePointRouteMark(selectedRoute, focusedPoint);
  const didFitRef = useRef(false);
  const handledFocusSeqRef = useRef(0);
  const handledPointSeqRef = useRef(0);
  const [scrub, setScrub] = useState<{
    key: string;
    sample: RouteElevationSample;
  } | null>(null);
  const [hasHiddenGroupContent, setHasHiddenGroupContent] = useState(false);

  const contentBounds = mergeRouteBounds([
    bagRouteList.getContentBounds(),
    bagPointList.getContentBounds(),
  ]);
  // 평면의 기준점은 내용 상자의 중심이다. 내용이 바뀌면(목록 갱신) 기준점도 바뀌므로 다시 맞춘다.
  const boundsKey = OfflineCanvasProjection.toKey(contentBounds);
  const projection = useMemo(
    () => OfflineCanvasProjection.fromKey(boundsKey),
    [boundsKey]
  );

  useEffect(() => {
    didFitRef.current = false;
  }, [projection]);

  const handleTapCanvas = useCallback(() => {
    bagPointList.clearFocus();
  }, [bagPointList]);

  // 손으로 움직이면 방향 모드의 따라가기를 푼다 — 아래에서 정의하는 훅의 핸들러를 ref로 잇는다.
  const userGestureRef = useRef<() => void>(() => undefined);
  const handleUserGesture = useCallback(() => {
    userGestureRef.current();
  }, []);

  const { size, camera, setCamera, gesture, handleLayout } =
    useOfflineCanvasCamera({
      onUserGesture: handleUserGesture,
      onTap: handleTapCanvas,
    });

  const moveToCoordinate = useCallback(
    (coordinate: MapCoordinate) => {
      didFitRef.current = true;
      setCamera(previous => ({
        ...previous,
        center: projection.project(coordinate.latitude, coordinate.longitude),
        scale: Math.max(previous.scale, LOCATION_SCALE),
      }));
    },
    [projection, setCamera]
  );

  const {
    currentLocation,
    mode: myLocationMode,
    heading,
    camera: followCamera,
    handlePressMyLocation,
    handleCameraChanged,
    releaseFollow,
  } = useMyLocationHeadingMode({
    moveCamera: moveToCoordinate,
    logTag: 'OfflineCanvas',
    fallbackZoom: FALLBACK_ZOOM,
  });

  useEffect(() => {
    userGestureRef.current = () => {
      handleCameraChanged({
        latitude: 0,
        longitude: 0,
        zoom: FALLBACK_ZOOM,
        bearing: -camera.rotation,
        reason: 'Gesture',
      });
    };
  }, [camera.rotation, handleCameraChanged]);

  // ② 방향 모드: 내 위치를 따라가며 바라보는 방향이 위로 오게 돈다. ③으로 끄면(부채꼴이 사라지면) 북쪽 위.
  const isFollowing = myLocationMode === MyLocationMode.Heading;
  const followLatitude = isFollowing ? followCamera?.latitude : undefined;
  const followLongitude = isFollowing ? followCamera?.longitude : undefined;
  const followBearing = isFollowing ? followCamera?.bearing : undefined;
  const isHeadingShown = heading !== null;

  useEffect(() => {
    if (followLatitude !== undefined && followLongitude !== undefined) {
      didFitRef.current = true;
      setCamera(previous => ({
        ...previous,
        center: projection.project(followLatitude, followLongitude),
        rotation: -(followBearing ?? 0),
      }));

      return;
    }

    if (!isHeadingShown) {
      setCamera(previous =>
        previous.rotation === 0 ? previous : { ...previous, rotation: 0 }
      );
    }
  }, [
    followBearing,
    followLatitude,
    followLongitude,
    isHeadingShown,
    projection,
    setCamera,
  ]);

  // 최초 카메라 — 코스와 포인트가 모두 읽힌 뒤 전체 상자에 맞춘다(지도와 같은 규칙).
  useEffect(() => {
    if (
      didFitRef.current ||
      !size ||
      !routesInitialized ||
      !pointsInitialized ||
      !contentBounds
    ) {
      return;
    }

    didFitRef.current = true;
    setCamera(projection.fit(contentBounds, size, FIT_PADDING));
  }, [
    contentBounds,
    pointsInitialized,
    projection,
    routesInitialized,
    setCamera,
    size,
  ]);

  // 목록에서 코스를 고르면 그 코스 전체로 옮긴다(BD-11). 훑는 중이면 옮기지 않는다(GRP-8).
  useEffect(() => {
    if (
      !focusRequest ||
      !size ||
      focusRequest.seq === handledFocusSeqRef.current
    ) {
      return;
    }

    handledFocusSeqRef.current = focusRequest.seq;

    const entry = bagRouteList
      .getEntries()
      .find(item => item.key === focusRequest.key);

    const bounds = entry?.route.getBounds() ?? null;

    if (!bounds || scrub) {
      return;
    }

    didFitRef.current = true;
    releaseFollow();
    setCamera(projection.fit(bounds, size, FIT_PADDING));
  }, [
    bagRouteList,
    focusRequest,
    projection,
    releaseFollow,
    scrub,
    setCamera,
    size,
  ]);

  // 목록·마커에서 포인트를 고르면 그 포인트로 옮긴다(BD-14). 목록에서 골랐으면 그 부근까지 당긴다.
  useEffect(() => {
    if (
      !pointFocusRequest ||
      pointFocusRequest.seq === handledPointSeqRef.current
    ) {
      return;
    }

    handledPointSeqRef.current = pointFocusRequest.seq;

    const entry = bagPointList
      .getEntries()
      .find(item => item.key === pointFocusRequest.key);

    if (!entry) {
      return;
    }

    didFitRef.current = true;
    releaseFollow();
    setCamera(previous => ({
      ...previous,
      center: projection.project(
        entry.point.getLatitude(),
        entry.point.getLongitude()
      ),
      scale: pointFocusRequest.zoomIn
        ? Math.max(previous.scale, POINT_FOCUS_SCALE)
        : previous.scale,
    }));
  }, [bagPointList, pointFocusRequest, projection, releaseFollow, setCamera]);

  // OF-1: 연결 그룹의 코스·포인트는 저장하지 않는다 — 그룹이 있었으면 그 사실을 한 줄로 알린다.
  const bagId = bagRouteList.getBagId();

  useEffect(() => {
    if (reason !== OfflineCanvasReason.Offline) {
      return;
    }

    let cancelled = false;

    const loadGroupFlag = async () => {
      const snapshot = await app.getOfflineTripStore()?.load(bagId);

      if (!cancelled) {
        setHasHiddenGroupContent((snapshot?.linkedGroupCount ?? 0) > 0);
      }
    };

    void loadGroupFlag();

    return () => {
      cancelled = true;
    };
  }, [bagId, reason]);

  useEffect(() => {
    app
      .getAnalyticsManager()
      ?.logEvent('offline_route_canvas_open', { reason });
  }, [reason]);

  const handleScrub = useCallback(
    (sample: RouteElevationSample | null) => {
      const key = bagRouteList.getSelectedKey() ?? '';

      setScrub(previous => {
        if (!sample) {
          return null;
        }

        if (previous?.sample === sample && previous.key === key) {
          return previous;
        }

        return { key, sample };
      });
    },
    [bagRouteList]
  );

  const handlePressPoint = useCallback(
    (point: MapPoint) => {
      const entry = bagPointList.getEntryByPoint(point);

      if (entry) {
        bagPointList.focusEntry(entry.key, false);
      }
    },
    [bagPointList]
  );

  // 경로는 평면 좌표로 한 번만 만든다 — 이동·확대는 그룹 transform 하나만 바꾼다.
  const paths = useMemo(
    () =>
      entries.map(entry => ({
        key: entry.key,
        d: projection.toPath(entry.route.getSimplified()),
      })),
    [entries, projection]
  );

  const profile = selectedRoute?.getElevationProfile() ?? null;
  const scrubSample =
    profile && scrub?.key === (selectedKey ?? '') ? scrub.sample : null;
  const simplified = selectedRoute?.getSimplified() ?? [];
  const startCoordinate = simplified.length > 0 ? simplified[0] : null;
  const endCoordinate =
    simplified.length > 1 ? simplified[simplified.length - 1] : null;
  const scaleBar = getScaleBar(camera.scale);
  const topLabel = l10n.t(
    reason === OfflineCanvasReason.Offline
      ? 'offline.canvas.offlineLine'
      : 'offline.canvas.mapFailedLine'
  );

  const renderOverlay = () => {
    if (!size) {
      return null;
    }

    const project = (latitude: number, longitude: number) =>
      toScreen(projection.project(latitude, longitude), camera, size);
    const start = startCoordinate
      ? project(startCoordinate.lat, startCoordinate.lng)
      : null;
    const end = endCoordinate
      ? project(endCoordinate.lat, endCoordinate.lng)
      : null;
    const scrubPoint = scrubSample
      ? project(scrubSample.latitude, scrubSample.longitude)
      : null;
    const myLocation = currentLocation
      ? project(currentLocation.latitude, currentLocation.longitude)
      : null;

    return (
      <>
        {/* 시작 라임 점 · 끝 잉크 점(GRP-8 마커 규칙)과 훑기 지점 — 화면 좌표라 확대해도 크기가 같다. */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents='none'
        >
          {end ? (
            <Circle
              cx={end.x}
              cy={end.y}
              r={ENDPOINT_RADIUS}
              fill={Acg.ink}
              stroke={Acg.paper}
              strokeWidth={2}
            />
          ) : null}
          {start ? (
            <Circle
              cx={start.x}
              cy={start.y}
              r={ENDPOINT_RADIUS}
              fill={Acg.lime}
              stroke={Acg.ink}
              strokeWidth={2}
            />
          ) : null}
          {scrubPoint ? (
            <Circle
              cx={scrubPoint.x}
              cy={scrubPoint.y}
              r={8}
              fill={Acg.paper}
              stroke={Acg.ink}
              strokeWidth={3}
            />
          ) : null}
        </Svg>
        {visiblePoints.map(point => {
          const position = project(point.getLatitude(), point.getLongitude());

          return (
            <OfflineCanvasPointMarkerView
              key={point.getId()}
              point={point}
              x={position.x}
              y={position.y}
              selected={focusedPoint === point}
              onPress={handlePressPoint}
            />
          );
        })}
        {myLocation ? (
          <OfflineCanvasMyLocationView
            x={myLocation.x}
            y={myLocation.y}
            heading={heading}
            canvasRotation={camera.rotation}
          />
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.canvasSection}>
        <GestureDetector gesture={gesture}>
          <View style={styles.canvas} onLayout={handleLayout}>
            {size ? (
              <Svg width={size.width} height={size.height}>
                <G transform={toSvgMatrix(camera, size)}>
                  {paths.map(path => {
                    const isSelected = path.key === selectedKey;

                    return (
                      <Path
                        key={path.key}
                        d={path.d}
                        fill='none'
                        stroke={isSelected ? Acg.ink : Acg.inkTint}
                        // 굵기는 화면 px로 고정한다 — 평면 단위라 확대 배율로 나눈다.
                        strokeWidth={
                          (isSelected ? ROUTE_WIDTH : ROUTE_DIM_WIDTH) /
                          camera.scale
                        }
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    );
                  })}
                </G>
              </Svg>
            ) : null}
          </View>
        </GestureDetector>

        <View style={StyleSheet.absoluteFill} pointerEvents='box-none'>
          {renderOverlay()}
        </View>

        {/* 상단 — 상태 한 줄(좌) · 북쪽(우). 닫기 없음(연결되면 지도로 바뀐다). */}
        <View
          style={[styles.topOverlay, { top: topInset }]}
          pointerEvents='box-none'
        >
          <View style={styles.topLead} pointerEvents='box-none'>
            <OfflineSnapshotBandView label={topLabel} />
            {reason === OfflineCanvasReason.Offline && hasHiddenGroupContent ? (
              <PretendardText style={styles.groupHidden}>
                {l10n.t('offline.canvas.groupHidden')}
              </PretendardText>
            ) : null}
          </View>
          <OfflineCanvasNorthView rotation={camera.rotation} />
        </View>

        {/* 하단 — 축척(좌) · 내 위치(우), 그 아래 포인트 카드. */}
        <View
          style={[styles.bottomOverlay, { bottom: CONTROL_BOTTOM_OFFSET }]}
          pointerEvents='box-none'
        >
          <View style={styles.controlRow} pointerEvents='box-none'>
            <View style={styles.scaleWrap} pointerEvents='none'>
              <OfflineCanvasScaleBarView scaleBar={scaleBar} />
            </View>
            <MapMyLocationButtonView
              mode={myLocationMode}
              locateLabel={l10n.t('route.myLocation')}
              onPress={() => void handlePressMyLocation()}
            />
          </View>
          {focusedEntry ? (
            <View style={styles.callout}>
              <PointCalloutView
                point={focusedEntry.point}
                meta={getBagPointMeta(focusedEntry)}
                // 오프라인에서는 포인트를 고칠 수 없다(OF-6).
                canEdit={false}
                routeMeta={pointRouteMark?.calloutMeta ?? null}
                disabled={false}
                onEdit={() => undefined}
                onDelete={() => undefined}
                onClose={handleTapCanvas}
              />
            </View>
          ) : null}
        </View>
      </View>

      {profile ? (
        <RouteElevationChartView
          key={`${selectedKey ?? ''}:${selectedRoute?.isReversed() ? 'r' : 'f'}`}
          profile={profile}
          {...(selected
            ? { displayDistance: selected.route.getDistance() }
            : {})}
          onScrub={handleScrub}
          pointMarker={pointRouteMark?.chartMarker ?? null}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  canvasSection: {
    flex: 1,
    overflow: 'hidden',
  },
  // 흰 바탕(Acg.paper) — 지형·그레인 없음(HM-8 · OF-6).
  canvas: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLead: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  // 캔버스 위에 뜨는 안내라 불투명 알약에 담는다(지도 조준 안내와 같은 이유).
  groupHidden: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.chip,
    overflow: 'hidden',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: AcgLayout.screenPadding,
    paddingRight: 16,
  },
  scaleWrap: {
    paddingBottom: 4,
  },
  callout: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
});

export default observer(OfflineRouteCanvasView);
