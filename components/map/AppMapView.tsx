import {
  ReactNode,
  Ref,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  Camera,
  CameraRef,
  InitialViewState,
  Map,
  MapRef,
  PressEvent,
  ViewPadding,
  ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { AcgLayout } from '@/constants/DesignTokens';
import {
  boundsToLngLatBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
import MapCameraChangeReason from '@/model/map/MapCameraChangeReason';
import { MAP_STYLE_URL } from '@/model/map/MapStyle';
import { RouteCameraRegion } from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';

export interface AppMapCoordinate {
  latitude: number;
  longitude: number;
}

export interface AppMapCameraPosition {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
}

export interface AppMapCameraChange extends AppMapCameraPosition {
  reason: MapCameraChangeReason;
}

export type AppMapInitialCamera =
  | { latitude: number; longitude: number; zoom: number }
  | { bounds: RouteBounds; padding?: number | ViewPadding };

export interface AppMapAnimateOptions {
  latitude: number;
  longitude: number;
  zoom?: number;
  bearing?: number;
  duration?: number;
  padding?: ViewPadding;
}

export interface AppMapFitBoundsOptions {
  padding?: number | ViewPadding;
  duration?: number;
}

export interface AppMapViewRef {
  animateTo(options: AppMapAnimateOptions): void;
  fitBounds(bounds: RouteBounds, options?: AppMapFitBoundsOptions): void;
  // 네이버 `animateRegionTo` 대체 — 남서 모서리 + 스팬 영역을 여백 없이 맞춘다(`getRouteFitRegion`이 여유를 이미 넣는다).
  fitRegion(region: RouteCameraRegion, duration?: number): void;
  getCenter(): Promise<AppMapCoordinate | null>;
  screenToCoordinate(point: {
    x: number;
    y: number;
  }): Promise<AppMapCoordinate | null>;
}

interface Props {
  style?: StyleProp<ViewStyle>;
  // 지도를 붙일 때의 카메라. 없으면 SDK 기본(세계 전체)이다 — 화면이 정해서 넘긴다.
  initialCamera?: AppMapInitialCamera;
  // false = 제스처 전부 끔(보기 전용 밴드 GRP-7·HA-4). 기본 true.
  interactive?: boolean;
  // 우상단 나침반(북쪽이면 숨김). 기본 true.
  showCompass?: boolean;
  // 축척 막대. 기본 false — 화면이 켠다(MAP-2).
  showScaleBar?: boolean;
  // 좌하단 출처 표기(ODbL 의무)를 이만큼 올린다 — 카드·시트가 그 자리를 덮을 때(MAP-1).
  attributionBottomOffset?: number;
  // 상단 장식(나침반, 안드로이드 축척 막대)의 기준 위치(pt) — 투명 헤더·상단 안내 줄 아래로 내릴 때.
  ornamentTopOffset?: number;
  // 안드로이드 축척 막대의 위 위치(pt). 기본 `ornamentTopOffset`. 안드로이드는 라이브러리 제약으로 좌상단만 된다.
  androidScaleBarTopOffset?: number;
  contentInset?: ViewPadding;
  minZoom?: number;
  maxZoom?: number;
  onInitialized?: () => void;
  onLoadFailed?: () => void;
  onCameraChanged?: (change: AppMapCameraChange) => void;
  onPress?: (coordinate: AppMapCoordinate) => void;
  onLongPress?: (coordinate: AppMapCoordinate) => void;
  children?: ReactNode;
  ref?: Ref<AppMapViewRef>;
}

type CameraCommand = (camera: CameraRef) => void;

const IS_ANDROID = Platform.OS === 'android';
// `fitBounds` 기본 가장자리 여백(pt). 끝점 말풍선·포인트 마커가 잘리지 않게.
const DEFAULT_FIT_PADDING = 40;
// 지도 장식(MapLibre 기본)과 지도 가장자리 사이 여백.
const ORNAMENT_MARGIN = 8;
// 나침반의 오른쪽 여백(지도 위 컨트롤 — 내 위치 버튼과 같은 줄).
const COMPASS_RIGHT_INSET = 16;
// iOS 축척 막대를 출처 표기 위에 둘 때 둘 사이 높이(출처 표기 버튼 높이 + 여백).
const IOS_SCALE_BAR_ABOVE_ATTRIBUTION = 32;

const toViewPadding = (padding: number | ViewPadding): ViewPadding =>
  typeof padding === 'number'
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : padding;

const toInitialViewState = (camera: AppMapInitialCamera): InitialViewState =>
  'bounds' in camera
    ? {
        bounds: boundsToLngLatBounds(camera.bounds),
        padding: toViewPadding(camera.padding ?? DEFAULT_FIT_PADDING),
      }
    : { center: [camera.longitude, camera.latitude], zoom: camera.zoom };

const toCameraChange = (
  event: NativeSyntheticEvent<ViewStateChangeEvent>
): AppMapCameraChange => {
  const { center, zoom, bearing, userInteraction } = event.nativeEvent;

  return {
    latitude: center[1],
    longitude: center[0],
    zoom,
    bearing,
    reason: userInteraction
      ? MapCameraChangeReason.Gesture
      : MapCameraChangeReason.Developer,
  };
};

const toCoordinate = (
  event: NativeSyntheticEvent<PressEvent>
): AppMapCoordinate => ({
  latitude: event.nativeEvent.lngLat[1],
  longitude: event.nativeEvent.lngLat[0],
});

/**
 * 앱 공용 지도 (MAP-1 · MAP-2) — MapLibre `Map` + `Camera`. 모든 지도 화면은 MapLibre를 직접 다루지 않고
 * 이 뷰를 쓴다(스타일 `useless-outdoor`, 로고 끔, 출처 표기 좌하단, 나침반 우상단·북쪽이면 숨김, 기울이기 끔 —
 * 네이티브 MapLibre에는 3D 지형이 없다, 회전 허용).
 *
 * - `onCameraChanged`는 이동 시작·진행·끝마다 부른다. 손 조작(`userInteraction`)이면 `Gesture`, 아니면
 *   `Developer` — 방향 모드 훅(`useMyLocationHeadingMode`)이 손 조작 **시작 시점**에 따라가기를 풀어야 한다.
 * - ref의 카메라 명령은 `Camera`가 아직 붙지 않았으면 모아 두었다가 붙는 순간 차례로 실행한다.
 * - 이 파일은 MapLibre를 정적 import한다 — 옛 바이너리(MapLibre 없음) 방어는 화면 쪽 게이트
 *   (`isMapLibreAvailable`)가 맡는다. 웹은 `AppMapView.web.tsx`(지도 없음, APP-5).
 */
const AppMapView = ({
  style,
  initialCamera,
  interactive = true,
  showCompass = true,
  showScaleBar = false,
  attributionBottomOffset = 0,
  ornamentTopOffset = ORNAMENT_MARGIN,
  androidScaleBarTopOffset,
  contentInset,
  minZoom,
  maxZoom,
  onInitialized,
  onLoadFailed,
  onCameraChanged,
  onPress,
  onLongPress,
  children,
  ref,
}: Props) => {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const pendingCommandsRef = useRef<CameraCommand[]>([]);
  // 지도를 붙일 때 한 번만 읽는다 — 이후 바뀌어도 카메라를 옮기지 않는다(옮기는 것은 ref 명령).
  const [initialViewState] = useState<InitialViewState | null>(() =>
    initialCamera ? toInitialViewState(initialCamera) : null
  );

  const runCameraCommand = useCallback((command: CameraCommand) => {
    const camera = cameraRef.current;

    if (camera) {
      command(camera);

      return;
    }

    pendingCommandsRef.current.push(command);
  }, []);

  const handleCameraRef = useCallback((camera: CameraRef | null) => {
    cameraRef.current = camera;

    if (!camera || pendingCommandsRef.current.length === 0) {
      return;
    }

    const commands = pendingCommandsRef.current;

    pendingCommandsRef.current = [];
    commands.forEach(command => command(camera));
  }, []);

  useImperativeHandle(
    ref,
    (): AppMapViewRef => ({
      animateTo: ({ latitude, longitude, zoom, bearing, duration, padding }) => {
        runCameraCommand(camera =>
          camera.easeTo({
            center: [longitude, latitude],
            ...(zoom !== undefined ? { zoom } : {}),
            ...(bearing !== undefined ? { bearing } : {}),
            ...(duration !== undefined ? { duration } : {}),
            ...(padding ? { padding } : {}),
          })
        );
      },
      fitBounds: (bounds, options) => {
        runCameraCommand(camera =>
          camera.fitBounds(boundsToLngLatBounds(bounds), {
            padding: toViewPadding(options?.padding ?? DEFAULT_FIT_PADDING),
            ...(options?.duration !== undefined
              ? { duration: options.duration }
              : {}),
          })
        );
      },
      fitRegion: (region, duration) => {
        runCameraCommand(camera =>
          camera.fitBounds(regionToLngLatBounds(region), {
            padding: toViewPadding(0),
            ...(duration !== undefined ? { duration } : {}),
          })
        );
      },
      getCenter: async () => {
        try {
          const center = await mapRef.current?.getCenter();

          return center ? { latitude: center[1], longitude: center[0] } : null;
        } catch {
          return null;
        }
      },
      screenToCoordinate: async ({ x, y }) => {
        try {
          const lngLat = await mapRef.current?.unproject([x, y]);

          return lngLat ? { latitude: lngLat[1], longitude: lngLat[0] } : null;
        } catch {
          return null;
        }
      },
    }),
    [runCameraCommand]
  );

  const handleRegionChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      onCameraChanged?.(toCameraChange(event));
    },
    [onCameraChanged]
  );

  const handlePress = useCallback(
    (event: NativeSyntheticEvent<PressEvent>) => {
      onPress?.(toCoordinate(event));
    },
    [onPress]
  );

  const handleLongPress = useCallback(
    (event: NativeSyntheticEvent<PressEvent>) => {
      onLongPress?.(toCoordinate(event));
    },
    [onLongPress]
  );

  const handleDidFinishLoadingMap = useCallback(() => {
    onInitialized?.();
  }, [onInitialized]);

  const handleDidFailLoadingMap = useCallback(() => {
    onLoadFailed?.();
  }, [onLoadFailed]);

  const attributionBottom = ORNAMENT_MARGIN + attributionBottomOffset;
  const ornaments = useMemo(
    () => ({
      attributionPosition: { bottom: attributionBottom, left: ORNAMENT_MARGIN },
      compassPosition: { top: ornamentTopOffset, right: COMPASS_RIGHT_INSET },
      scaleBarPosition: IS_ANDROID
        ? {
            top: androidScaleBarTopOffset ?? ornamentTopOffset,
            left: AcgLayout.screenPadding,
          }
        : {
            bottom: attributionBottom + IOS_SCALE_BAR_ABOVE_ATTRIBUTION,
            left: ORNAMENT_MARGIN,
          },
    }),
    [androidScaleBarTopOffset, attributionBottom, ornamentTopOffset]
  );

  return (
    <Map
      ref={mapRef}
      style={[styles.map, style]}
      mapStyle={MAP_STYLE_URL}
      attribution
      attributionPosition={ornaments.attributionPosition}
      logo={false}
      compass={showCompass}
      compassPosition={ornaments.compassPosition}
      compassHiddenFacingNorth
      scaleBar={showScaleBar}
      scaleBarPosition={ornaments.scaleBarPosition}
      touchPitch={false}
      dragPan={interactive}
      touchZoom={interactive}
      touchRotate={interactive}
      doubleTapZoom={interactive}
      doubleTapHoldZoom={interactive}
      {...(contentInset ? { contentInset } : {})}
      {...(onPress ? { onPress: handlePress } : {})}
      {...(onLongPress ? { onLongPress: handleLongPress } : {})}
      {...(onCameraChanged
        ? {
            onRegionWillChange: handleRegionChange,
            onRegionIsChanging: handleRegionChange,
            onRegionDidChange: handleRegionChange,
          }
        : {})}
      onDidFinishLoadingMap={handleDidFinishLoadingMap}
      onDidFailLoadingMap={handleDidFailLoadingMap}
    >
      <Camera
        ref={handleCameraRef}
        {...(minZoom !== undefined ? { minZoom } : {})}
        {...(maxZoom !== undefined ? { maxZoom } : {})}
        {...(initialViewState ? { initialViewState } : {})}
      />
      {children}
    </Map>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

export default AppMapView;
