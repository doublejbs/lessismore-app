import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import AppMapView, {
  AppMapAnimateOptions,
  AppMapCameraChange,
  AppMapCoordinate,
  AppMapInitialCamera,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import {
  CAMERA_MOVE_DURATION,
  MAX_ZOOM,
  NO_CAMERA_PADDING,
  OVERLAY_GAP,
} from '@/components/map/MapConstants';
import MapEndpointMarkersView from '@/components/map/MapEndpointMarkersView';
import MapMyLocationButtonView from '@/components/map/MapMyLocationButtonView';
import MapMyLocationMarkerView from '@/components/map/MapMyLocationMarkerView';
import MapNoticeLineView from '@/components/map/MapNoticeLineView';
import MapPointMarkersView from '@/components/map/MapPointMarkersView';
import MapRoutePathLayersView from '@/components/map/MapRoutePathLayersView';
import MapScrubMarkerView from '@/components/map/MapScrubMarkerView';
import MapSpotPinMarkerView from '@/components/map/MapSpotPinMarkerView';
import { useMyLocationHeadingMode } from '@/components/map/useMyLocationHeadingMode';
import PointAimMarkerView from '@/components/point/PointAimMarkerView';
import PointCalloutView from '@/components/point/PointCalloutView';
import PointFilterChipsView from '@/components/point/PointFilterChipsView';
import usePointRouteMark from '@/components/point/usePointRouteMark';
import RouteBottomSheetView, {
  RouteBottomSheetHandle,
} from '@/components/route/RouteBottomSheetView';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import RouteEndpointCalloutView from '@/components/route/RouteEndpointCalloutView';
import RouteSegmentChipsView from '@/components/route/RouteSegmentChipsView';
import {
  getRouteSheetDetentHeight,
  getRouteSheetDetents,
  SHEET_HEADER_PADDING_BOTTOM,
} from '@/components/route/RouteSheetLayout';
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
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupRoute from '@/model/group/GroupRoute';
import GroupValidationError from '@/model/group/GroupValidationError';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import GroupMap from '@/model/group-map/GroupMap';
import { getGroupPointAuthorLabel } from '@/model/group-point/GroupPointLabels';
import {
  KOREA_CAMERA,
  lngLatBoundsToRouteBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
import { deltaToZoom } from '@/model/map/MapZoom';
import MapPoint from '@/model/point/MapPoint';
import {
  getPointDateText,
  getPointTypeColor,
  getPointTypeLabel,
} from '@/model/point/PointLabels';
import { ROUTE_REPLAY_MIN_COORDINATES } from '@/model/route-replay/RouteReplayCoordinates';
import RouteReplaySource from '@/model/route-replay/RouteReplaySource';
import { getRouteFitRegion } from '@/model/route/RouteCamera';
import { RouteBounds, RouteCoordinate } from '@/model/route/RouteData';
import { RouteElevationSample } from '@/model/route/RouteElevation';
import RouteListSegment from '@/model/route/RouteListSegment';
import RouteSheetDetent from '@/model/route/RouteSheetDetent';
import GroupMapSheetListView from './GroupMapSheetListView';

interface Props {
  groupMap: GroupMap;
  onRequestCreate: (coordinate: {
    latitude: number;
    longitude: number;
  }) => void;
  onRequestEdit: (point: GroupPoint) => void;
  onRequestDelete: (point: GroupPoint) => void;
  // 시트 코스 행 탭 → 그 코스를 고른다(카메라 이동 요청, GRP-10). 흐름은 `useGroupMapRouteState`가 잇는다.
  onSelectRoute: (route: GroupRoute) => void;
  // 시트 코스 행 `⋯` → 삭제(올린 사람·방장만). 확인 알럿은 화면이 띄운다 — 시트가 모달이 아니라 곧바로 뜬다.
  onRequestDeleteRoute: (route: GroupRoute) => void;
  // 시트 목록 아래 `코스 추가` — GPX 선택 → 업로드(GRP-8). 흐름은 `useGroupMapRouteState`가 잇는다.
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

/** 박지 위치로 처음 열 때의 줌(약 0.05° 범위). */
const CAMP_SPOT_ZOOM = deltaToZoom(0.05);
/** 내용이 없어 마지막 위치로 처음 열 때의 줌(약 0.2° 범위). */
const LAST_LOCATION_ZOOM = deltaToZoom(0.2);
/** 포인트에 초점을 줄 때의 줌(약 0.02° 범위). */
const POINT_FOCUS_ZOOM = deltaToZoom(0.02);
// 지도 아래쪽 오버레이(컨트롤 스택·카드)가 시트 위 끝에서 떨어지는 거리 — 배낭 코스 화면과 같다(BD-11).
const CONTROL_BOTTOM_OFFSET = 16;
// 지도 가장자리와 지도 위 컨트롤 사이 여백(우측).
const MAP_CONTROL_INSET = 16;
// 컨트롤 스택과 카드 사이 간격.
const CARD_GAP = 12;
// 마커를 누른 직후 지도 탭이 같이 오면(플랫폼에 따라 전파된다) 포커스를 풀지 않는다.
const MARKER_PRESS_GUARD_MS = 400;
/**
 * 상자 맞춤의 위 여백 = 상단 오버레이 아래 끝 + 이 값(pt). 칩 줄이 지도 위를 덮으므로 그만큼 비우지 않으면
 * 코스 북쪽 끝이 칩 밑에 숨는다.
 */
const FIT_TOP_GAP = 16;
/** 칩 줄을 아직 재지 못했을 때(첫 카메라) 쓰는 높이(pt) — 칩의 최소 터치 높이. */
const CHIP_ROW_HEIGHT_ESTIMATE = 44;
// 시트 목록 섹션의 아래 여백 = 세이프에어리어 + 이 값(배낭 코스 화면과 같다).
const LIST_BOTTOM_EXTRA = 12;
// 그래프를 아직 재지 못했을 때의 높이(pt) — 위 여백 + 머리 줄 + 그래프 96 + 안내 줄 + 축 줄.
const GRAPH_HEIGHT_ESTIMATE = 184;
/** 3D 리플레이 진입(RR-1)은 네이티브에만 있다(APP-5). 이 본문은 네이티브 전용이지만 명시해 둔다. */
const CAN_OPEN_REPLAY = Platform.OS !== 'web';
// `3D` 보조 알약의 아이콘-라벨 간격·좌우 패딩(세로 패딩은 `Spacing.item`).
const REPLAY_PILL_ICON_GAP = 6;
const REPLAY_PILL_PADDING_H = 16;

/**
 * 시트 단은 **세션 동안** 기억한다(GRP-10) — 화면을 닫았다 다시 열어도 같은 단으로 뜬다. 배낭 코스 화면의
 * 단과는 따로다(화면이 다르다). 기기에 저장하지는 않는다(앱을 다시 켜면 기본 단).
 */
let sessionSheetDetent = RouteSheetDetent.Half;

// 상자 맞춤의 여백 — 위는 상단 오버레이(칩 줄), 아래는 바텀 시트가 덮는 높이를 비운다.
const toFitPadding = (top: number, bottom: number) => ({
  ...NO_CAMERA_PADDING,
  top,
  bottom,
});

const toFitCamera = (
  bounds: RouteBounds,
  topPadding: number,
  bottomPadding: number
): AppMapInitialCamera => ({
  bounds: lngLatBoundsToRouteBounds(
    regionToLngLatBounds(getRouteFitRegion(bounds))
  ),
  padding: toFitPadding(topPadding, bottomPadding),
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
 * **바텀 시트**(GRP-10, 2026-10-13): 지도가 화면을 다 쓰고, 그 위에 배낭 코스 화면(BD-11)과 같은 공용 시트
 * (`RouteBottomSheetView`)가 얹힌다 — 손잡이 + `코스 | 포인트` 칩 줄(끄는 영역) · 선택 코스의 고도 그래프 · 목록.
 * 세 단(접힘·기본·펼침)으로 끌어 올리고, 단은 세션 동안 기억한다(배낭 코스 화면과 따로). 그래프는 시트 맨 위라
 * 훑는 동안에도 손가락이 지도를 가리지 않는다(GRP-8). 방향 뒤집기·삭제는 시트 코스 행의 `⋯`에 있다.
 *
 * **지도 위 컨트롤**(GRP-10): 우하단 세로 스택 = `3D`(RR-1) → `내 위치` → `포인트 추가`(라임 — 화면당 하나, HM-8).
 * 스택·카드·출처 ⓘ는 시트 위 끝을 따라 올라온다(기본 단 높이까지). `코스 추가`(흰 보조 알약)는 시트 목록 아래다.
 */
const GroupMapCanvasView: FC<Props> = ({
  groupMap,
  onRequestCreate,
  onRequestEdit,
  onRequestDelete,
  onSelectRoute,
  onRequestDeleteRoute,
  onAddRoute,
  isAddingRoute,
  isUploadingRoute,
  topInset,
}) => {
  const l10n = app.getL10n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<RouteBottomSheetHandle>(null);
  // 시트가 얹히는 칸의 높이 — 재기 전에는 창 높이로 어림한다(첫 카메라가 시트 높이를 써야 한다).
  const [rootHeight, setRootHeight] = useState(windowHeight);
  const [graphHeight, setGraphHeight] = useState(GRAPH_HEIGHT_ESTIMATE);
  // 시트 머리의 `코스 | 포인트` 세그먼트(GRP-10).
  const [segment, setSegment] = useState(RouteListSegment.Routes);
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
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  // 상단 오버레이(안내 줄·유형 칩)의 아래 끝(pt) — 나침반·안드로이드 축척 막대를 그 아래로 내린다.
  const [topOverlayBottom, setTopOverlayBottom] = useState(topInset);
  // 위 값의 즉시 사본 — 카메라 맞춤 콜백이 참조를 고정한 채 읽는다.
  const topOverlayBottomRef = useRef<number | null>(null);
  // 지도 아래쪽 카드(포인트·끝점·조준 안내)의 높이 — 출처 표기(라이선스 의무, MAP-1)를 그 위로 올린다. 없으면 0.
  const [cardSlotHeight, setCardSlotHeight] = useState(0);
  // 포인트 추가 조준 모드 (GRP-9). 이 동안에는 필터 칩·정보 카드·`3D`·`포인트 추가`·시트를 걷어 조준을 가리지 않는다.
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
  // 시트 단 높이(GRP-10 · BD-11) — 고도가 없는 코스는 그래프 자리가 없다.
  const hasSheetGraph = !!selectedRoute?.getElevationProfile();
  const hasSheetFooter = routeList.canAdd();
  const listBottomInset = insets.bottom + LIST_BOTTOM_EXTRA;
  const detents = useMemo(
    () =>
      getRouteSheetDetents({
        rootHeight,
        topInset,
        listBottomInset,
        graphHeight: hasSheetGraph ? graphHeight : 0,
        hasFooter: hasSheetFooter,
      }),
    [
      graphHeight,
      hasSheetFooter,
      hasSheetGraph,
      listBottomInset,
      rootHeight,
      topInset,
    ]
  );
  const [initialSheetDetent] = useState(() => sessionSheetDetent);
  const initialSheetHeight = getRouteSheetDetentHeight(
    detents,
    initialSheetDetent
  );
  // 시트 높이 — 공유 값은 매 프레임(컨트롤·그래프), 상태는 스로틀된 알림(출처 표기 — 네이티브 prop).
  const sheetHeightValue = useSharedValue(initialSheetHeight);
  const [sheetHeight, setSheetHeight] = useState(initialSheetHeight);
  const sheetHeightRef = useRef(initialSheetHeight);
  const detentsRef = useRef(detents);
  const isAimingRef = useRef(isAiming);

  useEffect(() => {
    detentsRef.current = detents;
    isAimingRef.current = isAiming;
  }, [detents, isAiming]);

  /**
   * 상자 맞춤의 위 여백 — 상단 오버레이(안내 줄·칩 줄) 아래 끝 + 16. 첫 카메라 때는 칩 줄을 아직 재지 못했을 수
   * 있으므로 적어도 칩 한 줄은 어림해 둔다.
   */
  const getFitTopPadding = useCallback(
    () =>
      Math.max(
        topOverlayBottomRef.current ?? 0,
        topInset + CHIP_ROW_HEIGHT_ESTIMATE
      ) + FIT_TOP_GAP,
    [topInset]
  );

  // 카메라 맞춤의 아래 여백 — 시트가 덮는 높이. 펼침이어도 기본 단 높이까지만 비운다(지도 칸이 남지 않는다).
  const getFitBottomPadding = useCallback(
    () =>
      isAimingRef.current
        ? 0
        : Math.min(sheetHeightRef.current, detentsRef.current.half),
    []
  );

  // 목록에서 고르면 그 자리를 지도에서 보여야 한다 — 펼침이면 기본 단으로 내린다(GRP-10).
  const lowerExpandedSheet = useCallback(() => {
    const sheet = sheetRef.current;

    if (sheet?.getDetent() === RouteSheetDetent.Expanded) {
      sheet.snapTo(RouteSheetDetent.Half);
    }
  }, []);

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
   * 버튼을 다시 누르면 방향 모드(지도 회전 + 방향 부채꼴), 한 번 더 누르면 끈다(GRP-10 · BD-11) —
   * 내 위치로·따라가기·북쪽 되돌리기 카메라는 훅이 `animateTo`로 직접 옮긴다.
   */
  const animateTo = useCallback((options: AppMapAnimateOptions) => {
    mapRef.current?.animateTo(options);
  }, []);
  const {
    granted: locationGranted,
    currentLocation,
    mode: myLocationMode,
    heading,
    mapBearing,
    handlePressMyLocation,
    handleCameraChanged: handleMyLocationCameraChanged,
    releaseFollow,
  } = useMyLocationHeadingMode({ animateTo, logTag: 'GroupMap' });

  /**
   * 화면이 카메라를 옮기면 방향 모드의 따라가기를 푼다 — 다음 나침반 값이 되돌리지 않게. 줌이 없으면 유지한다.
   * 아래 여백은 시트가 덮는 높이 — 포인트가 시트 밑이 아니라 보이는 지도 칸 가운데에 온다.
   */
  const moveCamera = useCallback(
    (latitude: number, longitude: number, zoom?: number) => {
      releaseFollow();
      mapRef.current?.animateTo({
        latitude,
        longitude,
        ...(zoom !== undefined ? { zoom } : {}),
        duration: CAMERA_MOVE_DURATION,
        padding: { ...NO_CAMERA_PADDING, bottom: getFitBottomPadding() },
      });
    },
    [getFitBottomPadding, releaseFollow]
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
        CAMERA_MOVE_DURATION,
        toFitPadding(getFitTopPadding(), getFitBottomPadding())
      );
    },
    [getFitBottomPadding, getFitTopPadding, releaseFollow]
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
        return toFitCamera(bounds, getFitTopPadding(), getFitBottomPadding());
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
    getFitBottomPadding,
    getFitTopPadding,
    groupMap,
    initialCamera,
    initialized,
    pointList,
    pointsInitialized,
  ]);

  /**
   * 고른 코스로 카메라를 옮긴다 (GRP-8) — 시트 코스 행, 방금 올린 코스. 시트가 펼침이면 기본 단으로 내린다.
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
    lowerExpandedSheet();

    // 훑는 중에 바뀐 선택은 카메라를 옮기지 않는다 — 손가락 아래 그래프와 지도가 어긋난다.
    if (scrubbingRef.current) {
      scrubbingRef.current = false;

      return;
    }

    if (bounds) {
      fitBounds(bounds);
    }
  }, [
    fitBounds,
    groupMap,
    initialCamera,
    lowerExpandedSheet,
    routeFocusRequest,
    routes,
  ]);

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

  // 지도 이동 알림(시작·진행·끝). 손으로 움직이면(`Gesture`) 훅이 방향 모드의 따라가기를 푼다(GRP-10 · BD-11).
  const handleMapCameraChanged = useCallback(
    (change: AppMapCameraChange) => {
      const { latitude, longitude, zoom, bearing } = change;

      viewRef.current = { latitude, longitude, zoom, bearing };
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

      topOverlayBottomRef.current = bottom;
      setTopOverlayBottom(previous =>
        Math.abs(previous - bottom) < 1 ? previous : bottom
      );
      handleTopOverlayLayout(event);
    },
    [handleTopOverlayLayout]
  );

  const handleCardSlotLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    setCardSlotHeight(previous =>
      Math.abs(previous - height) < 1 ? previous : height
    );
  }, []);

  const handleRootLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    setRootHeight(previous =>
      Math.abs(previous - height) < 1 ? previous : height
    );
  }, []);

  const handleGraphLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    if (height <= 0) {
      return;
    }

    setGraphHeight(previous =>
      Math.abs(previous - height) < 1 ? previous : height
    );
  }, []);

  const handleSheetHeightChange = useCallback((height: number) => {
    sheetHeightRef.current = height;
    setSheetHeight(previous =>
      Math.abs(previous - height) < 1 ? previous : height
    );
  }, []);

  const handleSheetDetentChange = useCallback((detent: RouteSheetDetent) => {
    sessionSheetDetent = detent;
  }, []);

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

  /**
   * 시트 포인트 행 탭 — 그 포인트로 초점을 주고 카메라를 옮긴다(적어도 그 부근까지 당긴다). 이미 고른 포인트를
   * 다시 눌러도 옮긴다 — 초점 이펙트는 같은 포인트에 다시 돌지 않으므로 여기서 직접 옮긴다. 카드가 뜨고, 펼침이면
   * 기본 단으로 내린다(지도가 보여야 한다, GRP-10).
   */
  const handleSelectPoint = useCallback(
    (point: GroupPoint) => {
      const currentZoom = viewRef.current?.zoom ?? POINT_FOCUS_ZOOM;

      handledPointIdRef.current = point.getId();
      groupMap.focusPoint(point.getId());
      lowerExpandedSheet();
      moveCamera(
        point.getLatitude(),
        point.getLongitude(),
        Math.max(currentZoom, POINT_FOCUS_ZOOM)
      );
    },
    [groupMap, lowerExpandedSheet, moveCamera]
  );

  /**
   * 3D 리플레이 열기(RR-1) — 선택 코스의 축약 좌표·이름·지도에 지금 보이는 포인트(유형 필터 적용)를 담는다.
   * 오프라인이면 열지 않고 알린다 — 웹뷰가 타일을 서버에서 받는다. 버튼은 비활성 모양이 아니다(연결이 돌아오면 된다).
   */
  const handleOpenReplay = () => {
    if (!selectedRoute) {
      return;
    }

    if (app.getNetworkStatus().isOffline()) {
      app.getToastManager()?.showSimple(l10n.t('offline.toast.onlineToView'));

      return;
    }

    const points = pointList.getVisiblePoints();

    app.getAnalyticsManager()?.logClick('route_replay_open', {
      source: RouteReplaySource.Group,
      point_count: points.length,
      distance_m: Math.round(selectedRoute.getDistance()),
    });
    app.getRouteReplayStore().open({
      title: selectedRoute.getName(),
      source: RouteReplaySource.Group,
      coordinates: selectedRoute.getSimplified(),
      points: points.map(point => ({
        latitude: point.getLatitude(),
        longitude: point.getLongitude(),
        title: point.getTitle(),
        type: point.getType(),
        color: getPointTypeColor(point.getType()),
      })),
    });
    router.push('/route-replay');
  };

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
  const submitting = pointList.isSubmitting();
  // 조준 모드에서는 시트가 내려가 그래프도 걷힌다(GRP-9).
  const profile = isAiming
    ? null
    : (selectedRoute?.getElevationProfile() ?? null);
  // 그래프가 걷힌 뒤(조준 모드·코스 교체)에는 남은 표본을 그리지 않는다.
  const scrubSample =
    profile && scrub?.routeId === (selectedRouteId ?? '') ? scrub.sample : null;
  // 선택 코스가 선이 될 때만 연다(RR-1·RR-3). 조준 모드에서는 걷는다.
  const showReplayButton =
    CAN_OPEN_REPLAY &&
    !isAiming &&
    !!selectedRoute &&
    selectedRoute.getSimplified().length >= ROUTE_REPLAY_MIN_COORDINATES;
  // 조준 모드 중에는 `내 위치`만 남는다(GRP-10) — 권한이 없으면 그것도 없다.
  const showControlStack = !isAiming || locationGranted;
  /**
   * 지도 아래쪽에서 비울 높이 — 시트가 덮는 높이(펼침이어도 기본 단 높이까지 — 그 위로는 시트가 컨트롤을 덮는다).
   * 조준 모드에서는 시트가 내려가 지도가 화면 맨 아래까지 온다 — 세이프에어리어만 비운다.
   */
  const bottomInset = isAiming
    ? insets.bottom
    : Math.min(sheetHeight, detents.half);
  // 출처 ⓘ(라이선스 의무)·iOS 축척 막대 — 시트 위, 카드가 있으면 그 위로 올린다.
  const attributionBottomOffset =
    cardSlotHeight > 0
      ? CONTROL_BOTTOM_OFFSET + bottomInset + cardSlotHeight
      : bottomInset;
  const sheetHalf = detents.half;
  const sheetCollapsed = detents.collapsed;
  const aimingBottom = insets.bottom;
  // 우하단 컨트롤·카드 칸은 시트 위 끝을 매 프레임 따라간다(스로틀된 상태로 옮기면 끄는 동안 뒤처진다).
  const bottomOverlayStyle = useAnimatedStyle(() => ({
    bottom:
      CONTROL_BOTTOM_OFFSET +
      (isAiming ? aimingBottom : Math.min(sheetHeightValue.value, sheetHalf)),
  }));
  // 그래프는 접힘 ↔ 기본 사이에서 접혔다 펴진다 — 접힘에는 손잡이 + 세그먼트 + 첫 행만 보인다(BD-11).
  const graphSlotStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      sheetHeightValue.value,
      [sheetCollapsed, sheetHalf],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { height: graphHeight * progress, opacity: progress };
  });
  const ornamentTopOffset = Math.max(topInset, topOverlayBottom + OVERLAY_GAP);

  const renderCard = () => {
    // 조준 모드에서는 정보 카드를 걷고 안내 + 취소·확정만 둔다(GRP-9).
    if (isAiming) {
      return (
        <View style={styles.aimSection} pointerEvents='box-none'>
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
              <PretendardText style={styles.controlLabel}>
                {l10n.t('common.cancel')}
              </PretendardText>
            </TouchableOpacity>
            {/* 조준 모드의 주 액션 하나 — `포인트 추가`가 걷힌 동안 라임은 여기에만 쓴다(HM-8). */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => void handleConfirmAiming()}
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
      );
    }

    if (selectedPoint) {
      return (
        <View style={styles.card}>
          <PointCalloutView
            point={selectedPoint}
            meta={getPointMeta(selectedPoint)}
            canEdit={groupMap.canEditPoint(selectedPoint)}
            routeMeta={pointRouteMark?.calloutMeta ?? null}
            disabled={submitting}
            onEdit={() => onRequestEdit(selectedPoint)}
            onDelete={() => onRequestDelete(selectedPoint)}
            onClose={handleCloseCards}
          />
        </View>
      );
    }

    // 코스 출발·도착 위치 정보 카드(GRP-8) — 포인트 카드와 같은 자리, 둘 중 하나만 뜬다.
    if (endpoint && selectedRoute) {
      return (
        <View style={styles.card}>
          <RouteEndpointCalloutView
            endpointInfo={endpointInfo}
            endpoint={endpoint}
            routeName={selectedRoute.getName()}
            onClose={handleCloseEndpoint}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <GestureHandlerRootView style={styles.root} onLayout={handleRootLayout}>
      {/* 지도와 그 위 오버레이가 사는 칸 — 화면을 다 쓴다. 고도 그래프·목록은 그 위에 얹힌 바텀 시트다(GRP-10).
        조준 마커가 이 칸의 정중앙에 선다(조준 모드에서는 시트가 내려간다). */}
      <View style={styles.mapSection}>
        <View style={styles.mapArea} onLayout={handleMapAreaLayout}>
          {initialCamera ? (
            <AppMapView
              ref={mapRef}
              initialCamera={initialCamera}
              showScaleBar
              attributionBottomOffset={attributionBottomOffset}
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
                <MapSpotPinMarkerView
                  key={campSpot.id}
                  spot={campSpot}
                  idPrefix='group-map-spot'
                />
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

        {/* 지도 아래쪽 오버레이 — 컨트롤 스택 밑에 카드가 붙는다(버튼을 가리지 않게 한 칸에 쌓는다). 시트 위 끝을 따라간다. */}
        <Animated.View
          style={[styles.bottomOverlay, bottomOverlayStyle]}
          pointerEvents='box-none'
          onLayout={handleBottomOverlayLayout}
        >
          {showControlStack ? (
            // 우측 지도 컨트롤 — `3D`(RR-1) → 내 위치 → `포인트 추가`(GRP-10). 방향 뒤집기는 시트 코스 행 `⋯`에 있다.
            <View style={styles.controlStack} pointerEvents='box-none'>
              {/* `3D`는 라임이 아니다 — 이 화면의 주 액션은 `포인트 추가` 하나다(HM-8). */}
              {showReplayButton ? (
                <TouchableOpacity
                  style={styles.replayButton}
                  onPress={handleOpenReplay}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('routeReplay.open')}
                >
                  <Ionicons name='cube-outline' size={18} color={Acg.ink} />
                  <PretendardText weight='semibold' style={styles.controlLabel}>
                    {l10n.t('routeReplay.badge')}
                  </PretendardText>
                </TouchableOpacity>
              ) : null}
              {/* 현재 위치(누를 때마다 내 위치로 → 방향 모드 → 끄기). 권한이 있을 때만(GRP-9 엣지 케이스).
                조준 모드에서도 남긴다 — 내 자리로 지도를 옮겨 그 부근을 겨누는 것이 흔한 경로다. */}
              {locationGranted ? (
                <MapMyLocationButtonView
                  mode={myLocationMode}
                  locateLabel={l10n.t('group.map.currentLocation')}
                  onPress={() => void handlePressMyLocation()}
                />
              ) : null}
              {/* `포인트 추가` — 라임, 화면당 하나(HM-8). 롱프레스의 접근 가능한 대안으로 조준 모드에 들어간다. */}
              {isAiming ? null : (
                <TouchableOpacity
                  style={[styles.addButton, isFull && styles.disabled]}
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
                      ? getGroupValidationMessage(
                          GroupValidationError.PointLimitExceeded
                        )
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
              )}
            </View>
          ) : null}
          {/* 카드 칸 — 높이를 재서 출처 표기를 그 위로 올린다(라이선스 의무, MAP-1). */}
          <View pointerEvents='box-none' onLayout={handleCardSlotLayout}>
            {renderCard()}
          </View>
        </Animated.View>
      </View>

      {/* 하단 바텀 시트(GRP-10) — 손잡이 + 세그먼트(끄는 영역) · 고도 그래프 · 목록. 조준 모드에서는 내려간다. */}
      <RouteBottomSheetView
        ref={sheetRef}
        detents={detents}
        initialDetent={initialSheetDetent}
        animatedHeight={sheetHeightValue}
        onHeightChange={handleSheetHeightChange}
        onDetentChange={handleSheetDetentChange}
        visible={!isAiming}
        header={
          <View style={styles.sheetHeader}>
            <RouteSegmentChipsView
              segment={segment}
              onChangeSegment={setSegment}
            />
          </View>
        }
      >
        {/* 고도가 없는 코스는 그래프 자리를 아예 비운다 — 빈 틀은 "데이터를 못 불러왔다"로 읽힌다. */}
        {profile && selectedRoute ? (
          <Animated.View style={[styles.graphSlot, graphSlotStyle]}>
            {/* 칸이 접혀도 그래프는 제 높이로 그려 둔다(잘릴 뿐) — 그 높이가 기본 단 계산에 들어간다. */}
            <View onLayout={handleGraphLayout}>
              <RouteElevationChartView
                // 코스를 바꾸거나 방향을 뒤집으면 새로 마운트해 이전 단면의 커서가 남지 않게 한다.
                key={`${selectedRoute.getId()}:${selectedRoute.isReversed() ? 'r' : 'f'}`}
                profile={profile}
                // 축 거리는 목록 행과 같은 원본 거리로 읽힌다(GRP-8).
                displayDistance={selectedRoute.getDistance()}
                onScrub={handleScrub}
                // 고른 포인트의 코스 위 위치(GRP-8) — 500m 밖이면 표시하지 않는다.
                pointMarker={pointRouteMark?.chartMarker ?? null}
              />
            </View>
          </Animated.View>
        ) : null}
        <GroupMapSheetListView
          groupMap={groupMap}
          segment={segment}
          // 고르기는 화면이 잇는다(`focusRoute`). 카메라 이동·시트 내림은 코스 초점 이펙트가 맡는다.
          onSelectRoute={onSelectRoute}
          onDeleteRoute={onRequestDeleteRoute}
          onAddRoute={onAddRoute}
          isAddingRoute={isAddingRoute}
          isUploadingRoute={isUploadingRoute}
          onSelectPoint={handleSelectPoint}
          onEditPoint={onRequestEdit}
          onDeletePoint={onRequestDelete}
          bottomInset={listBottomInset}
        />
      </RouteBottomSheetView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  // 지도는 화면을 다 쓴다 — 그래프·목록은 그 위에 얹힌 바텀 시트다(GRP-10).
  mapSection: {
    flex: 1,
    overflow: 'hidden',
    // 지도가 붙기 전 자리는 지면색.
    backgroundColor: Acg.paper,
  },
  mapArea: {
    flex: 1,
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
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  // 시트 머리의 세그먼트 칩 줄 — 손잡이 바로 아래, 좌우는 화면 패딩.
  sheetHeader: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: SHEET_HEADER_PADDING_BOTTOM,
  },
  // 접힘 ↔ 기본 사이에서 높이가 줄어드는 그래프 칸 — 넘치는 부분은 자른다.
  graphSlot: {
    overflow: 'hidden',
  },
  // 지도 위 컨트롤 세로 스택(우측 16 — 배낭 코스 지도와 같은 자리 규칙).
  controlStack: {
    alignSelf: 'flex-end',
    marginRight: MAP_CONTROL_INSET,
    alignItems: 'flex-end',
    gap: 8,
  },
  card: {
    marginTop: CARD_GAP,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // `포인트 추가`·조준 확정 — 라임 주 액션 알약(HM-8).
  addButton: {
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
  // `3D` — 지도 위 흰 보조 알약(배낭 코스 화면과 같은 면·그림자).
  replayButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: REPLAY_PILL_ICON_GAP,
    paddingHorizontal: REPLAY_PILL_PADDING_H,
    paddingVertical: Spacing.item,
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
});

export default observer(GroupMapCanvasView);
