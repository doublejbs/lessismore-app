import { RefObject, useEffect, useRef } from 'react';
import { AppMapViewRef } from '@/components/map/AppMapView';
import {
  CAMERA_MOVE_DURATION,
  NO_CAMERA_PADDING,
} from '@/components/map/MapConstants';
import RouteDraw from '@/model/route-draw/RouteDraw';

// 여행지로 옮길 때의 줌(RD-9 #2) — 들머리·주변 능선이 함께 들어오는 정도(검색 결과 15보다 한 단 넓다).
const START_FOCUS_ZOOM = 13;

interface Input {
  routeDraw: RouteDraw;
  mapRef: RefObject<AppMapViewRef | null>;
  // 방향 모드의 따라가기를 푼다 — 다음 나침반 값이 카메라를 내 위치로 되돌리지 않게.
  releaseFollow: () => void;
  // 그리기 모드 하단 바 높이(`useRouteDrawHostLayout`). 재기 전에는 0이다.
  drawBarHeight: number;
}

/**
 * 새로 그리기 시작 카메라 (RD-9 #2) — 배낭 코스·그룹 지도 공용. 그리기 모델이 남긴 시작 카메라 요청
 * (`RouteDraw.getStartCamera`)을 **한 번** 따라 여행지로 옮긴다(줌 13). 하단 바가 지도 아래를 덮으므로 바 높이만큼
 * 아래 여백을 준다 — 바는 모드에 들어간 뒤에야 그려져 높이를 잴 수 있어, 높이를 잰 다음 프레임에 옮긴다.
 * 요청마다 `seq`가 달라 같은 여행지로 다시 그려도 다시 옮긴다.
 */
const useRouteDrawStartCamera = ({
  routeDraw,
  mapRef,
  releaseFollow,
  drawBarHeight,
}: Input) => {
  const startCamera = routeDraw.getStartCamera();
  const handledSeqRef = useRef(0);

  useEffect(() => {
    if (!startCamera || drawBarHeight <= 0) {
      return;
    }

    if (handledSeqRef.current === startCamera.seq) {
      return;
    }

    handledSeqRef.current = startCamera.seq;
    releaseFollow();
    mapRef.current?.animateTo({
      latitude: startCamera.latitude,
      longitude: startCamera.longitude,
      zoom: START_FOCUS_ZOOM,
      duration: CAMERA_MOVE_DURATION,
      padding: { ...NO_CAMERA_PADDING, bottom: drawBarHeight },
    });
  }, [drawBarHeight, mapRef, releaseFollow, startCamera]);
};

export default useRouteDrawStartCamera;
