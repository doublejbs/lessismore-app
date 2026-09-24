import { FC } from 'react';
import { NaverMapPathOverlay } from '@mj-studio/react-native-naver-map';
import { observer } from 'mobx-react-lite';
import { RouteDisplay } from '@/model/route/RouteDisplay';

interface Props {
  routes: readonly RouteDisplay[];
  // 굵게 그릴 코스. 코스가 하나뿐이면 선택 없이도 그 코스가 주인공이다(GRP-10).
  selectedRouteId: string | null;
  /**
   * 모든 코스를 선택된 굵기로 그린다 — 그룹 상세 지도 밴드처럼 선택 개념이 없는 보기 전용
   * 지도에서 쓴다(GRP-7). 옅게 그린 선은 "고르지 않은 코스"라는 뜻인데, 고를 수 없는 곳에서는
   * 그 구분이 말하는 것이 없다.
   */
  uniform?: boolean;
}

/**
 * 코스 폴리라인 색. 데이터 시각화 색이라 토큰 예외로 하드코딩한다(CLAUDE.md).
 * 고도 그래프의 단면 색과 **같은 파랑**이다 — 그래프와 지도가 한 코스를 가리키므로
 * 색이 갈리면 훑는 동안 둘이 같은 것이라는 단서가 사라진다.
 */
const ROUTE_COLOR = '#2F6BFF';
const ROUTE_DIM_COLOR = 'rgba(47, 107, 255, 0.3)';
const ROUTE_OUTLINE_COLOR = '#FFFFFF';
const ROUTE_WIDTH = 6;
const ROUTE_DIM_WIDTH = 4;
const ROUTE_OUTLINE_WIDTH = 2;

/** 경로선은 좌표가 2개 미만이면 지도에 추가되지 않는다(라이브러리 제약). */
const MIN_PATH_COORDS = 2;

/**
 * 지도 위 코스 폴리라인 (GRP-8·GRP-10, BD-11).
 *
 * 그룹 지도와 배낭 코스 화면이 **같은 선**을 그린다 — 선 굵기·색·강조 규칙을 두 곳에 두면
 * 한쪽만 고쳐질 때 같은 코스가 화면에 따라 다르게 보인다.
 * `NaverMapView`의 자식으로 둔다(마커 레이어와 같은 방식).
 *
 * observer다 — 좌표는 **지금 보는 방향** 순서라(GRP-8 뒤집기) 기기 설정이 바뀌면 다시 그린다.
 */
const RoutePathOverlayView: FC<Props> = ({
  routes,
  selectedRouteId,
  uniform = false,
}) => {
  return (
    <>
      {routes.map(route => {
        const coords = route.getSimplified().map(coordinate => ({
          latitude: coordinate.lat,
          longitude: coordinate.lng,
        }));

        if (coords.length < MIN_PATH_COORDS) {
          return null;
        }

        const isSelected =
          uniform || routes.length === 1 || route.getId() === selectedRouteId;

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
    </>
  );
};

export default observer(RoutePathOverlayView);
