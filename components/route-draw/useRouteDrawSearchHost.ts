import { RefObject, useCallback, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { AppMapCoordinate, AppMapViewRef } from '@/components/map/AppMapView';
import {
  CAMERA_MOVE_DURATION,
  NO_CAMERA_PADDING,
} from '@/components/map/MapConstants';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import RouteDraw from '@/model/route-draw/RouteDraw';

// 검색 결과로 옮길 때의 줌(RD-5) — 들머리·봉우리 둘레가 한눈에 들어오는 정도.
const SEARCH_RESULT_ZOOM = 15;

interface Input {
  routeDraw: RouteDraw;
  mapRef: RefObject<AppMapViewRef | null>;
  // 방향 모드의 따라가기를 푼다 — 다음 나침반 값이 카메라를 내 위치로 되돌리지 않게.
  releaseFollow: () => void;
  // 그리기 모드에서 지도 아래를 덮는 하단 바 높이(`useRouteDrawHostLayout.getDrawingBottomPadding`).
  // 모드가 아니면 `null` — 그때는 아래 여백을 두지 않는다.
  getDrawingBottomPadding: () => number | null;
}

/**
 * 코스 그리기 지도 화면(배낭 코스·그룹 지도)의 **위치 검색 연결** (RD-5). 두 화면이 같은 규칙이다.
 *
 * - `handleSelectSearchResult`: 결과 행 탭 → 카메라만 그 자리로(줌 15, 하단 바 높이만큼 아래 여백), 결과·키보드를 닫고 임시 핀을 둔다.
 *   점은 찍지 않는다.
 * - `handleDrawingMapPress`: 그리기 모드의 지도 탭. 결과가 열려 있으면 결과·키보드만 닫고 점을 찍지 않는다
 *   (닫으려는 탭이 점이 되지 않게). 아니면 점을 찍는다(임시 핀은 `RouteDraw.addPoint`가 지운다).
 */
const useRouteDrawSearchHost = ({
  routeDraw,
  mapRef,
  releaseFollow,
  getDrawingBottomPadding,
}: Input) => {
  // 화면을 떠나면 대기 중인 디바운스 타이머를 걷는다 — 버려진 모델에 결과를 쓰지 않게.
  useEffect(() => () => routeDraw.getSearch().clear(), [routeDraw]);

  const handleSelectSearchResult = useCallback(
    (result: GeocodeResult) => {
      Keyboard.dismiss();
      routeDraw.getSearch().select(result);
      releaseFollow();
      mapRef.current?.animateTo({
        latitude: result.latitude,
        longitude: result.longitude,
        zoom: SEARCH_RESULT_ZOOM,
        duration: CAMERA_MOVE_DURATION,
        // 하단 바가 덮는 높이를 비워 핀이 보이는 지도 칸 가운데에 오게 한다.
        padding: {
          ...NO_CAMERA_PADDING,
          bottom: getDrawingBottomPadding() ?? 0,
        },
      });
    },
    [getDrawingBottomPadding, mapRef, releaseFollow, routeDraw]
  );

  const handleDrawingMapPress = useCallback(
    (coordinate: AppMapCoordinate) => {
      const search = routeDraw.getSearch();

      if (search.isResultsVisible()) {
        search.closeResults();
        Keyboard.dismiss();

        return;
      }

      // 결과는 닫혔어도 키보드가 떠 있을 수 있다 — 점을 찍으며 함께 내린다.
      Keyboard.dismiss();
      routeDraw.addPoint(coordinate);
    },
    [routeDraw]
  );

  return { handleSelectSearchResult, handleDrawingMapPress };
};

export default useRouteDrawSearchHost;
