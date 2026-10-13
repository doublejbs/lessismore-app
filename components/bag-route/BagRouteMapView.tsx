import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
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
import MapRoutePathLayersView, {
  ROUTE_CASING_LAYER_ID,
} from '@/components/map/MapRoutePathLayersView';
import MapScrubMarkerView from '@/components/map/MapScrubMarkerView';
import { useMyLocationHeadingMode } from '@/components/map/useMyLocationHeadingMode';
import OfflineMapContoursView from '@/components/offline/OfflineMapContoursView';
import OfflineSnapshotBandView from '@/components/offline/OfflineSnapshotBandView';
import PointAimMarkerView from '@/components/point/PointAimMarkerView';
import PointCalloutView from '@/components/point/PointCalloutView';
import PointFilterChipsView from '@/components/point/PointFilterChipsView';
import usePointRouteMark from '@/components/point/usePointRouteMark';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
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
import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import BagPointAddVia from '@/model/bag-point/BagPointAddVia';
import { BagPointCoordinate } from '@/model/bag-point/BagPointCoordinate';
import { getBagPointMeta } from '@/model/bag-point/BagPointLabels';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRouteList from '@/model/bag-route/BagRouteList';
import BagRouteSheetDetent from '@/model/bag-route/BagRouteSheetDetent';
import {
  KOREA_CAMERA,
  lngLatBoundsToRouteBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
import { deltaToZoom } from '@/model/map/MapZoom';
import MapPoint from '@/model/point/MapPoint';
import { getPointTypeColor } from '@/model/point/PointLabels';
import { ROUTE_REPLAY_MIN_COORDINATES } from '@/model/route-replay/RouteReplayCoordinates';
import RouteReplaySource from '@/model/route-replay/RouteReplaySource';
import {
  getRouteFitRegion,
  mergeRouteBounds,
  RouteCameraRegion,
} from '@/model/route/RouteCamera';
import { RouteBounds, RouteCoordinate } from '@/model/route/RouteData';
import { RouteElevationSample } from '@/model/route/RouteElevation';
import BagRouteBottomSheetView, {
  BagRouteBottomSheetHandle,
} from './BagRouteBottomSheetView';
import {
  getBagRouteSheetDetentHeight,
  getBagRouteSheetDetents,
  SHEET_HEADER_PADDING_BOTTOM,
} from './BagRouteSheetLayout';

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
  /**
   * 연결이 없다(OF-6). 지도는 같고 타일만 오프라인 팩에서 온다 — 상단 안내 줄을 띄우고 편집 UI(롱프레스·조준·
   * `포인트 추가`·`3D`·끝점 카드)를 숨긴다.
   */
  isOffline: boolean;
  // 상단 오버레이를 헤더 아래로 내린다 — iOS 투명 헤더는 세이프에어리어 + 헤더, Android는 여백만.
  topInset: number;
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
  /**
   * 바텀 시트(BD-11) 머리 — 손잡이와 함께 끄는 영역(`코스 | 포인트` 세그먼트 칩 줄). 지도 모듈이 없는 옛
   * 바이너리(게이트 폴백)에서는 안내 줄 아래 그대로 세로로 쌓인다.
   */
  listHeader: ReactNode;
  // 바텀 시트 본문의 목록(고도 그래프 아래). 시트 높이를 채우도록 그린다(`fillHeight`).
  listContent: ReactNode;
  // 목록 섹션 아래 여백(세이프에어리어 + 12) — 시트 단 높이 계산이 같은 값을 쓴다.
  listBottomInset: number;
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

/** 목록에서 포인트를 골랐을 때 적어도 이만큼 당겨 보는 범위(도) — 그룹 지도의 포인트 초점과 같은 값. */
const POINT_FOCUS_ZOOM = deltaToZoom(0.02);
/** 코스·포인트가 한 점뿐일 때(상자가 0) 그 점을 보는 줌 — 상자 맞춤은 최대 줌으로 붙어 버린다. */
const SINGLE_POINT_ZOOM = 15;
/**
 * 지도 컨트롤이 지도 아래 가장자리에서 떨어지는 거리. 이 화면은 그래프·목록·`코스 추가`가 지도
 * **밖** 아래에 있어 그룹 지도의 +120 대신 이 여백만 둔다.
 */
const CONTROL_BOTTOM_OFFSET = 16;
// 지도 가장자리와 지도 위 컨트롤 사이 여백(우측).
const MAP_CONTROL_INSET = 16;
// 컨트롤 줄과 카드 사이 간격.
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
/** 3D 리플레이 진입(RR-1)은 네이티브에만 있다(APP-5). 이 본문은 네이티브 전용이지만 명시해 둔다. */
const CAN_OPEN_REPLAY = Platform.OS !== 'web';
// `3D` 보조 알약의 아이콘-라벨 간격·좌우 패딩(세로 패딩은 `Spacing.item`).
const REPLAY_PILL_ICON_GAP = 6;
const REPLAY_PILL_PADDING_H = 16;
// `offline_route_map_open`의 `reason`(OF-8). 폴백(`map_unavailable`)은 2026-10-12 폐기 — 지금은 이 값 하나다.
const OFFLINE_MAP_OPEN_REASON = 'offline';
// 그래프를 아직 재지 못했을 때의 높이(pt) — 위 여백 + 머리 줄 + 그래프 96 + 안내 줄 + 축 줄.
const GRAPH_HEIGHT_ESTIMATE = 184;

/**
 * 시트 단은 **세션 동안** 기억한다(BD-11) — 화면을 닫았다 다시 열어도 같은 단으로 뜬다. 기기에 저장하지는
 * 않는다(앱을 다시 켜면 기본 단).
 */
let sessionSheetDetent = BagRouteSheetDetent.Half;

// `getRouteFitRegion`(여유 배율·최소 범위가 들어간 영역)을 지도 초기 카메라 상자로 — 여백은 이미 들어 있다.
const regionToBounds = (region: RouteCameraRegion): RouteBounds =>
  lngLatBoundsToRouteBounds(regionToLngLatBounds(region));

const isSinglePoint = (bounds: RouteBounds): boolean =>
  bounds.minLat === bounds.maxLat && bounds.minLng === bounds.maxLng;

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
): AppMapInitialCamera =>
  isSinglePoint(bounds)
    ? {
        latitude: bounds.minLat,
        longitude: bounds.minLng,
        zoom: SINGLE_POINT_ZOOM,
      }
    : {
        bounds: regionToBounds(getRouteFitRegion(bounds)),
        padding: toFitPadding(topPadding, bottomPadding),
      };

/**
 * 배낭 코스 지도 (BD-11 · BD-14 · OF-6 · MAP-4) — 네이티브 전용 본문. 온라인·오프라인이 **같은 지도**다
 * (`AppMapView` — MapLibre + 스타일 `useless-outdoor`). 온라인이면 타일을 서버에서, 오프라인이면 저장해 둔 팩에서
 * 받는다. 둘을 가르는 것은 "편집 가능 여부"와 "상단 안내 줄"뿐이다.
 *
 * - 코스 선·끝점·포인트·훑기·내 위치는 그룹 지도(GRP-8·GRP-10)와 **같은 공용 레이어·마커**다(`components/map/`).
 * - **등고선**(저장본의 `contours.json`)은 온라인에서도 저장본이 있으면 그린다 — 같은 지도에서 지형 정보가
 *   켜졌다 꺼졌다 하지 않게(MAP-4).
 * - **추가 경로 둘**(GRP-9와 같다, 온라인에서만): 지도 **길게 누르기**(MapLibre 네이티브 롱프레스) → 입력 시트,
 *   우하단 `포인트 추가` 보조 알약 → **조준 모드**. `포인트 추가`는 라임이 아니다 — 이 화면의 주 액션(라임)은 목록
 *   아래 `코스 추가` 하나다(HM-8). 조준 모드에서는 목록이 걷히므로 그때의 주 액션 `이 위치에 추가`가 라임이 된다.
 * - 카메라 순서: 초점 포인트 → 고른 코스 → 전체 상자(코스 + 포인트) → 저장해 둔 지도 팩 영역 → 남한 전역.
 *   처음 자리는 지도를 붙일 때의 초기 카메라로 준다(세계 지도에서 날아오지 않는다).
 * - 지도는 화면을 다 쓰고, 고도 그래프 + 세그먼트 + 목록은 지도 위에 얹힌 **바텀 시트**다(BD-11, 2026-10-12).
 *   세 단(접힘·기본·펼침)으로 끌어 올린다. 그래프는 시트 맨 위(손잡이·세그먼트 아래)라 훑는 동안에도 손가락이
 *   지도를 가리지 않는다(GRP-8). 접힘으로 내리면 그래프가 접혀 첫 행이 보인다. 출처 ⓘ·축척·우하단 컨트롤은 시트
 *   위로 따라 올라오고(기본 단 높이까지), 카메라 맞춤은 시트가 덮는 아래를 비운다.
 */
const BagRouteMapView: FC<Props> = ({
  bagRouteList,
  bagPointList,
  isOffline,
  topInset,
  isAiming,
  onStartAiming,
  onCancelAiming,
  onRequestCreate,
  onRequestEdit,
  onRequestDelete,
  listHeader,
  listContent,
  listBottomInset,
}) => {
  const l10n = app.getL10n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<BagRouteBottomSheetHandle>(null);
  // 시트가 얹히는 칸의 높이 — 재기 전에는 창 높이로 어림한다(첫 카메라가 시트 높이를 써야 한다).
  const [rootHeight, setRootHeight] = useState(windowHeight);
  const [graphHeight, setGraphHeight] = useState(GRAPH_HEIGHT_ESTIMATE);
  const mapRef = useRef<AppMapViewRef>(null);
  const mountedRef = useRef(true);
  // 마지막으로 알려진 지도 상태 — 줌 유지·③의 북쪽 되돌리기·조준 확정 폴백에 쓴다.
  const viewRef = useRef<ViewSnapshot | null>(null);
  const mapSizeRef = useRef<MapSize | null>(null);
  // 처리한 마지막 코스 선택 요청(`BagRouteList.focusEntry`)·포인트 초점 요청(`BagPointList.focusEntry`)의 `seq`.
  const handledFocusSeqRef = useRef(0);
  const handledPointSeqRef = useRef(0);
  // 지금 손가락이 고도 그래프 위에 있는지. 이때는 선택이 바뀌어도 카메라를 옮기지 않는다(GRP-8).
  const scrubbingRef = useRef(false);
  const markerPressedAtRef = useRef(0);
  const loggedLoadFailureRef = useRef(false);
  /**
   * 지도를 붙일 때의 카메라. 코스·포인트가 모두 읽힌 뒤 한 번 정한다 — 정하기 전에는 지도를 붙이지 않아
   * 처음부터 그 자리에서 그린다. 그 뒤의 이동은 ref 명령이다.
   */
  const [initialCamera, setInitialCamera] =
    useState<AppMapInitialCamera | null>(null);
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [contours, setContours] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  /**
   * 오프라인일 때 이 여행의 저장본이 있는지 — 없으면(온라인으로 열었다가 끊김) "저장된 지도" 줄을 띄우지 않는다.
   * `null`은 아직 모름(읽는 중) — 어느 줄도 띄우지 않는다.
   */
  const [hasSavedSnapshot, setHasSavedSnapshot] = useState<boolean | null>(
    null
  );
  // 상단 오버레이(안내 줄·유형 칩)의 아래 끝(pt, 지도 좌표계) — 나침반·안드로이드 축척 막대를 그 아래로 내린다.
  const [topOverlayBottom, setTopOverlayBottom] = useState(topInset);
  // 위 값의 즉시 사본 — 카메라 맞춤 콜백이 참조를 고정한 채 읽는다.
  const topOverlayBottomRef = useRef<number | null>(null);
  // 지도 아래쪽 카드(포인트·끝점·조준 안내)의 높이 — 출처 표기(라이선스 의무)를 그 위로 올린다. 없으면 0.
  const [cardSlotHeight, setCardSlotHeight] = useState(0);
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
  // 코스 선 레이어는 안에서 id·좌표 수·방향 키로 memo한다(`getEntries()`는 부를 때마다 새 배열이다).
  const routes = entries.map(entry => entry.route);
  const selected = bagRouteList.getSelectedEntry();
  const selectedKey = bagRouteList.getSelectedKey();
  const selectedRoute = selected?.route ?? null;
  // 시작·끝 마커는 선택 코스에만 — 코스가 하나뿐이면 고르지 않아도 그 코스가 주인공이다.
  const markerRoute =
    selectedRoute ?? (entries.length === 1 ? entries[0].route : null);
  const focusRequest = bagRouteList.getFocusRequest();
  const focusedEntry = bagPointList.getFocusedEntry();
  const focusedPoint = focusedEntry?.point ?? null;
  const pointFocusRequest = bagPointList.getFocusRequest();
  const isContentReady =
    bagRouteList.isInitialized() && bagPointList.isInitialized();
  const bagId = bagRouteList.getBagId();
  // 고른 포인트가 선택된 코스의 어디쯤인지 — 그래프 표시와 카드 메타 줄(GRP-8 500m 규칙).
  const pointRouteMark = usePointRouteMark(selectedRoute, focusedPoint);
  const canEdit = !isOffline;
  // 시트 단 높이(BD-11) — 고도가 없는 코스는 그래프 자리가 없다.
  const hasSheetGraph = !!selected?.route.getElevationProfile();
  const hasSheetFooter = bagRouteList.canAdd();
  const detents = useMemo(
    () =>
      getBagRouteSheetDetents({
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
  const initialSheetHeight = getBagRouteSheetDetentHeight(
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

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 내 위치 (BD-11) — 그룹 지도·박지 지도와 같은 공용 훅이다. 진입에서 권한을 묻지 않고,
   * 권한이 없으면 점을 그리지 않는다. 버튼은 항상 보이고 누르면 권한을 요청한다 — 코스를 따라
   * 걸으며 "지금 어디쯤인가"를 보려고 들어온 화면이라 첫 요청 자리가 필요하다.
   * 버튼을 다시 누르면 방향 모드(지도 회전 + 방향 부채꼴), 한 번 더 누르면 끈다(그룹 지도와 같다) —
   * 내 위치로·따라가기·북쪽 되돌리기 카메라는 훅이 `animateTo`로 직접 옮긴다.
   */
  const animateTo = useCallback((options: AppMapAnimateOptions) => {
    mapRef.current?.animateTo(options);
  }, []);
  const {
    currentLocation,
    mode: myLocationMode,
    heading,
    mapBearing,
    handlePressMyLocation,
    handleCameraChanged: handleMyLocationCameraChanged,
    releaseFollow,
  } = useMyLocationHeadingMode({ animateTo, logTag: 'BagRoute' });

  /**
   * 출발·도착 마커 탭 → 위치 정보 카드(GRP-8, 그룹 지도와 같다). 카메라는 그 점으로 옮기되 줌은 그대로 두고,
   * 카드가 덮는 높이만큼 아래 여백(`padding`)을 줘 끝점이 카드 위 빈 자리에 오게 한다.
   */
  const handleMoveToEndpoint = useCallback(
    (coordinate: RouteCoordinate, padding: RouteEndpointCameraPadding) => {
      // 방향 모드의 따라가기를 먼저 푼다 — 다음 나침반 값이 카메라를 내 위치로 되돌리지 않게.
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
    route: markerRoute,
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

  // 연결이 끊기면 편집 흐름을 접는다 — 조준 모드·끝점 카드(역지오코딩이 서버를 쓴다)는 온라인에서만이다.
  useEffect(() => {
    if (!isOffline) {
      return;
    }

    handleCloseEndpoint();

    if (isAiming) {
      onCancelAiming();
    }
  }, [handleCloseEndpoint, isAiming, isOffline, onCancelAiming]);

  /**
   * 상자 맞춤의 위 여백 — 상단 오버레이(안내 줄·칩 줄) 아래 끝 + 16. 첫 카메라 때는 칩 줄이 내용과 함께 막 떠서
   * 아직 재지 못했을 수 있으므로 적어도 칩 한 줄은 어림해 둔다.
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

  // 목록에서 고르면 그 자리를 지도에서 보여야 한다 — 펼침이면 기본 단으로 내린다(BD-11).
  const lowerExpandedSheet = useCallback(() => {
    const sheet = sheetRef.current;

    if (sheet?.getDetent() === BagRouteSheetDetent.Expanded) {
      sheet.snapTo(BagRouteSheetDetent.Half);
    }
  }, []);

  const fitBounds = useCallback(
    (bounds: RouteBounds) => {
      // 코스로 옮기면 방향 모드의 따라가기를 푼다(손으로 옮긴 것과 같다 — BD-11).
      releaseFollow();

      if (isSinglePoint(bounds)) {
        mapRef.current?.animateTo({
          latitude: bounds.minLat,
          longitude: bounds.minLng,
          zoom: SINGLE_POINT_ZOOM,
          duration: CAMERA_MOVE_DURATION,
          padding: { ...NO_CAMERA_PADDING, bottom: getFitBottomPadding() },
        });

        return;
      }

      mapRef.current?.fitRegion(
        getRouteFitRegion(bounds),
        CAMERA_MOVE_DURATION,
        toFitPadding(getFitTopPadding(), getFitBottomPadding())
      );
    },
    [getFitBottomPadding, getFitTopPadding, releaseFollow]
  );

  /**
   * 최초 카메라 — 코스와 포인트가 **둘 다 읽힌 뒤** 한 번 정한다(먼저 온 쪽에 맞추면 늦게 온 쪽이 화면 밖에
   * 남는다). 순서: 아직 처리하지 않은 포인트 초점 → 고른 코스 → 전체 상자 → 저장해 둔 지도 팩 영역(코스·
   * 포인트가 없는 저장본, OF-1) → 남한 전역.
   */
  useEffect(() => {
    if (initialCamera || !isContentReady) {
      return;
    }

    let cancelled = false;

    // 지도 팩 영역은 저장소에서 비동기로 읽는다 — 나머지 판단도 같은 흐름에 둔다.
    const decideInitialCamera = async (): Promise<AppMapInitialCamera> => {
      const pointRequest = bagPointList.getFocusRequest();
      const routeRequest = bagRouteList.getFocusRequest();

      handledPointSeqRef.current = pointRequest?.seq ?? 0;
      handledFocusSeqRef.current = routeRequest?.seq ?? 0;

      const pointEntry = pointRequest
        ? bagPointList.getEntries().find(item => item.key === pointRequest.key)
        : null;

      if (pointEntry) {
        return {
          latitude: pointEntry.point.getLatitude(),
          longitude: pointEntry.point.getLongitude(),
          zoom: POINT_FOCUS_ZOOM,
        };
      }

      const routeBounds = routeRequest
        ? (bagRouteList
            .getEntries()
            .find(item => item.key === routeRequest.key)
            ?.route.getBounds() ?? null)
        : null;
      const contentBounds =
        routeBounds ??
        mergeRouteBounds([
          bagRouteList.getContentBounds(),
          bagPointList.getContentBounds(),
        ]);

      if (contentBounds) {
        return toFitCamera(
          contentBounds,
          getFitTopPadding(),
          getFitBottomPadding()
        );
      }

      const packBounds =
        (await app.getOfflineTripStore()?.getMapBounds(bagId)) ?? null;

      return packBounds
        ? { bounds: lngLatBoundsToRouteBounds(packBounds), padding: 0 }
        : KOREA_CAMERA;
    };

    const applyInitialCamera = async () => {
      const camera = await decideInitialCamera();

      if (!cancelled) {
        setInitialCamera(camera);
      }
    };

    void applyInitialCamera();

    return () => {
      cancelled = true;
    };
  }, [
    bagId,
    bagPointList,
    bagRouteList,
    getFitBottomPadding,
    getFitTopPadding,
    initialCamera,
    isContentReady,
  ]);

  /**
   * 목록에서 고른 코스로 카메라를 옮긴다(BD-11). **고를 때마다** 옮긴다 — 같은 코스를 다시 골라도(`seq`가
   * 올라간다). 지도를 붙이기 전의 요청은 최초 카메라가 맡는다.
   */
  useEffect(() => {
    if (
      !initialCamera ||
      !focusRequest ||
      focusRequest.seq === handledFocusSeqRef.current
    ) {
      return;
    }

    handledFocusSeqRef.current = focusRequest.seq;
    lowerExpandedSheet();

    // 훑는 중에 바뀐 선택은 카메라를 옮기지 않는다 — 손가락 아래 그래프와 지도가 어긋난다(GRP-8).
    // 선택이 바뀌면 그래프가 새로 마운트되어 이 훑기는 끝난다(남은 마커는 키가 달라 저절로 걷힌다).
    if (scrubbingRef.current) {
      scrubbingRef.current = false;

      return;
    }

    const bounds =
      bagRouteList
        .getEntries()
        .find(item => item.key === focusRequest.key)
        ?.route.getBounds() ?? null;

    if (bounds) {
      fitBounds(bounds);
    }
  }, [
    bagRouteList,
    fitBounds,
    focusRequest,
    initialCamera,
    lowerExpandedSheet,
  ]);

  /**
   * 고른 포인트로 카메라를 옮긴다(BD-14) — 마커 탭은 지금 줌 그대로, 목록 행 탭은 적어도 그 부근까지 당긴다.
   */
  useEffect(() => {
    if (
      !initialCamera ||
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

    const currentZoom = viewRef.current?.zoom ?? POINT_FOCUS_ZOOM;

    lowerExpandedSheet();
    releaseFollow();
    mapRef.current?.animateTo({
      latitude: entry.point.getLatitude(),
      longitude: entry.point.getLongitude(),
      ...(pointFocusRequest.zoomIn
        ? { zoom: Math.max(currentZoom, POINT_FOCUS_ZOOM) }
        : {}),
      duration: CAMERA_MOVE_DURATION,
      padding: { ...NO_CAMERA_PADDING, bottom: getFitBottomPadding() },
    });
  }, [
    bagPointList,
    getFitBottomPadding,
    initialCamera,
    lowerExpandedSheet,
    pointFocusRequest,
    releaseFollow,
  ]);

  // 오프라인이면 이 여행의 저장본이 있는지 읽는다 — 상단 안내 줄(저장된 지도 / 저장되지 않음)이 쓴다.
  useEffect(() => {
    if (!isOffline) {
      return;
    }

    let cancelled = false;

    const loadSnapshotFlag = async () => {
      const snapshot = await app.getOfflineTripStore()?.load(bagId);

      if (!cancelled) {
        setHasSavedSnapshot(!!snapshot);
      }
    };

    void loadSnapshotFlag();

    return () => {
      cancelled = true;
    };
  }, [bagId, isOffline]);

  // 등고선(OF-6 · MAP-4) — 저장본의 `contours.json`. 온라인에서도 있으면 그린다. 저장하지 않은 여행은 없다.
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
    if (!isOffline) {
      return;
    }

    app.getAnalyticsManager()?.logEvent('offline_route_map_open', {
      reason: OFFLINE_MAP_OPEN_REASON,
    });
  }, [isOffline]);

  /**
   * 지도 이동 알림(시작·진행·끝) — 줌 유지·③의 북쪽 되돌리기·부채꼴 보정을 위해 기억하고, 방향 모드 훅에 넘긴다.
   * 손으로 움직이기 시작하면(`Gesture`) 훅이 바로 따라가기를 푼다 — 방향 모드의 카메라 이동이 손과 다투지 않게.
   */
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
      ?.logEvent('map_load_failed', { screen: 'bag_route' });
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

  const handleSheetDetentChange = useCallback((detent: BagRouteSheetDetent) => {
    sessionSheetDetent = detent;
  }, []);

  // 길게 누르기 → 입력 시트(BD-14). 지도의 네이티브 롱프레스라 좌표가 바로 온다. 조준 모드에서는 받지 않는다.
  const handleLongPress = useCallback(
    (coordinate: AppMapCoordinate) => {
      if (isAiming) {
        return;
      }

      onRequestCreate(coordinate, BagPointAddVia.LongPress);
    },
    [isAiming, onRequestCreate]
  );

  // 조준 모드에 들어가면 카드를 걷는다 — 카드가 조준 마커를 가린다(GRP-9).
  const handleStartAiming = useCallback(() => {
    bagPointList.clearFocus();
    handleCloseEndpoint();
    onStartAiming();
  }, [bagPointList, handleCloseEndpoint, onStartAiming]);

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

    onCancelAiming();
    onRequestCreate(
      { latitude: coordinate.latitude, longitude: coordinate.longitude },
      BagPointAddVia.Aim
    );
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

      markerPressedAtRef.current = Date.now();

      if (!entry) {
        return;
      }

      bagPointList.focusEntry(entry.key, false);
    },
    [bagPointList]
  );

  const handleCloseCards = useCallback(() => {
    bagPointList.clearFocus();
    handleCloseEndpoint();
  }, [bagPointList, handleCloseEndpoint]);

  const handlePressMap = useCallback(() => {
    if (Date.now() - markerPressedAtRef.current < MARKER_PRESS_GUARD_MS) {
      return;
    }

    handleCloseCards();
  }, [handleCloseCards]);

  const handleTapEndpointMarker = useCallback(
    (...args: Parameters<typeof handleTapEndpoint>) => {
      markerPressedAtRef.current = Date.now();
      handleTapEndpoint(...args);
    },
    [handleTapEndpoint]
  );

  // 3D 리플레이 열기(RR-1). 온라인에서만 버튼이 선다 — 웹뷰가 타일을 서버에서 받는다.
  const handleOpenReplay = () => {
    if (!selectedRoute) {
      return;
    }

    const points = bagPointList.getVisiblePoints();

    app.getAnalyticsManager()?.logClick('route_replay_open', {
      source: RouteReplaySource.Route,
      point_count: points.length,
      distance_m: Math.round(selectedRoute.getDistance()),
    });
    app.getRouteReplayStore().open({
      title: selectedRoute.getName(),
      source: RouteReplaySource.Route,
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
  /**
   * 지도 아래쪽에서 비울 높이 — 시트가 덮는 높이(펼침이어도 기본 단 높이까지 — 그 위로는 시트가 컨트롤을 덮는다).
   * 조준 모드에서는 시트가 내려가 지도가 화면 맨 아래까지 온다 — 세이프에어리어만 비운다.
   */
  const bottomInset = isAiming
    ? insets.bottom
    : Math.min(sheetHeight, detents.half);
  const focusedBagPoint =
    focusedEntry?.owned && focusedEntry.point instanceof BagPoint
      ? focusedEntry.point
      : null;
  // 선택 코스가 선이 될 때만 연다(RR-1·RR-3). 오프라인·조준 모드에서는 걷는다.
  const showReplayButton =
    CAN_OPEN_REPLAY &&
    canEdit &&
    !isAiming &&
    !!selectedRoute &&
    selectedRoute.getSimplified().length >= ROUTE_REPLAY_MIN_COORDINATES;
  const showEndpointCard =
    canEdit && !!endpoint && !!markerRoute && !focusedEntry;
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

    // 포인트 카드(BD-14) — 끝점 카드와 같은 자리, 둘 중 하나만 뜬다.
    if (focusedEntry) {
      return (
        <View style={styles.card}>
          <PointCalloutView
            point={focusedEntry.point}
            meta={getBagPointMeta(focusedEntry)}
            // 오프라인에서는 포인트를 고칠 수 없다(OF-5 · OF-6).
            canEdit={canEdit && !!focusedBagPoint}
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
            onClose={handleCloseCards}
          />
        </View>
      );
    }

    // 코스 출발·도착 위치 정보 카드(GRP-8).
    if (showEndpointCard && endpoint && markerRoute) {
      return (
        <View style={styles.card}>
          <RouteEndpointCalloutView
            endpointInfo={endpointInfo}
            endpoint={endpoint}
            routeName={markerRoute.getName()}
            onClose={handleCloseEndpoint}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.root} onLayout={handleRootLayout}>
      {/* 지도와 그 위 오버레이가 사는 칸 — 화면을 다 쓴다. 고도 그래프·목록은 그 위에 얹힌 바텀 시트다(BD-11).
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
              {...(canEdit ? { onLongPress: handleLongPress } : {})}
              onCameraChanged={handleMapCameraChanged}
              onInitialized={handleMapInitialized}
              onLoadFailed={handleLoadFailed}
            >
              <MapRoutePathLayersView
                routes={routes}
                selectedRouteId={selectedRoute?.getId() ?? null}
              />
              {/* 등고선은 코스 아래(코스 테두리 레이어 앞)에 끼운다. */}
              {contours ? (
                <OfflineMapContoursView
                  contours={contours}
                  beforeId={ROUTE_CASING_LAYER_ID}
                />
              ) : null}
              {/* 선택한 코스의 시작·끝(GRP-8과 같은 규칙) — 옅게 그린 코스엔 달지 않는다. */}
              <MapEndpointMarkersView
                route={markerRoute}
                {...(canEdit ? { onTapEndpoint: handleTapEndpointMarker } : {})}
              />
              {/* 지도 포인트(BD-14) — 내 포인트와 연결 그룹 포인트를 같은 마커로 그린다. */}
              <MapPointMarkersView
                points={bagPointList.getVisiblePoints()}
                selectedPointId={focusedPoint?.getId() ?? null}
                onTapPoint={handleTapPoint}
              />
              {/* 고도 그래프를 훑는 동안만 뜨는 위치 마커. */}
              {scrubSample ? (
                <MapScrubMarkerView
                  latitude={scrubSample.latitude}
                  longitude={scrubSample.longitude}
                />
              ) : null}
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

        {/* 상단 오버레이 — 상태 한 줄(로드 실패·오프라인·그룹 숨김) + 유형 필터 칩(BD-14). 나침반은 그 아래. */}
        <View
          style={[styles.topOverlay, { top: topInset }]}
          pointerEvents='box-none'
          onLayout={handleTopOverlayAreaLayout}
        >
          {/* 오프라인: 저장본이 있으면 "저장된 지도" 줄(로드 실패와 겹쳐도 남긴다), 없으면 "저장되지 않았어요" —
            저장본 없이 끊긴 지도의 로드 실패는 이 줄이 이미 설명한다. */}
          {isOffline && hasSavedSnapshot === true ? (
            <OfflineSnapshotBandView
              label={l10n.t('offline.map.offlineLine')}
            />
          ) : null}
          {isOffline && hasSavedSnapshot === false ? (
            <MapNoticeLineView label={l10n.t('offline.detail.notSaved')} />
          ) : null}
          {isLoadFailed && (!isOffline || hasSavedSnapshot !== false) ? (
            <MapNoticeLineView label={l10n.t('map.loadFailed')} />
          ) : null}
          {showFilterChips ? (
            <View style={styles.chips}>
              <PointFilterChipsView
                selectedType={bagPointList.getSelectedType()}
                onSelectType={type => bagPointList.selectType(type)}
                onMap
              />
            </View>
          ) : null}
        </View>

        {/* 지도 아래쪽 오버레이 — 내 위치·포인트 추가 밑에 카드가 붙는다(버튼을 가리지 않게 한 칸에 쌓는다). */}
        <Animated.View
          style={[styles.bottomOverlay, bottomOverlayStyle]}
          pointerEvents='box-none'
          onLayout={handleBottomOverlayLayout}
        >
          {isAiming ? null : (
            // 우측 지도 컨트롤 — `3D`(RR-1) + 내 위치(BD-11) + `포인트 추가` 보조 알약(BD-14).
            <View style={styles.controlStack} pointerEvents='box-none'>
              {/* `3D`는 라임이 아니다 — 이 화면의 주 액션은 `코스 추가` 하나다(HM-8). */}
              {showReplayButton ? (
                <TouchableOpacity
                  style={styles.replayButton}
                  onPress={handleOpenReplay}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={l10n.t('routeReplay.openFromActivity')}
                >
                  <Ionicons name='cube-outline' size={18} color={Acg.ink} />
                  <PretendardText weight='semibold' style={styles.controlLabel}>
                    {l10n.t('routeReplay.badge')}
                  </PretendardText>
                </TouchableOpacity>
              ) : null}
              <MapMyLocationButtonView
                mode={myLocationMode}
                locateLabel={l10n.t('route.myLocation')}
                onPress={() => void handlePressMyLocation()}
              />
              {canEdit ? (
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
              ) : null}
            </View>
          )}
          {/* 카드 칸 — 높이를 재서 출처 표기를 그 위로 올린다(라이선스 의무, MAP-1). */}
          <View pointerEvents='box-none' onLayout={handleCardSlotLayout}>
            {renderCard()}
          </View>
        </Animated.View>
      </View>

      {/* 하단 바텀 시트(BD-11) — 손잡이 + 세그먼트(끄는 영역) · 고도 그래프 · 목록. 조준 모드에서는 내려간다. */}
      <BagRouteBottomSheetView
        ref={sheetRef}
        detents={detents}
        initialDetent={initialSheetDetent}
        animatedHeight={sheetHeightValue}
        onHeightChange={handleSheetHeightChange}
        onDetentChange={handleSheetDetentChange}
        visible={!isAiming}
        header={<View style={styles.sheetHeader}>{listHeader}</View>}
      >
        {/* 고도가 없는 코스는 그래프 자리를 아예 비운다 — 빈 틀은 "데이터를 못 불러왔다"로 읽힌다. */}
        {profile ? (
          <Animated.View style={[styles.graphSlot, graphSlotStyle]}>
            {/* 칸이 접혀도 그래프는 제 높이로 그려 둔다(잘릴 뿐) — 그 높이가 기본 단 계산에 들어간다. */}
            <View onLayout={handleGraphLayout}>
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
            </View>
          </Animated.View>
        ) : null}
        {listContent}
      </BagRouteBottomSheetView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  // 지도는 화면을 다 쓴다 — 그래프·목록은 그 위에 얹힌 바텀 시트다(BD-11).
  mapSection: {
    flex: 1,
    overflow: 'hidden',
    // 지도가 붙기 전·저장 영역 밖은 지면색(OF-6 — 타일이 없으면 빈 지면으로 보인다).
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
  // 지도 위 원형 컨트롤 세로 스택(우측 16 — 그룹 지도와 같은 자리 규칙).
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
  // `3D` — 지도 위 흰 보조 알약(`포인트 추가`와 같은 면·그림자, 라벨이 짧아 패딩만 좁다).
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

export default observer(BagRouteMapView);
