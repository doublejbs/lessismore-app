import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import app from '@/model/app/App';
import geocodeService, {
  FALLBACK_LOCATION_NAME,
} from '@/model/bag-destination/GeocodeService';
import { RouteCoordinate } from '@/model/route/RouteData';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import RouteEndpointInfo, {
  RouteEndpoint,
} from '@/model/route/RouteEndpointInfo';
import RouteEndpointKind from '@/model/route/RouteEndpointKind';

interface Params {
  // 마커를 단 코스 — 화면이 지금 강조하는 코스 하나다(`RouteEndpointMarkersView`와 같은 값).
  route: RouteDisplay | null;
  /**
   * 누른 끝점으로 카메라를 옮긴다. 줌은 유지한다(포인트 탭과 같다, GRP-8).
   * `pivot`은 좌표가 놓일 지도 안의 비율 위치(0~1)다 — 화면 가운데가 아니라 카드 **위** 빈 자리다.
   */
  moveCamera: (
    coordinate: RouteCoordinate,
    pivot: { x: number; y: number }
  ) => void;
  // 끝점을 고를 때 다른 카드(그룹 지도의 포인트 카드)를 닫는다 — 둘은 동시에 뜨지 않는다.
  onSelect?: () => void;
}

// 카드가 자리를 잡을 때까지 기다리는 최대 시간. 레이아웃 이벤트가 오지 않아도(카드 높이가 같을 때) 옮긴다.
const CAMERA_MOVE_FALLBACK_MS = 300;
// 말풍선 마커 높이(pt, `RouteEndpointMarkersView`). 꼬리 끝이 좌표라 말풍선은 좌표 위로 선다.
const MARKER_HEIGHT = 36;
const PIVOT_MIN = 0.1;
const PIVOT_MAX = 0.9;

/**
 * 코스 출발·도착 마커 탭 → 위치 정보 카드 (GRP-8). 그룹 지도와 배낭 코스 화면이 같이 쓴다.
 * 모델은 화면 수명 동안 한 번만 만든다 — 역지오코딩 캐시가 이 수명을 따른다.
 */
export const useRouteEndpointState = ({
  route,
  moveCamera,
  onSelect,
}: Params) => {
  const [endpointInfo] = useState(() =>
    RouteEndpointInfo.from(
      geocodeService.reverseGeocode,
      FALLBACK_LOCATION_NAME,
      app.getL10n(),
      app.getToastManager() ?? null
    )
  );
  const endpoint: RouteEndpoint | null = endpointInfo.getEndpoint(route);
  /**
   * 카메라 목표를 카드 위 빈 자리에 두려고 지도·오버레이의 자리를 기억한다(지도 좌표계, pt).
   * 카드는 지도 아래쪽을 덮으므로 가운데로 옮기면 누른 마커가 카드 밑에 숨는다.
   */
  const mapHeightRef = useRef(0);
  const visibleTopRef = useRef(0);
  const visibleBottomRef = useRef<number | null>(null);
  const pendingRef = useRef<RouteCoordinate | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushCameraMove = useCallback(() => {
    const coordinate = pendingRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!coordinate) {
      return;
    }

    pendingRef.current = null;

    const mapHeight = mapHeightRef.current;
    const visibleTop = visibleTopRef.current;
    const visibleBottom = visibleBottomRef.current ?? mapHeight;

    if (mapHeight <= 0 || visibleBottom <= visibleTop) {
      moveCamera(coordinate, { x: 0.5, y: 0.5 });

      return;
    }

    // 말풍선 가운데가 빈 자리 가운데에 오게 좌표(꼬리 끝)를 반 마커만큼 내린다.
    const targetY =
      visibleTop + (visibleBottom - visibleTop) / 2 + MARKER_HEIGHT / 2;
    const pivotY = Math.min(
      PIVOT_MAX,
      Math.max(PIVOT_MIN, targetY / mapHeight)
    );

    moveCamera(coordinate, { x: 0.5, y: pivotY });
  }, [moveCamera]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMapLayout = useCallback((event: LayoutChangeEvent) => {
    mapHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  // 지도 위쪽을 덮는 오버레이(필터 칩 등)의 아래 끝. 없으면 지도 맨 위다.
  const handleTopOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;

    visibleTopRef.current = y + height;
  }, []);

  /**
   * 지도 아래쪽을 덮는 오버레이(카드·버튼)의 위 끝. 카드가 뜨면 이 값이 바뀌므로 그때 카메라를 옮긴다 —
   * 카드 높이(주소 줄 유무)를 재고 난 뒤라야 빈 자리를 안다.
   */
  const handleBottomOverlayLayout = useCallback(
    (event: LayoutChangeEvent) => {
      visibleBottomRef.current = event.nativeEvent.layout.y;

      if (pendingRef.current) {
        flushCameraMove();
      }
    },
    [flushCameraMove]
  );

  const handleTapEndpoint = useCallback(
    (kind: RouteEndpointKind) => {
      if (!route) {
        return;
      }

      const coordinate = RouteEndpointInfo.resolveCoordinate(route, kind);

      if (!coordinate) {
        return;
      }

      onSelect?.();
      endpointInfo.select(route, kind);
      pendingRef.current = coordinate;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 카드가 이미 떠 있어 높이가 그대로면 레이아웃 이벤트가 오지 않는다 — 그때는 아는 값으로 옮긴다.
      timeoutRef.current = setTimeout(flushCameraMove, CAMERA_MOVE_FALLBACK_MS);
    },
    [endpointInfo, flushCameraMove, onSelect, route]
  );

  const handleCloseEndpoint = useCallback(() => {
    endpointInfo.clear();
  }, [endpointInfo]);

  return {
    endpointInfo,
    endpoint,
    handleTapEndpoint,
    handleCloseEndpoint,
    handleMapLayout,
    handleTopOverlayLayout,
    handleBottomOverlayLayout,
  };
};
