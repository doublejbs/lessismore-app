import { FC } from 'react';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { observer } from 'mobx-react-lite';
import { RouteDisplay } from '@/model/route/RouteDisplay';

interface Props {
  /**
   * 시작·끝을 표시할 코스 — **선택된 코스 하나**다. 여러 코스를 그릴 때 옅게 그린 코스에까지
   * 마커를 달면 코스 수 × 2개의 마커가 지도를 덮고, 어느 끝이 어느 선의 것인지도 읽히지 않는다.
   */
  route: RouteDisplay | null;
}

// 이미지 캔버스 크기(pt). 끝점은 마름모(45° 돌린 사각형)라 외접 폭이 √2배라 더 크다.
const START_MARKER_SIZE = 30;
const END_MARKER_SIZE = 34;
// 커스텀 View 마커는 네이버 지도가 스냅숏으로 굳히면서 아이콘 글꼴(Ionicons) 글리프가 빠진 채
// 검은 도형만 남았다(2026-09-29 실기기) — 글리프를 그려 넣은 PNG를 마커 이미지로 쓴다.
// 1x/2x/3x가 `assets/images/route/`에 있고 require는 기기 배율에 맞는 것을 고른다.
const START_MARKER_IMAGE = require('@/assets/images/route/route-start.png');
const END_MARKER_IMAGE = require('@/assets/images/route/route-end.png');

/**
 * 코스 시작·끝 마커 (GRP-8, BD-11). 그룹 지도와 배낭 코스 화면이 **같은 마커**를 쓴다.
 *
 * 방향이 지도에 보이지 않으면 뒤집기가 그래프에만 반영되고 지도에는 아무 변화가 없다 —
 * 그래서 양끝을 표시하고, 뒤집으면 두 마커의 자리가 바뀐다(뒤집힌 좌표의 첫 점이 시작이다).
 *
 * **모양으로 가른다(색각 이상 대응)**: 시작 = 둥근 사각형 + 재생(▶) 아이콘, 끝 = 마름모 + 깃발 아이콘.
 * 지도 위의 다른 표식은 전부 원이다 — 등록 포인트(유형 색 원 + 아이콘), 훑기 마커(흰 원 + 잉크 점),
 * 조준 마커(빈 원 + 조준선), 내 위치(파란 점) — 그래서 두 끝점은 원을 쓰지 않는다.
 * 색은 잉크(면) + 흰 테두리 하나로 두고 코스 파랑과 겹치지 않게 한다.
 */
const RouteEndpointMarkersView: FC<Props> = ({ route }) => {
  const coordinates = route?.getSimplified() ?? [];

  if (!route || coordinates.length < 2) {
    return null;
  }

  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  // 방향이 바뀌면 마커를 새로 붙인다 — 같은 키로 좌표만 바꾸면 이전 자리에 남는 경우가 있다.
  const keyPrefix = `${route.getId()}:${route.isReversed() ? 'r' : 'f'}`;

  return (
    <>
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:end`}
        latitude={end.lat}
        longitude={end.lng}
        anchor={{ x: 0.5, y: 0.5 }}
        width={END_MARKER_SIZE}
        height={END_MARKER_SIZE}
        image={END_MARKER_IMAGE}
        // 폴리라인 위, 훑기 마커(2)·포인트 아래. 순환 코스라 두 끝이 겹치면 시작이 위다.
        zIndex={1}
      />
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:start`}
        latitude={start.lat}
        longitude={start.lng}
        anchor={{ x: 0.5, y: 0.5 }}
        width={START_MARKER_SIZE}
        height={START_MARKER_SIZE}
        image={START_MARKER_IMAGE}
        zIndex={1}
      />
    </>
  );
};

export default observer(RouteEndpointMarkersView);
