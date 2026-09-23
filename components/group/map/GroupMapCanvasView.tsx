import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Camera,
  NaverMapMarkerOverlay,
  NaverMapView,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryChipView from '@/components/browse/CategoryChipView';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import RoutePathOverlayView from '@/components/route/RoutePathOverlayView';
import PretendardText from '@/components/PretendardText';
import SpotPinView from '@/components/camp-site/SpotPinView';
import {
  Acg,
  AcgLayout,
  AcgShadow,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupMap from '@/model/group-map/GroupMap';
import { RouteElevationSample } from '@/model/route/RouteElevation';
import { deltaToZoom } from '@/model/map/MapZoom';
import GroupMapAimMarkerView from './GroupMapAimMarkerView';
import GroupMapMarkersView, { GroupMapViewport } from './GroupMapMarkersView';
import GroupPointCalloutView from './GroupPointCalloutView';
import GroupPointFilterChipsView from './GroupPointFilterChipsView';
import RouteScrubMarkerView from '@/components/route/RouteScrubMarkerView';
import RouteEndpointMarkersView from '@/components/route/RouteEndpointMarkersView';
import MapControlButtonView from '@/components/map/MapControlButtonView';
import MapMyLocationMarkerView from '@/components/map/MapMyLocationMarkerView';
import {
  MapCoordinate,
  useMapCurrentLocation,
} from '@/hooks/useMapCurrentLocation';

interface Props {
  groupMap: GroupMap;
  onRequestCreate: (coordinate: {
    latitude: number;
    longitude: number;
  }) => void;
  onRequestEdit: (point: GroupPoint) => void;
  onRequestDelete: (point: GroupPoint) => void;
  // Android 커스텀 헤더 높이만큼 상단 오버레이를 내린다(iOS는 투명 헤더라 세이프에어리어로 충분).
  topInset: number;
}

/** 남한 전역이 보이는 폴백 카메라(코스·포인트·박지·현재 위치가 모두 없을 때). */
const KOREA_CAMERA: Camera = {
  latitude: 36.2,
  longitude: 127.9,
  zoom: deltaToZoom(4.8),
};

/** 경계 상자가 화면 가장자리에 붙지 않도록 주는 여유 배율. */
const CAMERA_PADDING_RATIO = 1.3;

/** 최소 표시 범위(도). 포인트가 하나뿐이면 상자가 0이라 최대 줌으로 붙어 버린다. */
const MIN_REGION_DELTA = 0.004;

const SPOT_PIN_WIDTH = 30;
const SPOT_PIN_HEIGHT = 40;

/**
 * 그룹 지도 (GRP-9 · GRP-10) — 네이티브 전용 본문.
 *
 * 코스 폴리라인 · 포인트 마커 · 연결된 박지 마커를 한 화면에 그린다. 지도 구성과 마커 성능
 * 처리(뷰포트 안만 렌더, 캡션 충돌 숨김)는 박지 지도(CS-1·CS-2)를 따른다.
 *
 * **롱프레스**: `@mj-studio/react-native-naver-map@2.9.0`에는 지도 롱프레스 콜백이 없다
 * (`onTapMap`뿐이다 — `lib/typescript/module/src/component/NaverMapView.d.ts`). 그래서 지도를
 * `GestureDetector`로 감싸 `Gesture.LongPress()`로 화면 좌표를 받고, 지도 ref의 공식 API
 * `screenToCoordinate({ screenX, screenY })`로 위경도를 얻는다. 롱프레스는 발견하기 어렵고
 * 접근성 보조기술로 쓰기 어려워, 같은 일을 하는 **`여기에 포인트 추가` 알약**을 함께 둔다.
 * 알약은 바로 시트를 열지 않고 **조준 모드**로 들어간다 — 화면 정중앙에 조준 마커를 띄워
 * 어디에 찍히는지 눈으로 확인시킨 뒤 확정을 받는다(GRP-9).
 *
 * **고도 그래프**는 지도 아래에 둔다(GRP-8). 지도 위에 얹으면 훑는 동안 손가락과 그래프가
 * 지도를 가려 "이 오르막이 어디인가"를 볼 수 없다 — 이 기능이 존재하는 이유가 사라진다.
 */
const GroupMapCanvasView: FC<Props> = ({
  groupMap,
  onRequestCreate,
  onRequestEdit,
  onRequestDelete,
  topInset,
}) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<NaverMapViewRef>(null);
  const mapReadyRef = useRef(false);
  const didFitRef = useRef(false);
  const cameraRef = useRef<{ latitude: number; longitude: number }>({
    latitude: KOREA_CAMERA.latitude,
    longitude: KOREA_CAMERA.longitude,
  });
  const zoomRef = useRef(deltaToZoom(0.2));
  const mountedRef = useRef(true);
  const [viewport, setViewport] = useState<GroupMapViewport | null>(null);
  const [longPressAt, setLongPressAt] = useState<{
    x: number;
    y: number;
    seq: number;
  } | null>(null);
  // 포인트 추가 조준 모드 (GRP-9). 이 동안에는 필터 칩·정보 카드·코스 칩을 걷어 조준을 가리지 않는다.
  const [isAiming, setIsAiming] = useState(false);
  /**
   * 고도 그래프에서 훑고 있는 지점 (GRP-8). 손을 떼면 `null`이 되어 마커가 사라진다.
   * **어느 코스의 지점인지 함께 들고 있는다** — 코스를 바꾸면 그래프는 새로 마운트되지만
   * 손을 뗐다고 알려 줄 길이 없어, 태그가 없으면 지난 코스의 마커가 지도에 남는다.
   */
  const [scrub, setScrub] = useState<{
    routeId: string;
    sample: RouteElevationSample;
  } | null>(null);
  const handledLongPressRef = useRef(0);
  const pointList = groupMap.getPointList();
  const routes = groupMap.getRoutes();
  const campSpot = groupMap.getCampSpot();
  const selectedRouteId = groupMap.getSelectedRouteId();
  const selectedPoint = groupMap.getFocusedPoint();
  // 코스가 하나뿐이면 선택 없이도 그 코스가 주인공이다(GRP-10 강조 규칙과 같은 판정).
  const selectedRoute =
    routes.length === 1
      ? routes[0]
      : (routes.find(route => route.getId() === selectedRouteId) ?? null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
    };
  }, []);

  const moveCamera = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      if (!mountedRef.current || !mapReadyRef.current || !mapRef.current) {
        return;
      }

      mapRef.current.animateCameraTo({
        latitude,
        longitude,
        zoom,
        duration: 500,
      });
    },
    []
  );

  /**
   * 최초 카메라 (GRP-10): 코스·포인트를 모두 담는 상자 → 없으면 박지 위치 →
   * 박지도 없으면 현재 위치 순으로 간다. 셋 다 없으면 남한 전역에 머문다.
   */
  const fitInitialCamera = useCallback(async () => {
    if (
      didFitRef.current ||
      !mapReadyRef.current ||
      !groupMap.isInitialized()
    ) {
      return;
    }

    const bounds = groupMap.getContentBounds();

    if (bounds) {
      didFitRef.current = true;

      const latitudeDelta = Math.max(
        (bounds.maxLatitude - bounds.minLatitude) * CAMERA_PADDING_RATIO,
        MIN_REGION_DELTA
      );
      const longitudeDelta = Math.max(
        (bounds.maxLongitude - bounds.minLongitude) * CAMERA_PADDING_RATIO,
        MIN_REGION_DELTA
      );

      mapRef.current?.animateRegionTo({
        latitude:
          (bounds.minLatitude + bounds.maxLatitude) / 2 - latitudeDelta / 2,
        longitude:
          (bounds.minLongitude + bounds.maxLongitude) / 2 - longitudeDelta / 2,
        latitudeDelta,
        longitudeDelta,
        duration: 500,
      });

      return;
    }

    if (campSpot) {
      didFitRef.current = true;
      moveCamera(
        campSpot.location.latitude,
        campSpot.location.longitude,
        deltaToZoom(0.05)
      );

      return;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();

      if (!lastKnown || !mountedRef.current || didFitRef.current) {
        return;
      }

      didFitRef.current = true;
      moveCamera(
        lastKnown.coords.latitude,
        lastKnown.coords.longitude,
        deltaToZoom(0.2)
      );
    } catch (error) {
      console.warn('[GroupMap] 초기 카메라 위치 조회 실패', error); // l10n-ignore: 개발자 로그
    }
  }, [campSpot, groupMap, moveCamera]);

  /**
   * 현재 위치 — 박지 지도·배낭 코스 지도와 같은 공용 훅(CS-1 규칙: 포커스 동안 구독 + 폴백 사슬).
   * 지도 진입에서 권한을 새로 묻지 않는다(포인트 추가는 롱프레스로 가능하므로 권한이 없어도 화면이
   * 동작해야 한다, GRP-9 엣지 케이스). 권한 여부는 버튼 노출과 내 위치 점 판단에 쓴다.
   */
  const moveToCoordinate = useCallback(
    (coordinate: MapCoordinate) => {
      moveCamera(coordinate.latitude, coordinate.longitude, deltaToZoom(0.05));
    },
    [moveCamera]
  );
  const {
    granted: locationGranted,
    currentLocation,
    moveToCurrentLocation,
  } = useMapCurrentLocation({
    moveCamera: moveToCoordinate,
    logTag: 'GroupMap',
  });

  // 데이터가 늦게 도착해도 한 번은 맞춘다.
  useEffect(() => {
    void fitInitialCamera();
  }, [fitInitialCamera, routes, campSpot]);

  // 목록에서 넘어온 포인트로 카메라를 옮긴다(GRP-9).
  // 포인트가 아직 안 읽혔을 수 있으므로 개수를 의존성에 실어, 로드가 끝난 뒤 한 번 더 돈다.
  const focusedPointId = groupMap.getFocusedPointId();
  const pointCount = pointList.getCount();

  useEffect(() => {
    if (!focusedPointId) {
      return;
    }

    const point = pointList.getPointById(focusedPointId);

    if (!point) {
      return;
    }

    // 목록에서 찍어 들어온 포인트는 최초 fit이 덮어쓰지 않게 한다.
    didFitRef.current = true;
    moveCamera(point.getLatitude(), point.getLongitude(), deltaToZoom(0.02));
  }, [focusedPointId, moveCamera, pointCount, pointList]);

  const handleMapInitialized = useCallback(() => {
    mapReadyRef.current = true;

    setViewport(prev =>
      prev
        ? prev
        : {
            latitude: KOREA_CAMERA.latitude,
            longitude: KOREA_CAMERA.longitude,
            zoom: KOREA_CAMERA.zoom ?? 0,
          }
    );

    void fitInitialCamera();
  }, [fitInitialCamera]);

  const handleCameraChanged = useCallback((camera: Camera) => {
    if (!mountedRef.current) {
      return;
    }

    const zoom = camera.zoom ?? 0;

    zoomRef.current = zoom;
    cameraRef.current = {
      latitude: camera.latitude,
      longitude: camera.longitude,
    };

    // 중심 0.05°·줌 0.25 단위 양자화 — 동일 값이면 마커 레이어가 리렌더되지 않는다.
    const quantized = {
      latitude: Math.round(camera.latitude / 0.05) * 0.05,
      longitude: Math.round(camera.longitude / 0.05) * 0.05,
      zoom: Math.round(zoom / 0.25) * 0.25,
    };

    setViewport(prev =>
      prev &&
      prev.latitude === quantized.latitude &&
      prev.longitude === quantized.longitude &&
      prev.zoom === quantized.zoom
        ? prev
        : quantized
    );
  }, []);

  const handleLongPress = useCallback(
    async (x: number, y: number) => {
      const map = mapRef.current;

      if (!map || !mapReadyRef.current) {
        return;
      }

      try {
        const coordinate = await map.screenToCoordinate({
          screenX: x,
          screenY: y,
        });

        if (!coordinate?.isValid || !mountedRef.current) {
          return;
        }

        onRequestCreate({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        });
      } catch (error) {
        console.warn('[GroupMap] 롱프레스 좌표 변환 실패', error); // l10n-ignore: 개발자 로그
      }
    },
    [onRequestCreate]
  );

  /**
   * 롱프레스는 좌표만 상태로 올리고, 지도 ref를 읽는 변환은 아래 이펙트가 맡는다 —
   * 렌더 중 만들어지는 제스처 콜백이 ref를 직접 붙들지 않게 하려는 분리다.
   * `seq`가 누를 때마다 올라가 같은 지점을 다시 눌러도 이펙트가 다시 돈다.
   */
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        // 조준 모드에서는 끈다 — 확정을 기다리는 중에 다른 좌표로 시트가 열리면 모드가 꼬인다.
        .enabled(!isAiming)
        .minDuration(450)
        .maxDistance(24)
        .runOnJS(true)
        .onStart(event => {
          setLongPressAt(previous => ({
            x: event.x,
            y: event.y,
            seq: (previous?.seq ?? 0) + 1,
          }));
        }),
    [isAiming]
  );

  useEffect(() => {
    if (!longPressAt || handledLongPressRef.current === longPressAt.seq) {
      return;
    }

    handledLongPressRef.current = longPressAt.seq;
    void handleLongPress(longPressAt.x, longPressAt.y);
  }, [handleLongPress, longPressAt]);

  /**
   * 롱프레스의 접근 가능한 대안 (GRP-9). 바로 시트를 열지 않고 **조준 모드**에 들어간다 —
   * 시트가 먼저 뜨면 어느 지점이 잡혔는지 확인할 방법이 없다.
   */
  const handleStartAiming = useCallback(() => {
    groupMap.focusPoint(null);
    setIsAiming(true);
  }, [groupMap]);

  const handleCancelAiming = useCallback(() => {
    setIsAiming(false);
  }, []);

  // 조준 마커는 화면 정중앙에 고정돼 있고, 그 자리가 곧 카메라 중심이다.
  const handleConfirmAiming = useCallback(() => {
    setIsAiming(false);
    onRequestCreate({ ...cameraRef.current });
  }, [onRequestCreate]);

  /**
   * 그래프 훑기 (GRP-8). **카메라는 건드리지 않는다** — 손가락 아래에서 지도가 움직이면
   * 그래프의 x와 지도 위 지점이 매 프레임 어긋나 위치를 읽을 수 없다. 마커만 옮긴다.
   */
  const handleScrub = useCallback(
    (sample: RouteElevationSample | null) => {
      const routeId = groupMap.getSelectedRouteId() ?? '';

      // 같은 표본이면 이전 객체를 그대로 돌려준다 — 한 번 훑는 동안 들어오는 수십 번의
      // 이벤트가 그대로 렌더가 되면 지도 마커가 프레임마다 네이티브로 다시 동기화된다.
      setScrub(previous => {
        if (!sample) {
          return null;
        }

        if (previous?.sample === sample && previous.routeId === routeId) {
          return previous;
        }

        return { routeId, sample };
      });
    },
    [groupMap]
  );

  const handleTapPoint = useCallback(
    (point: GroupPoint) => {
      groupMap.focusPoint(point.getId());
      moveCamera(point.getLatitude(), point.getLongitude(), zoomRef.current);
    },
    [groupMap, moveCamera]
  );

  const handleTapMap = useCallback(() => {
    groupMap.focusPoint(null);
  }, [groupMap]);

  const isFull = pointList.isFull();
  const elevationProfile = selectedRoute?.getElevationProfile() ?? null;
  /**
   * 고도가 없는 코스는 그래프 자리를 아예 비운다 — 빈 틀은 "데이터를 못 불러왔다"로 읽힌다(GRP-8).
   * 조준 모드에서도 접는다: 지도를 넓히고, 확정 버튼 말고 누를 것을 두지 않는다(GRP-9).
   */
  const showProfile = !!elevationProfile && !isAiming;
  // 그래프가 화면 아래를 차지하면 세이프에어리어는 그래프가 비운다 — 오버레이는 지도 안에 남는다.
  const overlayBottomInset = showProfile ? 0 : insets.bottom;
  // 그래프가 걷힌 뒤(조준 모드·코스 교체)에는 남은 표본을 그리지 않는다.
  const scrubSample =
    showProfile && scrub?.routeId === (selectedRouteId ?? '')
      ? scrub.sample
      : null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.mapSection}>
        <GestureDetector gesture={longPressGesture}>
          <View style={styles.mapArea}>
            <NaverMapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialCamera={KOREA_CAMERA}
              isShowLocationButton={false}
              isShowZoomControls={false}
              isShowScaleBar={false}
              onInitialized={handleMapInitialized}
              onTapMap={handleTapMap}
              onCameraChanged={handleCameraChanged}
            >
              {/* 코스 폴리라인 — 선택한 코스를 굵게, 나머지를 옅게(GRP-10).
                배낭 코스 화면(BD-11)과 같은 선을 쓴다. */}
              <RoutePathOverlayView
                routes={routes}
                selectedRouteId={selectedRouteId}
              />

              {/* 연결된 박지 마커 — 앱 공통 핀(끝점이 좌표에 닿는다). */}
              {campSpot ? (
                <NaverMapMarkerOverlay
                  latitude={campSpot.location.latitude}
                  longitude={campSpot.location.longitude}
                  anchor={{ x: 0.5, y: 1 }}
                  width={SPOT_PIN_WIDTH}
                  height={SPOT_PIN_HEIGHT}
                  caption={{
                    text: campSpot.name,
                    align: 'Top',
                    textSize: 12,
                    color: Acg.ink,
                    haloColor: Acg.paper,
                    offset: 4,
                  }}
                  isHideCollidedSymbols
                >
                  <View
                    key={campSpot.id}
                    collapsable={false}
                    style={styles.spotPin}
                  >
                    <SpotPinView width={SPOT_PIN_WIDTH} />
                  </View>
                </NaverMapMarkerOverlay>
              ) : null}

              {/* 선택한 코스의 시작·끝 — 옅게 그린 코스엔 달지 않는다(지도가 마커로 덮이지 않게). */}
              <RouteEndpointMarkersView route={selectedRoute} />

              <GroupMapMarkersView
                pointList={pointList}
                viewport={viewport}
                selectedPointId={groupMap.getFocusedPointId()}
                onTapPoint={handleTapPoint}
              />

              {/* 내 위치 점 — 권한이 있을 때만(CS-1과 같은 지오 앵커 마커). */}
              {currentLocation ? (
                <MapMyLocationMarkerView
                  latitude={currentLocation.latitude}
                  longitude={currentLocation.longitude}
                />
              ) : null}

              {/* 고도 그래프를 훑는 동안만 뜨는 위치 마커(GRP-8). */}
              {scrubSample ? (
                <RouteScrubMarkerView
                  latitude={scrubSample.latitude}
                  longitude={scrubSample.longitude}
                />
              ) : null}
            </NaverMapView>
          </View>
        </GestureDetector>

        {/* 조준 마커는 지도 좌표가 아니라 화면에 고정된다(GRP-9). */}
        {isAiming ? <GroupMapAimMarkerView /> : null}

        {/* 상단 오버레이 — 유형 필터 칩(GRP-10). 조준 모드에서는 걷는다. */}
        {isAiming ? null : (
          <View
            style={[styles.topOverlay, { top: topInset }]}
            pointerEvents='box-none'
          >
            <GroupPointFilterChipsView pointList={pointList} onMap />
          </View>
        )}

        {/* 우측 지도 컨트롤 — 위에서부터 방향 뒤집기, 현재 위치.
          방향 뒤집기(GRP-8): 네이티브 지도는 코스를 목록이 아니라 칩으로 고르므로 `⋯` 메뉴가 없다 —
          코스를 뒤집는 진입을 지도에 둔다. 조준 모드에서는 걷는다(확정 말고 누를 것을 두지 않는다).
          현재 위치: 권한이 있을 때만 노출한다(GRP-9 엣지 케이스). 조준 모드에서도 남긴다 —
          내 자리로 지도를 옮겨 그 부근을 겨누는 것이 흔한 경로다. */}
        {(selectedRoute && !isAiming) || locationGranted ? (
          <View
            style={[styles.controlStack, { bottom: overlayBottomInset + 120 }]}
            pointerEvents='box-none'
          >
            {selectedRoute && !isAiming ? (
              <MapControlButtonView
                icon='swap-vertical'
                accessibilityLabel={l10n.t(
                  selectedRoute.isReversed()
                    ? 'route.restoreDirectionOf'
                    : 'route.reverseOf',
                  { name: selectedRoute.getName() }
                )}
                onPress={() => selectedRoute.toggleReversed()}
              />
            ) : null}
            {locationGranted ? (
              <MapControlButtonView
                icon='locate'
                accessibilityLabel={l10n.t('group.map.currentLocation')}
                onPress={() => void moveToCurrentLocation()}
              />
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.bottomOverlay,
            { paddingBottom: overlayBottomInset + 16 },
          ]}
          pointerEvents='box-none'
        >
          {/* 조준 모드에서는 정보 카드·코스 칩을 걷어 조준을 가리지 않는다(GRP-9). */}
          {isAiming ? (
            <>
              <View style={styles.aimHint}>
                <PretendardText style={styles.aimHintLabel} numberOfLines={2}>
                  {l10n.t('group.map.aimHint')}
                </PretendardText>
              </View>
              <View style={styles.aimActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelAiming}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('common.cancel')}
                >
                  <PretendardText style={styles.cancelLabel}>
                    {l10n.t('common.cancel')}
                  </PretendardText>
                </TouchableOpacity>
                {/* 조준 모드의 주 액션 하나 — 라임은 여기에만 쓴다(HM-8). */}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleConfirmAiming}
                  disabled={pointList.isSubmitting()}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('group.map.aimConfirm')}
                >
                  <Ionicons name='checkmark' size={20} color={Acg.ink} />
                  <PretendardText weight='semibold' style={styles.addLabel}>
                    {l10n.t('group.map.aimConfirm')}
                  </PretendardText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {selectedPoint ? (
                <GroupPointCalloutView
                  point={selectedPoint}
                  memberIds={groupMap.getMemberIds()}
                  canEdit={groupMap.canEditPoint(selectedPoint)}
                  disabled={pointList.isSubmitting()}
                  onEdit={() => onRequestEdit(selectedPoint)}
                  onDelete={() => onRequestDelete(selectedPoint)}
                  onClose={handleTapMap}
                />
              ) : null}

              {/* 코스가 여럿일 때만 선택 칩을 둔다 — 하나뿐이면 고를 것이 없다(GRP-10). */}
              {routes.length > 1 ? (
                <View style={styles.routeRow}>
                  {routes.map(route => (
                    <CategoryChipView
                      key={route.getId()}
                      label={route.getName()}
                      tone='acgSolid'
                      variant='secondary'
                      selected={route.getId() === selectedRouteId}
                      onPress={() => groupMap.selectRoute(route.getId())}
                    />
                  ))}
                </View>
              ) : null}

              {/* 화면의 주 액션 하나 — 라임은 여기에만 쓴다(HM-8). */}
              <TouchableOpacity
                style={[styles.addButton, isFull && styles.addButtonDisabled]}
                onPress={handleStartAiming}
                disabled={isFull || pointList.isSubmitting()}
                activeOpacity={0.8}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.map.addPoint')}
                accessibilityHint={l10n.t('group.map.addPointHint')}
                accessibilityState={{ disabled: isFull }}
              >
                <Ionicons name='add' size={20} color={Acg.ink} />
                <PretendardText weight='semibold' style={styles.addLabel}>
                  {l10n.t(
                    isFull ? 'group.map.pointFull' : 'group.map.addPoint'
                  )}
                </PretendardText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 고도 그래프는 지도 **아래**다 — 지도를 가리면 훑는 동안 위치를 못 본다(GRP-8). */}
      {showProfile && elevationProfile ? (
        <RouteElevationChartView
          // 코스를 바꾸면 그래프를 새로 마운트해 이전 코스의 커서가 남지 않게 한다.
          // 방향을 뒤집어도 새로 마운트한다 — 단면이 바뀌므로 커서가 옛 단면 자리에 남지 않게.
          key={`${selectedRoute?.getId() ?? ''}:${selectedRoute?.isReversed() ? 'r' : 'f'}`}
          profile={elevationProfile}
          // 축 거리는 목록 행과 같은 원본 거리로 읽힌다(GRP-8).
          {...(selectedRoute
            ? { displayDistance: selectedRoute.getDistance() }
            : {})}
          onScrub={handleScrub}
          bottomInset={insets.bottom + 12}
        />
      ) : null}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  // 지도와 그 위 오버레이가 사는 칸. 고도 그래프는 이 칸 **밖**(아래)에 붙는다(GRP-8).
  mapSection: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
  },
  spotPin: {
    width: SPOT_PIN_WIDTH,
    height: SPOT_PIN_HEIGHT,
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // 지도 위 원형 컨트롤 세로 스택(우측 16 — 배낭 코스 지도와 같은 자리 규칙).
  controlStack: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: AcgLayout.chipGap,
  },
  addButton: {
    alignSelf: 'center',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    boxShadow: AcgShadow.card,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  aimActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // 안내는 지도 위에 뜨므로 불투명 알약에 담는다 — 지형 위 맨 글자는 읽히지 않는다.
  aimHint: {
    alignSelf: 'center',
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.chip,
  },
  aimHintLabel: {
    ...AcgType.meta,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
  // 취소는 액션이 아니라 되돌리기다 — 면을 채우지 않고 주 액션과 무게를 갈라 둔다.
  cancelButton: {
    minHeight: 48,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
    boxShadow: AcgShadow.card,
  },
  cancelLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(GroupMapCanvasView);
