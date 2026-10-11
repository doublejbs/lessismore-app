import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Camera,
  CameraChangeReason,
  NaverMapView,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import PointAimMarkerView from '@/components/point/PointAimMarkerView';
import PointCalloutView from '@/components/point/PointCalloutView';
import PointFilterChipsView from '@/components/point/PointFilterChipsView';
import PointMarkersView, {
  PointMapViewport,
} from '@/components/point/PointMarkersView';
import usePointRouteMark from '@/components/point/usePointRouteMark';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import RoutePathOverlayView from '@/components/route/RoutePathOverlayView';
import RouteScrubMarkerView from '@/components/route/RouteScrubMarkerView';
import RouteEndpointMarkersView from '@/components/route/RouteEndpointMarkersView';
import RouteEndpointCalloutView from '@/components/route/RouteEndpointCalloutView';
import { useRouteEndpointState } from '@/components/route/useRouteEndpointState';
import MapMyLocationButtonView from '@/components/map/MapMyLocationButtonView';
import MapMyLocationMarkerView from '@/components/map/MapMyLocationMarkerView';
import { useMyLocationHeadingMode } from '@/components/map/useMyLocationHeadingMode';
import {
  Acg,
  AcgLayout,
  AcgShadow,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import { MapCoordinate } from '@/hooks/useMapCurrentLocation';
import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import BagPointAddVia from '@/model/bag-point/BagPointAddVia';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRouteList from '@/model/bag-route/BagRouteList';
import { deltaToZoom } from '@/model/map/MapZoom';
import MapPoint from '@/model/point/MapPoint';
import { getBagPointMeta } from '@/model/bag-point/BagPointLabels';
import { getRouteFitRegion, mergeRouteBounds } from '@/model/route/RouteCamera';
import { RouteBounds, RouteCoordinate } from '@/model/route/RouteData';
import { RouteElevationSample } from '@/model/route/RouteElevation';

export interface BagPointCoordinate {
  latitude: number;
  longitude: number;
}

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
  // 포인트 추가 조준 모드(BD-14). 화면이 들고 있다 — 이 동안 아래 목록·그래프도 걷힌다.
  isAiming: boolean;
  onStartAiming: () => void;
  onCancelAiming: () => void;
  // 좌표가 정해지면 입력 시트를 연다(롱프레스 · 조준 확정).
  onRequestCreate: (
    coordinate: BagPointCoordinate,
    via: BagPointAddVia
  ) => void;
  onRequestEdit: (point: BagPoint) => void;
  onRequestDelete: (point: BagPoint) => void;
  // 상단 오버레이(유형 칩)를 헤더 아래로 내린다 — iOS 투명 헤더는 세이프에어리어 + 헤더, Android는 여백만.
  topInset: number;
}

/** 남한 전역이 보이는 폴백 카메라(코스·포인트가 하나도 없을 때). */
const KOREA_CAMERA: Camera = {
  latitude: 36.2,
  longitude: 127.9,
  zoom: deltaToZoom(4.8),
};

/** `내 위치`로 옮길 때의 표시 범위(도) — 그룹 지도의 현재 위치 버튼과 같은 값. */
const CURRENT_LOCATION_DELTA = 0.05;

/** 목록에서 포인트를 골랐을 때 당겨 보는 범위(도) — 그룹 지도의 포인트 초점과 같은 값. */
const POINT_FOCUS_DELTA = 0.02;

/**
 * 지도 컨트롤이 지도 아래 가장자리에서 떨어지는 거리. 이 화면은 그래프·목록·`코스 추가`가 지도
 * **밖** 아래에 있어 그룹 지도의 +120 대신 이 여백만 둔다.
 */
const CONTROL_BOTTOM_OFFSET = 16;

/**
 * 배낭 코스 지도 (BD-11 · BD-14) — 네이티브 전용 본문.
 *
 * 폴리라인·훑기 마커·고도 그래프는 그룹 지도(GRP-8·GRP-10)와 **같은 컴포넌트**를 쓰고, 지도
 * 포인트(BD-14)도 그룹의 마커·카드·조준 마커·유형 칩·고도 그래프 표시(`components/point/`)를
 * 그대로 쓴다. 박지 마커는 없다.
 *
 * **추가 경로 둘**(GRP-9와 같다): 지도 **길게 누르기** → 입력 시트, 우하단 `포인트 추가` 보조
 * 알약 → **조준 모드**. 롱프레스 처리는 그룹 지도와 같다 — 지도 라이브러리에 롱프레스 콜백이 없어
 * `Gesture.LongPress()`의 화면 좌표를 `screenToCoordinate`로 바꾼다. `포인트 추가`는 라임이 아니다
 * — 이 화면의 주 액션(라임)은 목록 아래 `코스 추가` 하나다(HM-8). 조준 모드에서는 목록이 걷히므로
 * 그때의 주 액션 `이 위치에 추가`가 라임이 된다.
 *
 * 그래프는 지도 **아래**다. 지도 위에 얹으면 훑는 동안 손가락과 그래프가 지도를 가려
 * "이 오르막이 어디인가"를 볼 수 없다 — 이 기능이 존재하는 이유가 사라진다(GRP-8).
 */
const BagRouteCanvasView: FC<Props> = ({
  bagRouteList,
  bagPointList,
  isAiming,
  onStartAiming,
  onCancelAiming,
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
  // 처리한 마지막 코스 선택 요청(`BagRouteList.focusEntry`)의 `seq`.
  const handledFocusSeqRef = useRef(0);
  // 처리한 마지막 포인트 초점 요청(`BagPointList.focusEntry`)의 `seq`.
  const handledPointSeqRef = useRef(0);
  // 지금 손가락이 고도 그래프 위에 있는지. 이때는 선택이 바뀌어도 카메라를 옮기지 않는다(GRP-8).
  const scrubbingRef = useRef(false);
  const mountedRef = useRef(true);
  const cameraRef = useRef<BagPointCoordinate>({
    latitude: KOREA_CAMERA.latitude,
    longitude: KOREA_CAMERA.longitude,
  });
  const zoomRef = useRef(KOREA_CAMERA.zoom ?? 0);
  const handledLongPressRef = useRef(0);
  const [viewport, setViewport] = useState<PointMapViewport | null>(null);
  const [longPressAt, setLongPressAt] = useState<{
    x: number;
    y: number;
    seq: number;
  } | null>(null);
  /**
   * 고도 그래프에서 훑고 있는 지점. 손을 떼면 `null`이 되어 마커가 사라진다.
   * **어느 코스의 지점인지 함께 들고 있는다** — 코스를 바꾸면 그래프는 새로 마운트되지만
   * 손을 뗐다고 알려 줄 길이 없어, 태그가 없으면 지난 코스의 마커가 지도에 남는다.
   */
  const [scrub, setScrub] = useState<{
    key: string;
    sample: RouteElevationSample;
  } | null>(null);
  const entries = bagRouteList.getEntries();
  const routes = entries.map(entry => entry.route);
  const selected = bagRouteList.getSelectedEntry();
  const selectedKey = bagRouteList.getSelectedKey();
  const selectedRoute = selected?.route ?? null;
  const focusRequest = bagRouteList.getFocusRequest();
  const routesInitialized = bagRouteList.isInitialized();
  const pointsInitialized = bagPointList.isInitialized();
  const focusedEntry = bagPointList.getFocusedEntry();
  const focusedPoint = focusedEntry?.point ?? null;
  const pointFocusRequest = bagPointList.getFocusRequest();
  const pointCount = bagPointList.getEntries().length;
  // 고른 포인트가 선택된 코스의 어디쯤인지 — 그래프 표시와 카드 메타 줄(GRP-8 500m 규칙).
  const pointRouteMark = usePointRouteMark(selectedRoute, focusedPoint);

  /**
   * 내 위치 (BD-11) — 그룹 지도·박지 지도와 같은 공용 훅이다. 진입에서 권한을 묻지 않고,
   * 권한이 없으면 점을 그리지 않는다. 버튼은 항상 보이고 누르면 권한을 요청한다 — 코스를 따라
   * 걸으며 "지금 어디쯤인가"를 보려고 들어온 화면이라 첫 요청 자리가 필요하다.
   * 버튼을 다시 누르면 방향 모드(지도 회전 + 방향 부채꼴), 한 번 더 누르면 끈다(그룹 지도와 같다).
   */
  const moveToCoordinate = useCallback((coordinate: MapCoordinate) => {
    if (!mountedRef.current || !mapReadyRef.current) {
      return;
    }

    // 사용자가 직접 옮겼으므로 늦게 온 데이터가 최초 맞춤으로 카메라를 되돌리지 않게 한다.
    didFitRef.current = true;
    mapRef.current?.animateRegionTo({
      latitude: coordinate.latitude - CURRENT_LOCATION_DELTA / 2,
      longitude: coordinate.longitude - CURRENT_LOCATION_DELTA / 2,
      latitudeDelta: CURRENT_LOCATION_DELTA,
      longitudeDelta: CURRENT_LOCATION_DELTA,
      duration: 500,
    });
  }, []);
  const {
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
    logTag: 'BagRoute',
    fallbackZoom: deltaToZoom(CURRENT_LOCATION_DELTA),
  });

  /**
   * 출발·도착 마커 탭 → 위치 정보 카드(GRP-8, 그룹 지도와 같다). 카메라는 그 점으로 옮기되
   * 줌은 그대로 둔다 — `animateCameraTo`에 줌을 주지 않으면 지금 줌을 유지한다.
   */
  const handleMoveToEndpoint = useCallback(
    (coordinate: RouteCoordinate, pivot: { x: number; y: number }) => {
      if (!mountedRef.current || !mapReadyRef.current) {
        return;
      }

      didFitRef.current = true;
      // 방향 모드의 따라가기를 먼저 푼다 — 다음 나침반 값이 카메라를 내 위치로 되돌리지 않게.
      releaseFollow();
      mapRef.current?.animateCameraTo({
        latitude: coordinate.lat,
        longitude: coordinate.lng,
        pivot,
        duration: 500,
      });
    },
    [releaseFollow]
  );
  // 끝점 카드와 포인트 카드는 동시에 뜨지 않는다(GRP-8) — 끝점을 고르면 포인트 초점을 푼다.
  const handleSelectEndpoint = useCallback(() => {
    bagPointList.clearFocus();
  }, [bagPointList]);
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
  const hasFocusedPoint = !!focusedEntry;

  // 포인트에 초점이 가면(마커 탭·목록·방금 등록) 끝점 카드를 닫는다.
  useEffect(() => {
    if (hasFocusedPoint) {
      handleCloseEndpoint();
    }
  }, [handleCloseEndpoint, hasFocusedPoint]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
    };
  }, []);

  const moveCamera = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      if (!mountedRef.current || !mapReadyRef.current) {
        return;
      }

      releaseFollow();
      mapRef.current?.animateCameraTo({
        latitude,
        longitude,
        zoom,
        duration: 500,
      });
    },
    [releaseFollow]
  );

  const fitBounds = useCallback(
    (bounds: RouteBounds) => {
      // 코스로 옮기면 방향 모드의 따라가기를 푼다(손으로 옮긴 것과 같다 — BD-11).
      releaseFollow();
      mapRef.current?.animateRegionTo({
        ...getRouteFitRegion(bounds),
        duration: 500,
      });
    },
    [releaseFollow]
  );

  /**
   * 최초 카메라 — 목록의 코스와 포인트를 모두 담는 상자에 맞춘다(BD-11 · BD-14).
   * 코스와 포인트는 따로 읽히므로 **둘 다 읽힌 뒤** 한 번 맞춘다 — 먼저 온 쪽에 맞춰 버리면 늦게 온
   * 쪽이 화면 밖에 남는다. 아무것도 없으면 그대로 둔다.
   */
  const fitInitialCamera = useCallback(() => {
    if (
      didFitRef.current ||
      !mapReadyRef.current ||
      !bagRouteList.isInitialized() ||
      !bagPointList.isInitialized()
    ) {
      return;
    }

    const bounds = mergeRouteBounds([
      bagRouteList.getContentBounds(),
      bagPointList.getContentBounds(),
    ]);

    if (!bounds) {
      return;
    }

    didFitRef.current = true;
    fitBounds(bounds);
  }, [bagPointList, bagRouteList, fitBounds]);

  /**
   * 목록에서 고른 코스로 카메라를 옮긴다(BD-11). 최초 맞춤과 달리 **고를 때마다** 옮긴다 —
   * 같은 코스를 다시 골라도(`seq`가 올라간다). 지도가 아직 준비되지 않았으면 요청을 남겨 두고
   * 준비된 뒤 한 번 맞춘다. 요청을 처리했으면 `true`다.
   */
  const fitFocusedRoute = useCallback(() => {
    const request = bagRouteList.getFocusRequest();

    if (
      !request ||
      request.seq === handledFocusSeqRef.current ||
      !mapReadyRef.current
    ) {
      return false;
    }

    handledFocusSeqRef.current = request.seq;

    // 훑는 중에 바뀐 선택은 카메라를 옮기지 않는다 — 손가락 아래 그래프와 지도가 어긋난다(GRP-8).
    // 선택이 바뀌면 그래프가 새로 마운트되어 이 훑기는 끝난다(남은 마커는 키가 달라 저절로 걷힌다).
    if (scrubbingRef.current) {
      scrubbingRef.current = false;

      return false;
    }

    const entry = bagRouteList
      .getEntries()
      .find(item => item.key === request.key);
    const bounds = entry?.route.getBounds() ?? null;

    if (!bounds) {
      return false;
    }

    // 명시적 선택이 카메라를 정했으므로 늦게 온 데이터가 최초 맞춤으로 되돌리지 않게 한다.
    didFitRef.current = true;
    fitBounds(bounds);

    return true;
  }, [bagRouteList, fitBounds]);

  /**
   * 고른 포인트로 카메라를 옮긴다(BD-14) — 마커 탭은 지금 줌 그대로, 목록 행 탭은 그 부근까지 당긴다.
   * 지도가 준비되기 전에 들어온 요청은 남겨 두고 준비된 뒤 처리한다.
   */
  const fitFocusedPoint = useCallback(() => {
    const request = bagPointList.getFocusRequest();

    if (
      !request ||
      request.seq === handledPointSeqRef.current ||
      !mapReadyRef.current
    ) {
      return false;
    }

    handledPointSeqRef.current = request.seq;

    const entry = bagPointList
      .getEntries()
      .find(item => item.key === request.key);

    if (!entry) {
      return false;
    }

    didFitRef.current = true;
    moveCamera(
      entry.point.getLatitude(),
      entry.point.getLongitude(),
      request.zoomIn ? deltaToZoom(POINT_FOCUS_DELTA) : zoomRef.current
    );

    return true;
  }, [bagPointList, moveCamera]);

  // 카메라 결정 순서: 초점 포인트 → 고른 코스 → 최초 맞춤(전체 상자). 앞의 것이 정했으면 뒤는 건너뛴다.
  const syncCamera = useCallback(() => {
    if (fitFocusedPoint()) {
      return;
    }

    if (fitFocusedRoute()) {
      return;
    }

    fitInitialCamera();
  }, [fitFocusedPoint, fitFocusedRoute, fitInitialCamera]);

  // 데이터가 늦게 도착해도 한 번은 맞춘다. 고를 때마다(같은 것을 다시 골라도) 그쪽으로 옮긴다.
  useEffect(() => {
    syncCamera();
  }, [
    syncCamera,
    entries.length,
    pointCount,
    routesInitialized,
    pointsInitialized,
    focusRequest,
    pointFocusRequest,
  ]);

  const handleMapInitialized = useCallback(() => {
    mapReadyRef.current = true;

    setViewport(previous =>
      previous
        ? previous
        : {
            latitude: KOREA_CAMERA.latitude,
            longitude: KOREA_CAMERA.longitude,
            zoom: KOREA_CAMERA.zoom ?? 0,
          }
    );
    syncCamera();
  }, [syncCamera]);

  const handleCameraChanged = useCallback(
    (camera: Camera & { reason: CameraChangeReason }) => {
      if (!mountedRef.current) {
        return;
      }

      // 손으로 움직이면 방향 모드의 따라가기를 푼다(BD-11).
      handleMyLocationCameraChanged(camera);

      const zoom = camera.zoom ?? 0;

      zoomRef.current = zoom;
      cameraRef.current = {
        latitude: camera.latitude,
        longitude: camera.longitude,
      };

      // 중심 0.05°·줌 0.25 단위 양자화 — 동일 값이면 마커 레이어가 리렌더되지 않는다(그룹 지도와 같다).
      const quantized = {
        latitude: Math.round(camera.latitude / 0.05) * 0.05,
        longitude: Math.round(camera.longitude / 0.05) * 0.05,
        zoom: Math.round(zoom / 0.25) * 0.25,
      };

      setViewport(previous =>
        previous &&
        previous.latitude === quantized.latitude &&
        previous.longitude === quantized.longitude &&
        previous.zoom === quantized.zoom
          ? previous
          : quantized
      );
    },
    [handleMyLocationCameraChanged]
  );

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

        onRequestCreate(
          {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          },
          BagPointAddVia.LongPress
        );
      } catch (error) {
        console.warn('[BagRoute] 롱프레스 좌표 변환 실패', error); // l10n-ignore: 개발자 로그
      }
    },
    [onRequestCreate]
  );

  /**
   * 롱프레스는 좌표만 상태로 올리고, 지도 ref를 읽는 변환은 아래 이펙트가 맡는다(그룹 지도와 같은
   * 분리). `seq`가 누를 때마다 올라가 같은 지점을 다시 눌러도 이펙트가 다시 돈다.
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

  // 조준 모드에 들어가면 카드를 걷는다 — 카드가 조준 마커를 가린다(GRP-9).
  const handleStartAiming = useCallback(() => {
    bagPointList.clearFocus();
    handleCloseEndpoint();
    onStartAiming();
  }, [bagPointList, handleCloseEndpoint, onStartAiming]);

  // 조준 마커는 화면 정중앙에 고정돼 있고, 그 자리가 곧 카메라 중심이다.
  const handleConfirmAiming = useCallback(() => {
    onCancelAiming();
    onRequestCreate({ ...cameraRef.current }, BagPointAddVia.Aim);
  }, [onCancelAiming, onRequestCreate]);

  /**
   * 그래프 훑기 (GRP-8과 같은 규칙). **카메라는 건드리지 않는다** — 손가락 아래에서 지도가
   * 움직이면 그래프의 x와 지도 위 지점이 매 프레임 어긋나 위치를 읽을 수 없다. 마커만 옮긴다.
   */
  const handleScrub = useCallback(
    (sample: RouteElevationSample | null) => {
      const key = bagRouteList.getSelectedKey() ?? '';

      scrubbingRef.current = !!sample;
      setScrub(previous => {
        if (!sample) {
          return null;
        }

        // 같은 표본이면 이전 객체를 그대로 돌려준다 — 한 번 훑는 동안 들어오는 수십 번의
        // 이벤트가 그대로 렌더가 되면 지도 마커가 프레임마다 네이티브로 다시 동기화된다.
        if (previous?.sample === sample && previous.key === key) {
          return previous;
        }

        return { key, sample };
      });
    },
    [bagRouteList]
  );

  const handleTapPoint = useCallback(
    (point: MapPoint) => {
      const entry = bagPointList.getEntryByPoint(point);

      if (!entry) {
        return;
      }

      bagPointList.focusEntry(entry.key, false);
    },
    [bagPointList]
  );

  const handleTapMap = useCallback(() => {
    bagPointList.clearFocus();
    handleCloseEndpoint();
  }, [bagPointList, handleCloseEndpoint]);

  const profile = isAiming
    ? null
    : (selected?.route.getElevationProfile() ?? null);
  // 그래프가 걷힌 뒤(코스 교체·조준 모드)에는 남은 표본을 그리지 않는다.
  const scrubSample =
    profile && scrub?.key === (selectedKey ?? '') ? scrub.sample : null;
  const isFull = bagPointList.isFull();
  const submitting = bagPointList.isSubmitting();
  // 코스도 포인트도 없으면 거를 것이 없다 — 칩 행을 숨긴다(BD-14).
  const showFilterChips =
    !isAiming && (entries.length > 0 || bagPointList.hasAny());
  // 조준 모드에서는 아래 목록이 걷혀 이 지도가 화면 맨 아래까지 온다 — 세이프에어리어를 직접 비운다.
  const bottomInset = isAiming ? insets.bottom : 0;
  const focusedBagPoint =
    focusedEntry?.owned && focusedEntry.point instanceof BagPoint
      ? focusedEntry.point
      : null;

  return (
    <View style={styles.root}>
      {/* 지도와 그 위 오버레이가 사는 칸. 고도 그래프는 이 칸 **밖**(아래)에 붙는다(GRP-8) —
        조준 마커가 이 칸의 정중앙 = 지도 카메라 중심에 서야 한다. */}
      <View style={styles.mapSection}>
        <GestureDetector gesture={longPressGesture}>
          <View style={styles.mapArea} onLayout={handleMapLayout}>
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
              // 방향 모드(BD-11)에서만 값이 있는 제어 카메라 — 내 위치를 따라가며 지도를 돌린다.
              {...(followCamera ? { camera: followCamera } : {})}
              animationDuration={cameraAnimationDuration}
            >
              <RoutePathOverlayView
                routes={routes}
                selectedRouteId={selectedRoute?.getId() ?? null}
              />
              {/* 선택한 코스의 시작·끝(GRP-8과 같은 규칙) — 옅게 그린 코스엔 달지 않는다. */}
              <RouteEndpointMarkersView
                route={selectedRoute}
                onTapEndpoint={handleTapEndpoint}
              />
              {/* 지도 포인트(BD-14) — 내 포인트와 연결 그룹 포인트를 같은 마커로 그린다. */}
              <PointMarkersView
                points={bagPointList.getVisiblePoints()}
                viewport={viewport}
                selectedPointId={focusedPoint?.getId() ?? null}
                onTapPoint={handleTapPoint}
              />
              {currentLocation ? (
                <MapMyLocationMarkerView
                  latitude={currentLocation.latitude}
                  longitude={currentLocation.longitude}
                  heading={heading}
                />
              ) : null}
              {/* 고도 그래프를 훑는 동안만 뜨는 위치 마커. */}
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
        {isAiming ? <PointAimMarkerView /> : null}

        {/* 상단 오버레이 — 유형 필터 칩(BD-14). 조준 모드에서는 걷는다. */}
        {showFilterChips ? (
          <View
            style={[styles.topOverlay, { top: topInset }]}
            pointerEvents='box-none'
            onLayout={handleTopOverlayLayout}
          >
            <PointFilterChipsView
              selectedType={bagPointList.getSelectedType()}
              onSelectType={type => bagPointList.selectType(type)}
              onMap
            />
          </View>
        ) : null}

        {/* 지도 아래쪽 오버레이 — 내 위치·포인트 추가 밑에 카드가 붙는다(버튼을 가리지 않게 한 칸에 쌓는다). */}
        <View
          style={[
            styles.bottomOverlay,
            { bottom: CONTROL_BOTTOM_OFFSET + bottomInset },
          ]}
          pointerEvents='box-none'
          onLayout={handleBottomOverlayLayout}
        >
          {isAiming ? (
            <View style={styles.aimSection} pointerEvents='box-none'>
              <View style={styles.aimHint}>
                <PretendardText style={styles.aimHintLabel} numberOfLines={2}>
                  {l10n.t('group.map.aimHint')}
                </PretendardText>
              </View>
              <View style={styles.aimActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancelAiming}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('common.cancel')}
                >
                  <PretendardText style={styles.controlLabel}>
                    {l10n.t('common.cancel')}
                  </PretendardText>
                </TouchableOpacity>
                {/* 조준 모드의 주 액션 하나 — 목록(`코스 추가`)이 걷힌 동안만 라임이다(HM-8). */}
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmAiming}
                  disabled={submitting}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('group.map.aimConfirm')}
                >
                  <Ionicons name='checkmark' size={20} color={Acg.ink} />
                  <PretendardText weight='semibold' style={styles.controlLabel}>
                    {l10n.t('group.map.aimConfirm')}
                  </PretendardText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* 우측 지도 컨트롤 — 내 위치(BD-11) + `포인트 추가` 보조 알약(BD-14). */}
              <View style={styles.controlStack} pointerEvents='box-none'>
                <MapMyLocationButtonView
                  mode={myLocationMode}
                  locateLabel={l10n.t('route.myLocation')}
                  onPress={() => void handlePressMyLocation()}
                />
                <TouchableOpacity
                  style={[styles.addPointButton, isFull && styles.disabled]}
                  onPress={handleStartAiming}
                  disabled={isFull || submitting}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t(
                    isFull ? 'group.map.pointFull' : 'group.map.addPoint'
                  )}
                  // 상한이면 막힌 이유를 함께 읽는다 — 눌리지 않는 버튼만 두면 왜 안 되는지 모른다(HIG).
                  accessibilityHint={
                    isFull
                      ? bagPointList.getLimitMessage()
                      : l10n.t('group.map.addPointHint')
                  }
                  accessibilityState={{ disabled: isFull || submitting }}
                >
                  <Ionicons name='add' size={20} color={Acg.ink} />
                  <PretendardText weight='semibold' style={styles.controlLabel}>
                    {l10n.t(
                      isFull ? 'group.map.pointFull' : 'group.map.addPoint'
                    )}
                  </PretendardText>
                </TouchableOpacity>
              </View>
              {/* 포인트 카드(BD-14) — 끝점 카드와 같은 자리, 둘 중 하나만 뜬다. */}
              {focusedEntry ? (
                <View style={styles.callout}>
                  <PointCalloutView
                    point={focusedEntry.point}
                    meta={getBagPointMeta(focusedEntry)}
                    canEdit={!!focusedBagPoint}
                    routeMeta={pointRouteMark?.calloutMeta ?? null}
                    disabled={submitting}
                    onEdit={() => {
                      if (focusedBagPoint) {
                        onRequestEdit(focusedBagPoint);
                      }
                    }}
                    onDelete={() => {
                      if (focusedBagPoint) {
                        onRequestDelete(focusedBagPoint);
                      }
                    }}
                    onClose={handleTapMap}
                  />
                </View>
              ) : null}
              {/* 코스 출발·도착 위치 정보 카드(GRP-8). */}
              {endpoint && selectedRoute && !focusedEntry ? (
                <View style={styles.callout}>
                  <RouteEndpointCalloutView
                    endpointInfo={endpointInfo}
                    endpoint={endpoint}
                    routeName={selectedRoute.getName()}
                    onClose={handleCloseEndpoint}
                  />
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* 고도가 없는 코스는 그래프 자리를 아예 비운다 — 빈 틀은 "데이터를 못 불러왔다"로 읽힌다. */}
      {profile ? (
        <RouteElevationChartView
          // 코스를 바꾸면 그래프를 새로 마운트해 이전 코스의 커서가 남지 않게 한다.
          // 방향을 뒤집어도 새로 마운트한다 — 단면이 바뀌므로 커서가 옛 단면 자리에 남지 않게.
          key={`${selectedKey ?? ''}:${selectedRoute?.isReversed() ? 'r' : 'f'}`}
          profile={profile}
          // 축 거리는 목록 행과 같은 원본 거리로 읽힌다(BD-11).
          {...(selected
            ? { displayDistance: selected.route.getDistance() }
            : {})}
          onScrub={handleScrub}
          // 고른 포인트의 코스 위 위치(GRP-8) — 500m 밖이면 표시하지 않는다.
          pointMarker={pointRouteMark?.chartMarker ?? null}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  // 지도는 남는 세로를 다 쓴다 — 목록·그래프는 아래에서 제 높이만 가져간다.
  mapSection: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: 12,
  },
  // 지도 위 원형 컨트롤 세로 스택(우측 16 — 그룹 지도와 같은 자리 규칙).
  controlStack: {
    alignSelf: 'flex-end',
    marginRight: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  callout: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // `포인트 추가` — 흰 보조 알약(그룹 지도의 `코스 추가`와 같은 모양). 라임은 `코스 추가` 하나다(HM-8).
  addPointButton: {
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
  disabled: {
    opacity: 0.5,
  },
  controlLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  aimSection: {
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 12,
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
  // 취소는 액션이 아니라 되돌리기다 — 면을 채우지 않고 주 액션과 무게를 갈라 둔다(그룹 지도와 같다).
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
  confirmButton: {
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
});

export default observer(BagRouteCanvasView);
