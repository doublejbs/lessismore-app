import { FC } from 'react';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { observer } from 'mobx-react-lite';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import RouteEndpointKind from '@/model/route/RouteEndpointKind';
import { ROUTE_ENDPOINT_LABELS } from '@/model/route/RouteEndpointLabels';
import app from '@/model/app/App';

interface Props {
  /**
   * 시작·끝을 표시할 코스 — **선택된 코스 하나**다. 여러 코스를 그릴 때 옅게 그린 코스에까지
   * 마커를 달면 코스 수 × 2개의 마커가 지도를 덮고, 어느 끝이 어느 선의 것인지도 읽히지 않는다.
   */
  route: RouteDisplay | null;
  // 마커를 누르면 그 끝점의 위치 정보 카드를 띄운다(GRP-8). 없으면 누를 수 없는 표식이다.
  onTapEndpoint?: (kind: RouteEndpointKind) => void;
}

const LABEL_ANCHOR = { x: 0.5, y: 1 };

/**
 * 코스 시작·끝 마커 (GRP-8, BD-11). 그룹 지도와 배낭 코스 화면이 **같은 마커**를 쓴다.
 *
 * 방향이 지도에 보이지 않으면 뒤집기가 그래프에만 반영되고 지도에는 아무 변화가 없다 —
 * 그래서 양끝을 표시하고, 뒤집으면 두 마커의 자리가 바뀐다(뒤집힌 좌표의 첫 점이 시작이다).
 *
 * **글자와 면으로 가른다(색각 이상 대응)**: 시작 = 잉크 말풍선 + 흰 `출발`, 끝 = 흰 말풍선 + 잉크 테두리·`도착`.
 * 지도 위의 다른 표식은 전부 원이다 — 등록 포인트(유형 색 원 + 아이콘), 훑기 마커(흰 원 + 잉크 점),
 * 조준 마커(빈 원 + 조준선), 내 위치(파란 점) — 그래서 두 끝점은 원이 아닌 말풍선이다.
 * 라임은 쓰지 않는다(화면의 주 액션 `포인트 추가`가 라임이다, HM-8).
 */
const RouteEndpointMarkersView: FC<Props> = ({ route, onTapEndpoint }) => {
  const coordinates = route?.getSimplified() ?? [];

  if (!route || coordinates.length < 2) {
    return null;
  }

  const labels = ROUTE_ENDPOINT_LABELS[app.getL10n().language];
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
        anchor={LABEL_ANCHOR}
        width={labels.end.width}
        height={labels.end.height}
        image={labels.end.source}
        // 폴리라인 위, 훑기 마커(2)·포인트 아래. 순환 코스라 두 끝이 겹치면 시작이 위다.
        zIndex={1}
        {...(onTapEndpoint
          ? { onTap: () => onTapEndpoint(RouteEndpointKind.End) }
          : {})}
      />
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:start`}
        latitude={start.lat}
        longitude={start.lng}
        anchor={LABEL_ANCHOR}
        width={labels.start.width}
        height={labels.start.height}
        image={labels.start.source}
        zIndex={1}
        {...(onTapEndpoint
          ? { onTap: () => onTapEndpoint(RouteEndpointKind.Start) }
          : {})}
      />
    </>
  );
};

export default observer(RouteEndpointMarkersView);
