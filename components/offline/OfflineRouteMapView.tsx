import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  Camera,
  CameraRef,
  InitialViewState,
  LngLat,
  LngLatBounds,
  Map,
  ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
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
  Spacing,
} from '@/constants/DesignTokens';
import { MapCoordinate } from '@/hooks/useMapCurrentLocation';
import app from '@/model/app/App';
import { getBagPointMeta } from '@/model/bag-point/BagPointLabels';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRouteList from '@/model/bag-route/BagRouteList';
import MyLocationMode from '@/model/location/MyLocationMode';
import OfflineMapReason from '@/model/offline/OfflineMapReason';
import { OFFLINE_MAP_STYLE_URL } from '@/model/offline/OfflineMapStyle';
import MapPoint from '@/model/point/MapPoint';
import { mergeRouteBounds } from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';
import { RouteElevationSample } from '@/model/route/RouteElevation';
import OfflineMapEndpointMarkersView from './OfflineMapEndpointMarkersView';
import OfflineMapLayersView, {
  getOfflineRouteEntriesKey,
} from './OfflineMapLayersView';
import OfflineMapMyLocationView from './OfflineMapMyLocationView';
import OfflineMapPointMarkerView from './OfflineMapPointMarkerView';
import OfflineMapScrubMarkerView from './OfflineMapScrubMarkerView';
import OfflineSnapshotBandView from './OfflineSnapshotBandView';

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
  reason: OfflineMapReason;
  // 상단 오버레이를 헤더 아래로 내린다(지도와 같은 규칙 — iOS 투명 헤더).
  topInset: number;
}

interface ViewSnapshot {
  center: LngLat;
  zoom: number;
  bearing: number;
}

const IS_ANDROID = Platform.OS === 'android';
// 코스 전체를 맞출 때 가장자리 여백(pt). 시작·끝 말풍선과 포인트 마커가 잘리지 않게.
const FIT_PADDING = 40;
const MIN_ZOOM = 7;
const MAX_ZOOM = 18;
// `내 위치`·목록에서 고른 포인트로 옮길 때 최소 줌(네이버 지도 화면과 비슷한 축척).
const FOCUS_ZOOM = 15;
// 방향 모드 훅에 넘기는, 카메라 기록이 없을 때의 줌.
const FALLBACK_ZOOM = 14;
const CAMERA_MOVE_DURATION = 600;
// 포인트·코스가 한 점뿐이라 상자의 폭이 0이면 fitBounds가 최대 줌으로 들어간다 — 그때는 이 줌으로 가운데에 둔다.
const DEGENERATE_SPAN = 0.0005;
// 마커를 누른 직후 지도 탭이 같이 오면(플랫폼에 따라 전파된다) 포커스를 풀지 않는다.
const MARKER_PRESS_GUARD_MS = 400;
// 부채꼴 회전을 다시 그릴 최소 방위 변화(도) — 지도를 돌리는 동안 매 프레임 리렌더하지 않게.
const MIN_BEARING_DELTA = 1;
// 지도 가장자리와 지도 위 컨트롤(내 위치·나침반) 사이 여백.
const MAP_CONTROL_INSET = 16;
// 상단 안내 줄이 우상단 나침반(지도 기본 장식) 자리를 비우는 폭.
const COMPASS_CLEARANCE = 64;
// 상단 안내 줄 사이 간격.
const TOP_OVERLAY_GAP = 6;
// 그룹 안내 알약의 안쪽 여백.
const NOTICE_PILL_PADDING_H = 10;
const NOTICE_PILL_PADDING_V = 4;
// 지도 장식(MapLibre 기본) 위치. 출처 표기(라이선스 의무, OF-6)는 좌하단, 축척은 그 위.
// 포인트 카드가 떠 있으면 출처 표기·축척을 카드 위로 올린다 — 카드가 출처 표기를 가리면 안 된다.
// 안드로이드 축척 막대는 좌상단만 지원한다(라이브러리 제약) — 상단 안내 줄 아래로 내린다.
const ORNAMENT_MARGIN = 8;
// iOS 축척 막대를 출처 표기 위에 둘 때 둘 사이 높이(출처 표기 버튼 높이 + 여백).
const IOS_SCALE_BAR_ABOVE_ATTRIBUTION = 32;
const ANDROID_SCALE_BAR_TOP_OFFSET = 76;

const toLngLatBounds = (bounds: RouteBounds): LngLatBounds => [
  bounds.minLng,
  bounds.minLat,
  bounds.maxLng,
  bounds.maxLat,
];

const isDegenerate = (bounds: RouteBounds) =>
  bounds.maxLat - bounds.minLat < DEGENERATE_SPAN &&
  bounds.maxLng - bounds.minLng < DEGENERATE_SPAN;

// 상단은 헤더·안내 줄 아래부터 맞춘다.
const getFitPadding = (topInset: number) => ({
  top: topInset + FIT_PADDING,
  right: FIT_PADDING,
  bottom: FIT_PADDING,
  left: FIT_PADDING,
});

const getBoundsCenter = (bounds: RouteBounds): LngLat => [
  (bounds.minLng + bounds.maxLng) / 2,
  (bounds.minLat + bounds.maxLat) / 2,
];

/**
 * 오프라인 코스 지도 (OF-6) — 네이버 지도 대신 MapLibre로 저장해 둔 공개 지도(OpenFreeMap 벡터 타일 +
 * AWS Terrain Tiles 지형 음영, 스타일 `useless-outdoor`) 위에 등고선·코스·포인트·내 위치를 그린다.
 *
 * - 오프라인 전용이 아니라 "네이버 지도가 없을 때의 코스 지도"다 — 온라인에서 네이버 지도가 뜨지 않을 때도
 *   폴백으로 쓴다(그때는 타일을 서버에서 받는다).
 * - 처음에는 코스·포인트 전체에 맞추고, 핀치·드래그·회전으로 움직인다. 기울이기는 끈다(네이티브 3D 지형 없음).
 * - `내 위치`는 네이버 지도와 **같은 훅**(`useMyLocationHeadingMode`)이다 — ① 이동 → ② 방향 모드 → ③ 끄기.
 *   손으로 움직이면 따라가기만 풀리고 부채꼴은 남는다(BD-11).
 * - 고도 그래프·훑기·포인트 탭 시 그래프 표시는 네이버 지도 화면과 같은 컴포넌트를 쓴다.
 * - 길게 눌러 포인트 추가는 없다(오프라인은 읽기 전용 — OF-5).
 */
const OfflineRouteMapView: FC<Props> = ({
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
  const markerRoute =
    selectedRoute ?? (entries.length === 1 ? entries[0].route : null);
  const focusRequest = bagRouteList.getFocusRequest();
  const pointFocusRequest = bagPointList.getFocusRequest();
  const focusedEntry = bagPointList.getFocusedEntry();
  const focusedPoint = focusedEntry?.point ?? null;
  const visiblePoints = bagPointList.getVisiblePoints();
  const isContentReady =
    bagRouteList.isInitialized() && bagPointList.isInitialized();
  const pointRouteMark = usePointRouteMark(selectedRoute, focusedPoint);
  const bagId = bagRouteList.getBagId();
  const cameraRef = useRef<CameraRef>(null);
  // 마지막으로 알려진 지도 상태 — 줌 유지·③의 북쪽 되돌리기에 쓴다.
  const viewRef = useRef<ViewSnapshot | null>(null);
  // 이 화면이 열리기 전(온라인 지도)에 처리된 선택 요청은 다시 따르지 않는다 — 처음에는 전체를 보여 준다.
  const handledFocusSeqRef = useRef(focusRequest?.seq ?? 0);
  const handledPointSeqRef = useRef(pointFocusRequest?.seq ?? 0);
  /**
   * 지도를 붙일 때의 카메라. 코스·포인트가 모두 읽힌 뒤 한 번 정한다 — 정하기 전에는 지도를 붙이지 않아
   * 처음부터 그 자리에서 그린다(세계 지도에서 날아오지 않는다). `view`가 `null`이면 맞출 내용이 없다.
   */
  const [initialCamera, setInitialCamera] = useState<{
    view: InitialViewState | null;
  } | null>(null);
  const markerPressedAtRef = useRef(0);
  const [mapBearing, setMapBearing] = useState(0);
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [contours, setContours] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  const [hasHiddenGroupContent, setHasHiddenGroupContent] = useState(false);
  const [scrub, setScrub] = useState<{
    key: string;
    sample: RouteElevationSample;
  } | null>(null);
  // 떠 있는 포인트 카드의 높이(pt) — 출처 표기를 그 위로 올린다. 카드가 없으면 0.
  const [calloutHeight, setCalloutHeight] = useState(0);
  // 코스 선 레이어는 이 키가 바뀔 때만 다시 그린다(`getEntries()`는 부를 때마다 새 배열이다).
  const entriesKey = getOfflineRouteEntriesKey(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 키가 같으면 같은 선이다(키에 좌표 수·방향 포함).
  const stableEntries = useMemo(() => entries, [entriesKey]);

  // 최초 카메라 — 코스와 포인트가 모두 읽힌 뒤 전체 상자에 맞춘다. 내용이 하나도 없으면 저장해 둔
  // 지도 팩 영역(여행지 둘레, OF-1)으로 연다.
  useEffect(() => {
    if (initialCamera || !isContentReady) {
      return;
    }

    let cancelled = false;

    const decideInitialCamera = async () => {
      const bounds = mergeRouteBounds([
        bagRouteList.getContentBounds(),
        bagPointList.getContentBounds(),
      ]);

      if (bounds) {
        setInitialCamera({
          view: isDegenerate(bounds)
            ? { center: getBoundsCenter(bounds), zoom: FOCUS_ZOOM }
            : {
                bounds: toLngLatBounds(bounds),
                padding: getFitPadding(topInset),
              },
        });

        return;
      }

      const packBounds =
        (await app.getOfflineTripStore()?.getMapBounds(bagId)) ?? null;

      if (!cancelled) {
        setInitialCamera({
          view: packBounds
            ? { bounds: packBounds, padding: getFitPadding(topInset) }
            : null,
        });
      }
    };

    void decideInitialCamera();

    return () => {
      cancelled = true;
    };
  }, [
    bagId,
    bagPointList,
    bagRouteList,
    initialCamera,
    isContentReady,
    topInset,
  ]);

  const fitToBounds = useCallback(
    (bounds: RouteBounds) => {
      const camera = cameraRef.current;

      if (!camera) {
        return;
      }

      if (isDegenerate(bounds)) {
        camera.easeTo({
          center: getBoundsCenter(bounds),
          zoom: FOCUS_ZOOM,
          duration: CAMERA_MOVE_DURATION,
        });

        return;
      }

      camera.fitBounds(toLngLatBounds(bounds), {
        padding: getFitPadding(topInset),
        duration: CAMERA_MOVE_DURATION,
      });
    },
    [topInset]
  );

  const moveToCoordinate = useCallback((coordinate: MapCoordinate) => {
    const currentZoom = viewRef.current?.zoom ?? FALLBACK_ZOOM;

    cameraRef.current?.easeTo({
      center: [coordinate.longitude, coordinate.latitude],
      zoom: Math.max(currentZoom, FOCUS_ZOOM),
      duration: CAMERA_MOVE_DURATION,
    });
  }, []);

  const {
    currentLocation,
    mode: myLocationMode,
    heading,
    camera: followCamera,
    cameraAnimationDuration,
    handlePressMyLocation,
    handleCameraChanged,
    releaseFollow,
  } = useMyLocationHeadingMode({
    moveCamera: moveToCoordinate,
    logTag: 'OfflineMap',
    fallbackZoom: FALLBACK_ZOOM,
  });

  // ② 방향 모드: 내 위치를 따라가며 바라보는 방향이 위로 오게 지도 bearing을 돌린다.
  const isFollowing = myLocationMode === MyLocationMode.Heading;
  const followLatitude = isFollowing ? followCamera?.latitude : undefined;
  const followLongitude = isFollowing ? followCamera?.longitude : undefined;
  const followBearing = isFollowing ? followCamera?.bearing : undefined;
  const isHeadingShown = heading !== null;
  const wasHeadingShownRef = useRef(isHeadingShown);

  useEffect(() => {
    if (followLatitude === undefined || followLongitude === undefined) {
      return;
    }

    cameraRef.current?.easeTo({
      center: [followLongitude, followLatitude],
      bearing: followBearing ?? 0,
      duration: cameraAnimationDuration,
    });
  }, [cameraAnimationDuration, followBearing, followLatitude, followLongitude]);

  // ③ 방향 모드 끄기 — 부채꼴이 사라지는 순간 지도를 북쪽 위로 되돌린다.
  useEffect(() => {
    const wasShown = wasHeadingShownRef.current;

    wasHeadingShownRef.current = isHeadingShown;

    if (!wasShown || isHeadingShown) {
      return;
    }

    const center = viewRef.current?.center;

    if (!center) {
      return;
    }

    cameraRef.current?.easeTo({
      center,
      bearing: 0,
      duration: CAMERA_MOVE_DURATION,
    });
  }, [isHeadingShown]);

  // 목록에서 코스를 고르면 그 코스 전체로 옮긴다(BD-11). 훑는 중이면 옮기지 않는다(GRP-8).
  useEffect(() => {
    if (!focusRequest || focusRequest.seq === handledFocusSeqRef.current) {
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

    releaseFollow();
    fitToBounds(bounds);
  }, [bagRouteList, fitToBounds, focusRequest, releaseFollow, scrub]);

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

    const currentZoom = viewRef.current?.zoom ?? FALLBACK_ZOOM;

    releaseFollow();
    cameraRef.current?.easeTo({
      center: [entry.point.getLongitude(), entry.point.getLatitude()],
      zoom: pointFocusRequest.zoomIn
        ? Math.max(currentZoom, FOCUS_ZOOM)
        : currentZoom,
      duration: CAMERA_MOVE_DURATION,
    });
  }, [bagPointList, pointFocusRequest, releaseFollow]);

  // OF-1: 연결 그룹의 코스·포인트는 저장하지 않는다 — 그룹이 있었으면 그 사실을 한 줄로 알린다.
  useEffect(() => {
    if (reason !== OfflineMapReason.Offline) {
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

  // 등고선(OF-6) — 저장본의 `contours.json`. 폴백(온라인)에서는 저장하지 않은 여행일 수 있어 없으면 생략한다.
  useEffect(() => {
    let cancelled = false;

    const loadContours = async () => {
      const collection =
        (await app.getOfflineTripStore()?.loadContours(bagId)) ?? null;

      if (!cancelled) {
        setContours(collection);
      }
    };

    void loadContours();

    return () => {
      cancelled = true;
    };
  }, [bagId]);

  useEffect(() => {
    app.getAnalyticsManager()?.logEvent('offline_route_map_open', { reason });
  }, [reason]);

  const rememberView = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, zoom, bearing } = event.nativeEvent;

      viewRef.current = { center, zoom, bearing };
      setMapBearing(previous =>
        Math.abs(previous - bearing) < MIN_BEARING_DELTA ? previous : bearing
      );
    },
    []
  );

  // 손으로 움직이기 시작하면 바로 따라가기를 푼다 — 방향 모드의 카메라 이동이 손과 다투지 않게.
  const handleRegionWillChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, zoom, bearing, userInteraction } = event.nativeEvent;

      if (!userInteraction) {
        return;
      }

      handleCameraChanged({
        latitude: center[1],
        longitude: center[0],
        zoom,
        bearing,
        reason: 'Gesture',
      });
    },
    [handleCameraChanged]
  );

  const handleRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, zoom, bearing, userInteraction } = event.nativeEvent;

      rememberView(event);
      // 손이 아닌 이동도 알린다 — 훅이 방향 모드에 들어갈 때 마지막 줌·방위를 쓴다.
      handleCameraChanged({
        latitude: center[1],
        longitude: center[0],
        zoom,
        bearing,
        reason: userInteraction ? 'Gesture' : 'Developer',
      });
    },
    [handleCameraChanged, rememberView]
  );

  const handleDidFailLoadingMap = useCallback(() => {
    setIsLoadFailed(true);
  }, []);

  const handleDidFinishLoadingMap = useCallback(() => {
    setIsLoadFailed(false);
  }, []);

  const handlePressMap = useCallback(() => {
    if (Date.now() - markerPressedAtRef.current < MARKER_PRESS_GUARD_MS) {
      return;
    }

    bagPointList.clearFocus();
  }, [bagPointList]);

  const handleCalloutLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    setCalloutHeight(previous =>
      Math.abs(previous - height) < 1 ? previous : height
    );
  }, []);

  const handleClosePoint = useCallback(() => {
    bagPointList.clearFocus();
  }, [bagPointList]);

  const handlePressPoint = useCallback(
    (point: MapPoint) => {
      const entry = bagPointList.getEntryByPoint(point);

      markerPressedAtRef.current = Date.now();

      if (entry) {
        bagPointList.focusEntry(entry.key, false);
      }
    },
    [bagPointList]
  );

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

  const profile = selectedRoute?.getElevationProfile() ?? null;
  const scrubSample =
    profile && scrub?.key === (selectedKey ?? '') ? scrub.sample : null;
  const initialViewState = initialCamera?.view ?? null;
  const visibleCalloutHeight = focusedEntry ? calloutHeight : 0;
  const attributionBottom =
    visibleCalloutHeight > 0
      ? MAP_CONTROL_INSET + visibleCalloutHeight + ORNAMENT_MARGIN
      : ORNAMENT_MARGIN;
  const attributionPosition = {
    bottom: attributionBottom,
    left: ORNAMENT_MARGIN,
  };
  const topLabel = l10n.t(
    isLoadFailed
      ? 'offline.map.loadFailed'
      : reason === OfflineMapReason.Offline
        ? 'offline.map.offlineLine'
        : 'offline.map.fallbackLine'
  );

  return (
    <View style={styles.root}>
      <View style={styles.mapSection}>
        {initialCamera ? (
          <Map
            style={styles.map}
            mapStyle={OFFLINE_MAP_STYLE_URL}
            attribution
            attributionPosition={attributionPosition}
            logo={false}
            compass
            compassPosition={{ top: topInset, right: MAP_CONTROL_INSET }}
            compassHiddenFacingNorth
            scaleBar
            scaleBarPosition={
              IS_ANDROID
                ? {
                    top: topInset + ANDROID_SCALE_BAR_TOP_OFFSET,
                    left: AcgLayout.screenPadding,
                  }
                : {
                    bottom: attributionBottom + IOS_SCALE_BAR_ABOVE_ATTRIBUTION,
                    left: ORNAMENT_MARGIN,
                  }
            }
            touchPitch={false}
            onPress={handlePressMap}
            onRegionWillChange={handleRegionWillChange}
            onRegionIsChanging={rememberView}
            onRegionDidChange={handleRegionDidChange}
            onDidFinishLoadingMap={handleDidFinishLoadingMap}
            onDidFailLoadingMap={handleDidFailLoadingMap}
          >
            <Camera
              ref={cameraRef}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              {...(initialViewState ? { initialViewState } : {})}
            />
            <OfflineMapLayersView
              entries={stableEntries}
              selectedKey={selectedKey}
              contours={contours}
            />
            <OfflineMapEndpointMarkersView route={markerRoute} />
            {visiblePoints.map(point => (
              <OfflineMapPointMarkerView
                key={point.getId()}
                point={point}
                selected={focusedPoint === point}
                onPress={handlePressPoint}
              />
            ))}
            {scrubSample ? (
              <OfflineMapScrubMarkerView
                latitude={scrubSample.latitude}
                longitude={scrubSample.longitude}
              />
            ) : null}
            {currentLocation ? (
              <OfflineMapMyLocationView
                coordinate={currentLocation}
                heading={heading}
                mapBearing={mapBearing}
              />
            ) : null}
          </Map>
        ) : null}

        {/* 상단 — 상태 한 줄. 닫기 없음(연결되면 네이버 지도로 바뀐다). 나침반은 지도 기본 장식(우상단). */}
        <View
          style={[styles.topOverlay, { top: topInset }]}
          pointerEvents='box-none'
        >
          <OfflineSnapshotBandView label={topLabel} />
          {reason === OfflineMapReason.Offline && hasHiddenGroupContent ? (
            <PretendardText style={styles.groupHidden}>
              {l10n.t('offline.map.groupHidden')}
            </PretendardText>
          ) : null}
        </View>

        {/* 하단 — 내 위치(우), 그 아래 포인트 카드. 출처 표기·축척은 지도 기본 장식(좌하단, 카드가 있으면 그 위). */}
        <View
          style={[styles.bottomOverlay, { bottom: MAP_CONTROL_INSET }]}
          pointerEvents='box-none'
        >
          <View style={styles.controlRow} pointerEvents='box-none'>
            <MapMyLocationButtonView
              mode={myLocationMode}
              locateLabel={l10n.t('route.myLocation')}
              onPress={() => void handlePressMyLocation()}
            />
          </View>
          {focusedEntry ? (
            <View style={styles.callout} onLayout={handleCalloutLayout}>
              <PointCalloutView
                point={focusedEntry.point}
                meta={getBagPointMeta(focusedEntry)}
                // 오프라인 지도에서는 포인트를 고칠 수 없다(OF-6).
                canEdit={false}
                routeMeta={pointRouteMark?.calloutMeta ?? null}
                disabled={false}
                onEdit={() => undefined}
                onDelete={() => undefined}
                onClose={handleClosePoint}
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
  mapSection: {
    flex: 1,
    overflow: 'hidden',
    // 지도가 붙기 전·저장 영역 밖은 지면색(OF-6 — 타일이 없으면 빈 지면으로 보인다).
    backgroundColor: Acg.paper,
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    // 우상단 나침반(지도 기본 장식) 자리를 비운다.
    right: COMPASS_CLEARANCE,
    paddingLeft: AcgLayout.screenPadding,
    gap: TOP_OVERLAY_GAP,
    alignItems: 'flex-start',
  },
  // 지도 위에 뜨는 안내라 불투명 알약에 담는다(지도 조준 안내와 같은 이유).
  groupHidden: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    paddingHorizontal: NOTICE_PILL_PADDING_H,
    paddingVertical: NOTICE_PILL_PADDING_V,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.chip,
    overflow: 'hidden',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: Spacing.item,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: MAP_CONTROL_INSET,
  },
  callout: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
});

export default observer(OfflineRouteMapView);
