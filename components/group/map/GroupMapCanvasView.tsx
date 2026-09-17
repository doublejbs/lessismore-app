import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Camera,
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
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
import { deltaToZoom } from '@/model/map/MapZoom';
import GroupMapMarkersView, {
  GroupMapViewport,
} from './GroupMapMarkersView';
import GroupPointCalloutView from './GroupPointCalloutView';
import GroupPointFilterChipsView from './GroupPointFilterChipsView';

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

/**
 * 코스 폴리라인 색. 데이터 시각화 색이라 토큰 예외로 하드코딩한다(CLAUDE.md).
 * 선택한 코스는 굵고 진하게, 나머지는 옅게 그린다(GRP-10).
 */
const ROUTE_COLOR = '#2F6BFF';
const ROUTE_DIM_COLOR = 'rgba(47, 107, 255, 0.3)';
const ROUTE_OUTLINE_COLOR = '#FFFFFF';
const ROUTE_WIDTH = 6;
const ROUTE_DIM_WIDTH = 4;
const ROUTE_OUTLINE_WIDTH = 2;

/** 경로선은 좌표가 2개 미만이면 지도에 추가되지 않는다(라이브러리 제약). */
const MIN_PATH_COORDS = 2;

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
 * 접근성 보조기술로 쓰기 어려워, 같은 일을 하는 **`여기에 포인트 추가` 알약**(카메라 중심
 * 좌표)을 함께 둔다.
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
  const [locationGranted, setLocationGranted] = useState(false);
  const [viewport, setViewport] = useState<GroupMapViewport | null>(null);
  const [longPressAt, setLongPressAt] = useState<{
    x: number;
    y: number;
    seq: number;
  } | null>(null);
  const handledLongPressRef = useRef(0);
  const pointList = groupMap.getPointList();
  const routes = groupMap.getRoutes();
  const campSpot = groupMap.getCampSpot();
  const selectedRouteId = groupMap.getSelectedRouteId();
  const selectedPoint = groupMap.getFocusedPoint();

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

      mapRef.current.animateCameraTo({ latitude, longitude, zoom, duration: 500 });
    },
    []
  );

  /**
   * 최초 카메라 (GRP-10): 코스·포인트를 모두 담는 상자 → 없으면 박지 위치 →
   * 박지도 없으면 현재 위치 순으로 간다. 셋 다 없으면 남한 전역에 머문다.
   */
  const fitInitialCamera = useCallback(async () => {
    if (didFitRef.current || !mapReadyRef.current || !groupMap.isInitialized()) {
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

  // 위치 권한은 현재 위치 버튼 노출 판단에만 쓴다 — 지도 진입에서 새로 묻지 않는다
  // (포인트 추가는 롱프레스로 가능하므로 권한이 없어도 화면이 동작해야 한다, GRP-9 엣지 케이스).
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (mountedRef.current) {
          setLocationGranted(status === 'granted');
        }
      } catch {
        return;
      }
    };

    void checkPermission();
  }, []);

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
    []
  );

  useEffect(() => {
    if (!longPressAt || handledLongPressRef.current === longPressAt.seq) {
      return;
    }

    handledLongPressRef.current = longPressAt.seq;
    void handleLongPress(longPressAt.x, longPressAt.y);
  }, [handleLongPress, longPressAt]);

  // 롱프레스의 접근 가능한 대안 — 화면(카메라) 중심 좌표로 등록 시트를 연다.
  const handleAddAtCenter = useCallback(() => {
    onRequestCreate({ ...cameraRef.current });
  }, [onRequestCreate]);

  const handleMoveToCurrentLocation = useCallback(async () => {
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();

      if (!lastKnown || !mountedRef.current) {
        return;
      }

      moveCamera(
        lastKnown.coords.latitude,
        lastKnown.coords.longitude,
        deltaToZoom(0.05)
      );
    } catch (error) {
      console.warn('[GroupMap] 현재 위치 이동 실패', error); // l10n-ignore: 개발자 로그
    }
  }, [moveCamera]);

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

  return (
    <GestureHandlerRootView style={styles.root}>
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
            {/* 코스 폴리라인 — 선택한 코스를 굵게, 나머지를 옅게(GRP-10). */}
            {routes.map(route => {
              const coords = route
                .getSimplified()
                .map(coordinate => ({
                  latitude: coordinate.lat,
                  longitude: coordinate.lng,
                }));

              if (coords.length < MIN_PATH_COORDS) {
                return null;
              }

              const isSelected =
                routes.length === 1 || route.getId() === selectedRouteId;

              return (
                <NaverMapPathOverlay
                  key={route.getId()}
                  coords={coords}
                  width={isSelected ? ROUTE_WIDTH : ROUTE_DIM_WIDTH}
                  color={isSelected ? ROUTE_COLOR : ROUTE_DIM_COLOR}
                  outlineWidth={isSelected ? ROUTE_OUTLINE_WIDTH : 0}
                  outlineColor={ROUTE_OUTLINE_COLOR}
                />
              );
            })}

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
                <View key={campSpot.id} collapsable={false} style={styles.spotPin}>
                  <SpotPinView width={SPOT_PIN_WIDTH} />
                </View>
              </NaverMapMarkerOverlay>
            ) : null}

            <GroupMapMarkersView
              pointList={pointList}
              viewport={viewport}
              selectedPointId={groupMap.getFocusedPointId()}
              onTapPoint={handleTapPoint}
            />
          </NaverMapView>
        </View>
      </GestureDetector>

      {/* 상단 오버레이 — 유형 필터 칩(GRP-10). */}
      <View style={[styles.topOverlay, { top: topInset }]} pointerEvents='box-none'>
        <GroupPointFilterChipsView pointList={pointList} onMap />
      </View>

      {/* 현재 위치 버튼 — 권한이 있을 때만 노출한다(GRP-9 엣지 케이스). */}
      {locationGranted ? (
        <View
          style={[styles.locateWrapper, { bottom: insets.bottom + 120 }]}
          pointerEvents='box-none'
        >
          <TouchableOpacity
            style={styles.locateButton}
            onPress={() => void handleMoveToCurrentLocation()}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('group.map.currentLocation')}
          >
            <Ionicons name='locate' size={22} color={Acg.ink} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents='box-none'
      >
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
          onPress={handleAddAtCenter}
          disabled={isFull || pointList.isSubmitting()}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.map.addPoint')}
          accessibilityHint={l10n.t('group.map.addPointHint')}
          accessibilityState={{ disabled: isFull }}
        >
          <Ionicons name='add' size={20} color={Acg.ink} />
          <PretendardText weight='semibold' style={styles.addLabel}>
            {l10n.t(isFull ? 'group.map.pointFull' : 'group.map.addPoint')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.bg,
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
  locateWrapper: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
  },
  // 원형 아이콘 버튼은 지도 위에서 불투명이어야 아이콘이 지형에 묻히지 않는다.
  locateButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: AcgShadow.card,
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
});

export default observer(GroupMapCanvasView);
