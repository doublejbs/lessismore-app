import { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import SpotPinView from '@/components/camp-site/SpotPinView';
import AppMapView, {
  AppMapCameraChange,
  AppMapCoordinate,
  AppMapInitialCamera,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import MapEndpointMarkersView from '@/components/map/MapEndpointMarkersView';
import MapMyLocationButtonView from '@/components/map/MapMyLocationButtonView';
import MapMyLocationMarkerView from '@/components/map/MapMyLocationMarkerView';
import MapNoticeLineView from '@/components/map/MapNoticeLineView';
import MapPointMarkersView from '@/components/map/MapPointMarkersView';
import MapRoutePathLayersView from '@/components/map/MapRoutePathLayersView';
import MapScrubMarkerView from '@/components/map/MapScrubMarkerView';
import { useMyLocationHeadingMode } from '@/components/map/useMyLocationHeadingMode';
import PointAimMarkerView from '@/components/point/PointAimMarkerView';
import PointCalloutView from '@/components/point/PointCalloutView';
import PointFilterChipsView from '@/components/point/PointFilterChipsView';
import usePointRouteMark from '@/components/point/usePointRouteMark';
import RouteEndpointCalloutView from '@/components/route/RouteEndpointCalloutView';
import {
  RouteEndpointCameraPadding,
  useRouteEndpointState,
} from '@/components/route/useRouteEndpointState';
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
import GroupPoint from '@/model/group/GroupPoint';
import GroupValidationError from '@/model/group/GroupValidationError';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import GroupMap from '@/model/group-map/GroupMap';
import { getGroupPointAuthorLabel } from '@/model/group-point/GroupPointLabels';
import MyLocationMode from '@/model/location/MyLocationMode';
import {
  CURRENT_LOCATION_DELTA,
  KOREA_CAMERA,
  lngLatBoundsToRouteBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
import { deltaToZoom } from '@/model/map/MapZoom';
import MapPoint from '@/model/point/MapPoint';
import { getPointDateText, getPointTypeLabel } from '@/model/point/PointLabels';
import { getRouteFitRegion } from '@/model/route/RouteCamera';
import { RouteBounds, RouteCoordinate } from '@/model/route/RouteData';
import { RouteElevationSample } from '@/model/route/RouteElevation';
import GroupMapRoutePanelView from './GroupMapRoutePanelView';

interface Props {
  groupMap: GroupMap;
  onRequestCreate: (coordinate: {
    latitude: number;
    longitude: number;
  }) => void;
  onRequestEdit: (point: GroupPoint) => void;
  onRequestDelete: (point: GroupPoint) => void;
  // 고도 그래프 머리 줄 → 코스 목록 시트(GRP-10). 시트는 화면(`GroupMapView`)이 그린다.
  onOpenRouteList: () => void;
  // `코스 추가` — GPX 선택 → 업로드(GRP-8). 흐름은 `useGroupMapRouteState`가 잇는다.
  onAddRoute: () => void;
  // `코스 추가`로 시작한 작업이 진행 중인지(파일 선택 포함) / 그중 업로드 단계인지.
  isAddingRoute: boolean;
  isUploadingRoute: boolean;
  // Android 커스텀 헤더 높이만큼 상단 오버레이를 내린다(iOS는 투명 헤더라 세이프에어리어로 충분).
  topInset: number;
}

interface ViewSnapshot {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
}

interface MapSize {
  width: number;
  height: number;
}

/** 현재 위치로 옮길 때의 줌 — 약 0.05° 범위(배낭 코스 지도의 `내 위치`와 같은 값). */
const CURRENT_LOCATION_ZOOM = deltaToZoom(CURRENT_LOCATION_DELTA);
/** 박지 위치로 처음 열 때의 줌(약 0.05° 범위). */
const CAMP_SPOT_ZOOM = deltaToZoom(0.05);
/** 내용이 없어 마지막 위치로 처음 열 때의 줌(약 0.2° 범위). */
const LAST_LOCATION_ZOOM = deltaToZoom(0.2);
/** 포인트에 초점을 줄 때의 줌(약 0.02° 범위). */
const POINT_FOCUS_ZOOM = deltaToZoom(0.02);
const CAMERA_MOVE_DURATION = 500;
const MAX_ZOOM = 18;

const SPOT_PIN_WIDTH = 30;
const SPOT_PIN_HEIGHT = 40;
// 박지 캡션 최대 폭(pt) — 긴 이름이 지도를 가로지르지 않게 한 줄로 자른다(포인트 캡션과 같은 값).
const SPOT_CAPTION_MAX_WIDTH = 140;
const SPOT_CAPTION_PADDING_H = 6;
const SPOT_CAPTION_PADDING_V = 1;
const SPOT_CAPTION_GAP = 2;
// 상단 오버레이와 지도 장식(나침반·안드로이드 축척 막대) 사이 여백.
const OVERLAY_GAP = 8;
// 지도 위 우측 컨트롤이 하단 카드·추가 버튼 줄 위로 떠 있는 높이(네이버 시절과 같은 자리).
const CONTROL_STACK_BOTTOM = 120;
// 하단 오버레이의 바닥 여백.
const BOTTOM_OVERLAY_PADDING = 16;
// 마커를 누른 직후 지도 탭이 같이 오면(플랫폼에 따라 전파된다) 포커스를 풀지 않는다.
const MARKER_PRESS_GUARD_MS = 400;
// 부채꼴 회전을 다시 그릴 최소 방위 변화(도) — 지도를 돌리는 동안 매 프레임 리렌더하지 않게.
const MIN_BEARING_DELTA = 1;

const toFitCamera = (bounds: RouteBounds): AppMapInitialCamera => ({
  bounds: lngLatBoundsToRouteBounds(
    regionToLngLatBounds(getRouteFitRegion(bounds))
  ),
  padding: 0,
});

/**
 * 그룹 지도 (GRP-9 · GRP-10 · MAP-4) — 네이티브 전용 본문. 지도는 앱 공용 `AppMapView`(MapLibre)다.
 *
 * 코스 선 · 포인트 마커 · 연결된 박지 핀을 한 화면에 그린다. 코스·끝점·포인트·훑기·내 위치는 배낭 코스
 * 지도(BD-11 · BD-14)와 **같은 공용 레이어·마커**다(`components/map/`). 박지는 하나뿐이라 `Marker`(핀 + 캡션)다.
 *
 * **롱프레스**: MapLibre의 네이티브 롱프레스(`onLongPress`)가 좌표를 바로 준다. 롱프레스는 발견하기 어렵고
 * 접근성 보조기술로 쓰기 어려워, 같은 일을 하는 **`포인트 추가` 알약**을 함께 둔다. 알약은 바로 시트를 열지
 * 않고 **조준 모드**로 들어간다 — 화면 정중앙에 조준 마커를 띄워 어디에 찍히는지 눈으로 확인시킨 뒤 확정을
 * 받는다(GRP-9).
 *
 * **고도 그래프**는 지도 아래에 둔다(GRP-8). 지도 위에 얹으면 훑는 동안 손가락과 그래프가
 * 지도를 가려 "이 오르막이 어디인가"를 볼 수 없다 — 이 기능이 존재하는 이유가 사라진다.
 * 그래프 머리에는 선택 코스 `이름 · 거리 · 상승 ›`가 서고, 누르면 코스 목록 시트가 뜬다(GRP-10 —
 * 코스 칩을 대신한다). 방향 뒤집기·삭제는 그 시트의 행 `⋯`에 있다.
 *
 * **추가 버튼 두 개**(GRP-10): `코스 추가`(흰 보조 알약) + `포인트 추가`(라임 — 화면당 하나, HM-8).
 */
const GroupMapCanvasView: FC<Props> = ({
  groupMap,
  onRequestCreate,
  onRequestEdit,
  onRequestDelete,
  onOpenRouteList,
  onAddRoute,
  isAddingRoute,
  isUploadingRoute,
  topInset,
}) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<AppMapViewRef>(null);
  const mountedRef = useRef(true);
  // 처리한 마지막 코스 선택 요청(`GroupMap.focusRoute`)의 `seq`.
  const handledFocusSeqRef = useRef(0);
  // 초점 포인트를 처리했는지. 같은 포인트로 카메라를 두 번 옮기지 않는다.
  const handledPointIdRef = useRef<string | null>(null);
  // 지금 손가락이 고도 그래프 위에 있는지. 이때는 선택이 바뀌어도 카메라를 옮기지 않는다(GRP-8).
  const scrubbingRef = useRef(false);
  // 마지막으로 알려진 지도 상태 — ③의 북쪽 되돌리기·조준 확정 폴백에 쓴다.
  const viewRef = useRef<ViewSnapshot | null>(null);
  const mapSizeRef = useRef<MapSize | null>(null);
  const markerPressedAtRef = useRef(0);
  const loggedLoadFailureRef = useRef(false);
  // 처음 카메라를 정하는 중(마지막 위치 조회 대기)인지 — 두 번 정하지 않는다.
  const decidingInitialRef = useRef(false);
  /**
   * 지도를 붙일 때의 카메라. 그룹(코스·포인트·박지)을 읽은 뒤 한 번 정한다 — 정하기 전에는 지도를 붙이지 않아
   * 처음부터 그 자리에서 그린다(남한 전역에서 날아오지 않는다). 그 뒤의 이동은 ref 명령이다.
   */
  const [initialCamera, setInitialCamera] =
    useState<AppMapInitialCamera | null>(null);
  const [mapBearing, setMapBearing] = useState(0);
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  // 상단 오버레이(안내 줄·유형 칩)의 아래 끝(pt) — 나침반·안드로이드 축척 막대를 그 아래로 내린다.
  const [topOverlayBottom, setTopOverlayBottom] = useState(topInset);
  // 하단 오버레이(카드·추가 버튼)의 높이 — 출처 표기(라이선스 의무, MAP-1)를 그 위로 올린다.
  const [bottomOverlayHeight, setBottomOverlayHeight] = useState(0);
  // 포인트 추가 조준 모드 (GRP-9). 이 동안에는 필터 칩·정보 카드·추가 버튼·코스 패널을 걷어 조준을 가리지 않는다.
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
  const pointList = groupMap.getPointList();
  const routeList = groupMap.getRouteList();
  const routes = groupMap.getRoutes();
  const campSpot = groupMap.getCampSpot();
  const selectedRouteId = groupMap.getSelectedRouteId();
  const selectedPoint = groupMap.getFocusedPoint();
  const focusedPointId = groupMap.getFocusedPointId();
  const routeFocusRequest = groupMap.getRouteFocusRequest();
  const initialized = groupMap.isInitialized();
  const pointsInitialized = pointList.isInitialized();
  // 고른 코스가 없거나 지워졌으면 첫 코스다(GRP-10 강조 규칙 — `GroupMap.getSelectedRouteId`).
  const selectedRoute = groupMap.getSelectedRoute();
  // 고른 포인트가 선택된 코스의 어디쯤인지 — 그래프 표시와 카드 메타 줄(GRP-8).
  const pointRouteMark = usePointRouteMark(selectedRoute, selectedPoint);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 현재 위치 — 박지 지도·배낭 코스 지도와 같은 공용 훅(CS-1 규칙: 포커스 동안 구독 + 폴백 사슬).
   * 지도 진입에서 권한을 새로 묻지 않는다(포인트 추가는 롱프레스로 가능하므로 권한이 없어도 화면이
   * 동작해야 한다, GRP-9 엣지 케이스). 권한 여부는 버튼 노출과 내 위치 점 판단에 쓴다.
   * 버튼을 다시 누르면 방향 모드(지도 회전 + 방향 부채꼴), 한 번 더 누르면 끈다(GRP-10 · BD-11).
   */
  const moveToCoordinate = useCallback((coordinate: MapCoordinate) => {
    mapRef.current?.animateTo({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      zoom: CURRENT_LOCATION_ZOOM,
      duration: CAMERA_MOVE_DURATION,
    });
  }, []);
  const {
    granted: locationGranted,
    currentLocation,
    mode: myLocationMode,
    heading,
    camera: followCamera,
    cameraAnimationDuration,
    handlePressMyLocation,
    handleCameraChanged: handleMyLocationCameraChanged,
    releaseFollow,
  } = useMyLocationHeadingMode({
    moveCamera: moveToCoordinate,
    logTag: 'GroupMap',
    fallbackZoom: CURRENT_LOCATION_ZOOM,
  });

  // 화면이 카메라를 옮기면 방향 모드의 따라가기를 푼다 — 다음 나침반 값이 되돌리지 않게. 줌이 없으면 유지한다.
  const moveCamera = useCallback(
    (latitude: number, longitude: number, zoom?: number) => {
      releaseFollow();
      mapRef.current?.animateTo({
        latitude,
        longitude,
        ...(zoom !== undefined ? { zoom } : {}),
        duration: CAMERA_MOVE_DURATION,
      });
    },
    [releaseFollow]
  );

  // 출발·도착 마커 탭 → 위치 정보 카드(GRP-8). 포인트 카드와 동시에 뜨지 않는다.
  // 카드가 덮는 높이만큼 아래 여백(`padding`)을 줘 끝점을 카드 위 빈 자리에 둔다.
  const handleMoveToEndpoint = useCallback(
    (coordinate: RouteCoordinate, padding: RouteEndpointCameraPadding) => {
      releaseFollow();
      mapRef.current?.animateTo({
        latitude: coordinate.lat,
        longitude: coordinate.lng,
        padding,
        duration: CAMERA_MOVE_DURATION,
      });
    },
    [releaseFollow]
  );
  const handleSelectEndpoint = useCallback(() => {
    groupMap.focusPoint(null);
  }, [groupMap]);
  const {
    endpointInfo,
    endpoint,
    handleTapEndpoint,
    handleCloseEndpoint,
    handleMapLayout,
    handleTopOverlayLayout,
    handleBottomOverlayLayout,
  } = useRouteEndpointState({
    route: selectedRoute,
    moveCamera: handleMoveToEndpoint,
    onSelect: handleSelectEndpoint,
  });
  const hasFocusedPoint = !!focusedPointId;

  // 포인트에 초점이 가면(마커 탭·목록) 끝점 카드를 닫는다.
  useEffect(() => {
    if (hasFocusedPoint) {
      handleCloseEndpoint();
    }
  }, [handleCloseEndpoint, hasFocusedPoint]);

  const fitBounds = useCallback(
    (bounds: RouteBounds) => {
      releaseFollow();
      mapRef.current?.fitRegion(
        getRouteFitRegion(bounds),
        CAMERA_MOVE_DURATION
      );
    },
    [releaseFollow]
  );

  /**
   * 최초 카메라 (GRP-10): 아직 처리하지 않은 초점 포인트 → 고른 코스 → 코스·포인트를 모두 담는 상자 →
   * 박지 위치 → 마지막 현재 위치 → 남한 전역. 초점 포인트가 있는데 포인트를 아직 읽지 않았으면 기다린다.
   */
  useEffect(() => {
    if (initialCamera || decidingInitialRef.current || !initialized) {
      return;
    }

    const pointId = groupMap.getFocusedPointId();

    if (pointId && !pointList.isInitialized()) {
      return;
    }

    decidingInitialRef.current = true;

    // 마지막 위치는 비동기로 읽는다 — 나머지 판단도 같은 흐름에 둔다.
    const decideInitialCamera = async (): Promise<AppMapInitialCamera> => {
      const routeRequest = groupMap.getRouteFocusRequest();

      handledFocusSeqRef.current = routeRequest?.seq ?? 0;
      handledPointIdRef.current = pointId;

      const point = pointId ? pointList.getPointById(pointId) : null;

      if (point) {
        return {
          latitude: point.getLatitude(),
          longitude: point.getLongitude(),
          zoom: POINT_FOCUS_ZOOM,
        };
      }

      const routeBounds = routeRequest
        ? (groupMap
            .getRoutes()
            .find(item => item.getId() === routeRequest.routeId)
            ?.getBounds() ?? null)
        : null;
      const bounds = routeBounds ?? groupMap.getContentBounds();

      if (bounds) {
        return toFitCamera(bounds);
      }

      if (campSpot) {
        return {
          latitude: campSpot.location.latitude,
          longitude: campSpot.location.longitude,
          zoom: CAMP_SPOT_ZOOM,
        };
      }

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const lastKnown =
          status === 'granted'
            ? await Location.getLastKnownPositionAsync()
            : null;

        if (lastKnown) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            zoom: LAST_LOCATION_ZOOM,
          };
        }
      } catch (error) {
        console.warn('[GroupMap] 초기 카메라 위치 조회 실패', error); // l10n-ignore: 개발자 로그
      }

      return KOREA_CAMERA;
    };

    const applyInitialCamera = async () => {
      const camera = await decideInitialCamera();

      decidingInitialRef.current = false;

      if (mountedRef.current) {
        setInitialCamera(camera);
      }
    };

    void applyInitialCamera();
  }, [
    campSpot,
    groupMap,
    initialCamera,
    initialized,
    pointList,
    pointsInitialized,
  ]);

  /**
   * 고른 코스로 카메라를 옮긴다 (GRP-8) — 코스 목록 시트의 행, 방금 올린 코스.
   * **고를 때마다** 옮긴다(같은 코스를 다시 골라도 `seq`가 올라간다). 지도를 붙이기 전의 요청은 최초 카메라가
   * 맡는다. 코스가 아직 없으면(방금 올려 목록 갱신 전) 요청을 남겨 두고 코스가 들어오면 다시 본다.
   */
  useEffect(() => {
    if (
      !initialCamera ||
      !routeFocusRequest ||
      routeFocusRequest.seq === handledFocusSeqRef.current
    ) {
      return;
    }

    const route = routes.find(
      item => item.getId() === routeFocusRequest.routeId
    );
    const bounds = route?.getBounds() ?? null;

    if (!bounds && !groupMap.isInitialized()) {
      return;
    }

    handledFocusSeqRef.current = routeFocusRequest.seq;

    // 훑는 중에 바뀐 선택은 카메라를 옮기지 않는다 — 손가락 아래 그래프와 지도가 어긋난다.
    if (scrubbingRef.current) {
      scrubbingRef.current = false;

      return;
    }

    if (bounds) {
      fitBounds(bounds);
    }
  }, [fitBounds, groupMap, initialCamera, routeFocusRequest, routes]);

  /**
   * 초점을 준 포인트로 카메라를 옮긴다(GRP-9) — 목록 등 `GroupMap.focusPoint`. 마커 탭은 탭 처리에서 줌을
   * 유지한 채 옮기고 여기서는 건너뛴다. 포인트를 아직 읽지 않았으면 기다리고, 읽었는데 없으면(그새 지워짐) 버린다.
   */
  useEffect(() => {
    if (
      !initialCamera ||
      !focusedPointId ||
      handledPointIdRef.current === focusedPointId ||
      !pointsInitialized
    ) {
      return;
    }

    handledPointIdRef.current = focusedPointId;

    const point = pointList.getPointById(focusedPointId);

    if (point) {
      moveCamera(point.getLatitude(), point.getLongitude(), POINT_FOCUS_ZOOM);
    }
  }, [focusedPointId, initialCamera, moveCamera, pointList, pointsInitialized]);

  // ② 방향 모드: 내 위치를 따라가며 바라보는 방향이 위로 오게 지도 bearing을 돌린다(GRP-10 · BD-11).
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

    mapRef.current?.animateTo({
      latitude: followLatitude,
      longitude: followLongitude,
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

    const view = viewRef.current;

    if (!view) {
      return;
    }

    mapRef.current?.animateTo({
      latitude: view.latitude,
      longitude: view.longitude,
      bearing: 0,
      duration: CAMERA_MOVE_DURATION,
    });
  }, [isHeadingShown]);

  // 지도 이동 알림(시작·진행·끝). 손으로 움직이면(`Gesture`) 훅이 방향 모드의 따라가기를 푼다(GRP-10 · BD-11).
  const handleMapCameraChanged = useCallback(
    (change: AppMapCameraChange) => {
      const { latitude, longitude, zoom, bearing } = change;

      viewRef.current = { latitude, longitude, zoom, bearing };
      setMapBearing(previous =>
        Math.abs(previous - bearing) < MIN_BEARING_DELTA ? previous : bearing
      );
      handleMyLocationCameraChanged(change);
    },
    [handleMyLocationCameraChanged]
  );

  // 지도 데이터 로드 실패(MAP-2) — 상단 한 줄. 마커·선은 그대로 그린다. 측정은 화면 수명당 한 번.
  const handleLoadFailed = useCallback(() => {
    setIsLoadFailed(true);

    if (loggedLoadFailureRef.current) {
      return;
    }

    loggedLoadFailureRef.current = true;
    app
      .getAnalyticsManager()
      ?.logEvent('map_load_failed', { screen: 'group_map' });
  }, []);

  const handleMapInitialized = useCallback(() => {
    setIsLoadFailed(false);
  }, []);

  const handleMapAreaLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      mapSizeRef.current = { width, height };
      handleMapLayout(event);
    },
    [handleMapLayout]
  );

  const handleTopOverlayAreaLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      const bottom = y + height;

      setTopOverlayBottom(previous =>
        Math.abs(previous - bottom) < 1 ? previous : bottom
      );
      handleTopOverlayLayout(event);
    },
    [handleTopOverlayLayout]
  );

  const handleBottomOverlayAreaLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;

      setBottomOverlayHeight(previous =>
        Math.abs(previous - height) < 1 ? previous : height
      );
      handleBottomOverlayLayout(event);
    },
    [handleBottomOverlayLayout]
  );

  // 길게 누르기 → 입력 시트(GRP-9). 지도의 네이티브 롱프레스라 좌표가 바로 온다. 조준 모드에서는 받지 않는다.
  const handleLongPress = useCallback(
    (coordinate: AppMapCoordinate) => {
      if (isAiming) {
        return;
      }

      onRequestCreate(coordinate);
    },
    [isAiming, onRequestCreate]
  );

  /**
   * 롱프레스의 접근 가능한 대안 (GRP-9). 바로 시트를 열지 않고 **조준 모드**에 들어간다 —
   * 시트가 먼저 뜨면 어느 지점이 잡혔는지 확인할 방법이 없다.
   */
  const handleStartAiming = useCallback(() => {
    groupMap.focusPoint(null);
    handleCloseEndpoint();
    setIsAiming(true);
  }, [groupMap, handleCloseEndpoint]);

  const handleCancelAiming = useCallback(() => {
    setIsAiming(false);
  }, []);

  /**
   * 조준 마커는 지도 칸 정중앙에 고정돼 있다 — 그 화면 점의 좌표를 읽는다(카메라 여백이 남아 있어도 마커
   * 아래 좌표다). 못 읽으면 카메라 중심, 그것도 없으면 마지막으로 알려진 중심.
   */
  const handleConfirmAiming = useCallback(async () => {
    const map = mapRef.current;
    const size = mapSizeRef.current;
    const atMarker =
      map && size
        ? await map.screenToCoordinate({
            x: size.width / 2,
            y: size.height / 2,
          })
        : null;
    const coordinate =
      atMarker ?? (map ? await map.getCenter() : null) ?? viewRef.current;

    if (!mountedRef.current || !coordinate) {
      return;
    }

    setIsAiming(false);
    onRequestCreate({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  }, [onRequestCreate]);

  /**
   * 그래프 훑기 (GRP-8). **카메라는 건드리지 않는다** — 손가락 아래에서 지도가 움직이면
   * 그래프의 x와 지도 위 지점이 매 프레임 어긋나 위치를 읽을 수 없다. 마커만 옮긴다.
   */
  const handleScrub = useCallback(
    (sample: RouteElevationSample | null) => {
      const routeId = groupMap.getSelectedRouteId() ?? '';

      scrubbingRef.current = !!sample;

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

  // 마커 탭 — 지금 줌 그대로 그 포인트로 옮긴다(초점 이동 이펙트는 건너뛴다).
  const handleTapPoint = useCallback(
    (point: MapPoint) => {
      markerPressedAtRef.current = Date.now();
      handledPointIdRef.current = point.getId();
      groupMap.focusPoint(point.getId());
      moveCamera(point.getLatitude(), point.getLongitude());
    },
    [groupMap, moveCamera]
  );

  const handleTapEndpointMarker = useCallback(
    (...args: Parameters<typeof handleTapEndpoint>) => {
      markerPressedAtRef.current = Date.now();
      handleTapEndpoint(...args);
    },
    [handleTapEndpoint]
  );

  const handleCloseCards = useCallback(() => {
    groupMap.focusPoint(null);
    handleCloseEndpoint();
  }, [groupMap, handleCloseEndpoint]);

  const handlePressMap = useCallback(() => {
    if (Date.now() - markerPressedAtRef.current < MARKER_PRESS_GUARD_MS) {
      return;
    }

    handleCloseCards();
  }, [handleCloseCards]);

  // 카드 메타 줄 — `유형 · 작성자 · 등록일`(GRP-9). 작성자는 그룹에만 있어 여기서 붙인다.
  const getPointMeta = (point: GroupPoint) =>
    [
      getPointTypeLabel(point.getType()),
      getGroupPointAuthorLabel(
        point.getAuthorId(),
        point.getAuthorName(),
        groupMap.getMemberIds()
      ),
      getPointDateText(point.getCreatedAt()),
    ].join(l10n.t('group.detail.metaSeparator'));

  const isFull = pointList.isFull();
  const isRouteFull = routeList.isFull();
  const canAddRoute = routeList.canAdd();
  /**
   * 코스 패널(머리 줄 + 고도 그래프)은 코스가 있으면 선다 — 고도 없는 코스도 머리 줄은 있다(GRP-10).
   * 조준 모드에서는 접는다: 지도를 넓히고, 확정 버튼 말고 누를 것을 두지 않는다(GRP-9).
   */
  const showRoutePanel = !!selectedRoute && !isAiming;

  // `코스 추가` 라벨 — 업로드 중엔 `올리는 중`, 상한이면 막힌 이유를 라벨 자리에 적는다(포인트와 같은 문법).
  const getAddRouteLabelKey = () => {
    if (isUploadingRoute) {
      return 'group.route.uploading';
    }

    if (isRouteFull) {
      return 'group.map.routeFull';
    }

    return 'group.route.add';
  };

  const showProfile = showRoutePanel && !!selectedRoute?.getElevationProfile();
  // 패널이 화면 아래를 차지하면 세이프에어리어는 패널이 비운다 — 오버레이는 지도 안에 남는다.
  const overlayBottomInset = showRoutePanel ? 0 : insets.bottom;
  // 그래프가 걷힌 뒤(조준 모드·코스 교체)에는 남은 표본을 그리지 않는다.
  const scrubSample =
    showProfile && scrub?.routeId === (selectedRouteId ?? '')
      ? scrub.sample
      : null;
  const ornamentTopOffset = Math.max(topInset, topOverlayBottom + OVERLAY_GAP);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.mapSection}>
        <View style={styles.mapArea} onLayout={handleMapAreaLayout}>
          {initialCamera ? (
            <AppMapView
              ref={mapRef}
              initialCamera={initialCamera}
              showScaleBar
              attributionBottomOffset={bottomOverlayHeight}
              ornamentTopOffset={ornamentTopOffset}
              maxZoom={MAX_ZOOM}
              onPress={handlePressMap}
              onLongPress={handleLongPress}
              onCameraChanged={handleMapCameraChanged}
              onInitialized={handleMapInitialized}
              onLoadFailed={handleLoadFailed}
            >
              {/* 코스 선 — 선택한 코스를 굵게, 나머지를 옅게(GRP-10). 배낭 코스 화면(BD-11)과 같은 선이다. */}
              <MapRoutePathLayersView
                routes={routes}
                selectedRouteId={selectedRouteId}
              />

              {/* 연결된 박지 핀 — 앱 공통 핀(끝점이 좌표에 닿는다) + 위 캡션. */}
              {campSpot ? (
                <Marker
                  id={`group-map-spot-${campSpot.id}`}
                  lngLat={[
                    campSpot.location.longitude,
                    campSpot.location.latitude,
                  ]}
                  anchor='bottom'
                >
                  <View
                    collapsable={false}
                    pointerEvents='none'
                    style={styles.spotMarker}
                    accessible
                    accessibilityLabel={campSpot.name}
                  >
                    <PretendardText
                      weight='semibold'
                      style={styles.spotCaption}
                      numberOfLines={1}
                    >
                      {campSpot.name}
                    </PretendardText>
                    <View style={styles.spotPin}>
                      <SpotPinView width={SPOT_PIN_WIDTH} />
                    </View>
                  </View>
                </Marker>
              ) : null}

              {/* 선택한 코스의 시작·끝 — 옅게 그린 코스엔 달지 않는다(지도가 마커로 덮이지 않게). */}
              <MapEndpointMarkersView
                route={selectedRoute}
                onTapEndpoint={handleTapEndpointMarker}
              />

              <MapPointMarkersView
                points={pointList.getVisiblePoints()}
                selectedPointId={focusedPointId}
                onTapPoint={handleTapPoint}
              />

              {/* 고도 그래프를 훑는 동안만 뜨는 위치 마커(GRP-8). */}
              {scrubSample ? (
                <MapScrubMarkerView
                  latitude={scrubSample.latitude}
                  longitude={scrubSample.longitude}
                />
              ) : null}

              {/* 내 위치 점 — 권한이 있을 때만. */}
              {currentLocation ? (
                <MapMyLocationMarkerView
                  latitude={currentLocation.latitude}
                  longitude={currentLocation.longitude}
                  heading={heading}
                  mapBearing={mapBearing}
                />
              ) : null}
            </AppMapView>
          ) : null}
        </View>

        {/* 조준 마커는 지도 좌표가 아니라 화면에 고정된다(GRP-9). */}
        {isAiming ? <PointAimMarkerView /> : null}

        {/* 상단 오버레이 — 로드 실패 한 줄 + 유형 필터 칩(GRP-10). 조준 모드에서는 칩을 걷는다. 나침반은 그 아래. */}
        <View
          style={[styles.topOverlay, { top: topInset }]}
          pointerEvents='box-none'
          onLayout={handleTopOverlayAreaLayout}
        >
          {isLoadFailed ? (
            <MapNoticeLineView label={l10n.t('map.loadFailed')} />
          ) : null}
          {isAiming ? null : (
            <View style={styles.chips}>
              <PointFilterChipsView
                selectedType={pointList.getSelectedType()}
                onSelectType={type => pointList.selectType(type)}
                onMap
              />
            </View>
          )}
        </View>

        {/* 우측 지도 컨트롤 — 현재 위치(누를 때마다 내 위치로 → 방향 모드 → 끄기). 권한이 있을 때만 노출한다(GRP-9 엣지 케이스).
          조준 모드에서도 남긴다 — 내 자리로 지도를 옮겨 그 부근을 겨누는 것이 흔한 경로다.
          방향 뒤집기는 코스 목록 시트의 행 `⋯`에 있다(GRP-10) — 같은 일을 두 곳에 두지 않는다. */}
        {locationGranted ? (
          <View
            style={[
              styles.controlStack,
              { bottom: overlayBottomInset + CONTROL_STACK_BOTTOM },
            ]}
            pointerEvents='box-none'
          >
            <MapMyLocationButtonView
              mode={myLocationMode}
              locateLabel={l10n.t('group.map.currentLocation')}
              onPress={() => void handlePressMyLocation()}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.bottomOverlay,
            { paddingBottom: overlayBottomInset + BOTTOM_OVERLAY_PADDING },
          ]}
          pointerEvents='box-none'
          onLayout={handleBottomOverlayAreaLayout}
        >
          {/* 조준 모드에서는 정보 카드·추가 버튼 둘을 걷어 조준을 가리지 않는다(GRP-9 · GRP-10). */}
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
                  onPress={() => void handleConfirmAiming()}
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
                <PointCalloutView
                  point={selectedPoint}
                  meta={getPointMeta(selectedPoint)}
                  canEdit={groupMap.canEditPoint(selectedPoint)}
                  routeMeta={pointRouteMark?.calloutMeta ?? null}
                  disabled={pointList.isSubmitting()}
                  onEdit={() => onRequestEdit(selectedPoint)}
                  onDelete={() => onRequestDelete(selectedPoint)}
                  onClose={handleCloseCards}
                />
              ) : null}

              {/* 코스 출발·도착 위치 정보 카드(GRP-8) — 포인트 카드와 같은 자리, 둘 중 하나만 뜬다. */}
              {endpoint && selectedRoute && !selectedPoint ? (
                <RouteEndpointCalloutView
                  endpointInfo={endpointInfo}
                  endpoint={endpoint}
                  routeName={selectedRoute.getName()}
                  onClose={handleCloseEndpoint}
                />
              ) : null}

              {/* 추가 버튼 두 개(GRP-10) — 나란히, 같은 높이. 라임은 `포인트 추가` 하나다(HM-8). */}
              <View style={styles.addActions}>
                {canAddRoute ? (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      isRouteFull && styles.addButtonDisabled,
                    ]}
                    onPress={onAddRoute}
                    disabled={
                      isRouteFull || isAddingRoute || routeList.isSubmitting()
                    }
                    activeOpacity={0.8}
                    accessibilityRole='button'
                    accessibilityLabel={l10n.t(
                      isRouteFull ? 'group.map.routeFull' : 'group.route.add'
                    )}
                    // 상한이면 막힌 이유를 함께 읽는다 — 눌리지 않는 버튼만 두면 왜 안 되는지 모른다(HIG).
                    {...(isRouteFull
                      ? {
                          accessibilityHint: getGroupValidationMessage(
                            GroupValidationError.RouteLimitExceeded
                          ),
                        }
                      : {})}
                    accessibilityState={{
                      disabled: isRouteFull || isAddingRoute,
                      busy: isUploadingRoute,
                    }}
                  >
                    {isUploadingRoute ? (
                      <ActivityIndicator size='small' color={Acg.ink} />
                    ) : (
                      <Ionicons name='add' size={20} color={Acg.ink} />
                    )}
                    <PretendardText weight='semibold' style={styles.addLabel}>
                      {l10n.t(getAddRouteLabelKey())}
                    </PretendardText>
                  </TouchableOpacity>
                ) : null}
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
              </View>
            </>
          )}
        </View>
      </View>

      {/* 코스 패널(머리 줄 + 고도 그래프)은 지도 **아래**다 — 지도를 가리면 훑는 동안 위치를 못 본다(GRP-8). */}
      {showRoutePanel && selectedRoute ? (
        <GroupMapRoutePanelView
          route={selectedRoute}
          onOpenList={onOpenRouteList}
          onScrub={handleScrub}
          pointMarker={pointRouteMark?.chartMarker ?? null}
          bottomInset={insets.bottom}
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
    overflow: 'hidden',
    // 지도가 붙기 전 자리는 지면색.
    backgroundColor: Acg.paper,
  },
  mapArea: {
    flex: 1,
  },
  // 박지 마커 — 캡션 위, 핀 아래. 핀 끝(아래 가운데)이 좌표다.
  spotMarker: {
    alignItems: 'center',
    gap: SPOT_CAPTION_GAP,
  },
  // 지도 위 가독성 — 흰 반투명 바탕(포인트 캡션과 같은 면).
  spotCaption: {
    ...AcgType.meta,
    color: Acg.ink,
    maxWidth: SPOT_CAPTION_MAX_WIDTH,
    paddingHorizontal: SPOT_CAPTION_PADDING_H,
    paddingVertical: SPOT_CAPTION_PADDING_V,
    borderRadius: Radius.pill,
    backgroundColor: Acg.heroCardFill,
    overflow: 'hidden',
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
    gap: Spacing.item,
    alignItems: 'flex-start',
  },
  // 칩 줄은 폭을 다 쓴다(가로 스크롤).
  chips: {
    alignSelf: 'stretch',
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
  addActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
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
  // `코스 추가` — 흰 보조 알약. 라임 주 액션과 같은 높이·모양이고 면 색만 갈린다(GRP-10).
  secondaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.card,
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
