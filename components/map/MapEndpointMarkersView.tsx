import { FC } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import { RouteCoordinate } from '@/model/route/RouteData';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import RouteEndpointKind from '@/model/route/RouteEndpointKind';
import { ROUTE_ENDPOINT_LABELS } from '@/model/route/RouteEndpointLabels';

interface Props {
  /**
   * 시작·끝을 표시할 코스 — **선택된 코스 하나**다. 옅게 그린 코스에까지 마커를 달면 코스 수 × 2개의
   * 마커가 지도를 덮고, 어느 끝이 어느 선의 것인지도 읽히지 않는다.
   */
  route: RouteDisplay | null;
  // 마커를 누르면 그 끝점의 위치 정보 카드를 띄운다(GRP-8). 없으면 누를 수 없는 표식이다.
  onTapEndpoint?: (kind: RouteEndpointKind, coordinate: RouteCoordinate) => void;
}

/**
 * 코스 시작·끝 말풍선 (MAP-2 · GRP-8 · BD-11 · OF-6). 꼬리 끝이 좌표를 가리키므로 아래 가운데에 붙인다.
 *
 * 뒤집으면 두 마커의 자리가 바뀐다(뒤집힌 좌표의 첫 점이 시작이다). 끝을 먼저 그려 순환 코스에서 두 끝이
 * 겹치면 시작이 위에 온다. 글자와 면으로 가른다(색각 이상 대응) — 시작 = 잉크 말풍선 + 흰 `출발`,
 * 끝 = 흰 말풍선 + 잉크 테두리·`도착`. 언어별 이미지는 `ROUTE_ENDPOINT_LABELS`.
 */
const MapEndpointMarkersView: FC<Props> = ({ route, onTapEndpoint }) => {
  const coordinates = route?.getSimplified() ?? [];

  if (!route || coordinates.length < 2) {
    return null;
  }

  const l10n = app.getL10n();
  const labels = ROUTE_ENDPOINT_LABELS[l10n.language];
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  // 방향이 바뀌면 마커를 새로 붙인다 — 같은 id로 좌표만 바꾸면 이전 자리에 남는 경우가 있다.
  const keyPrefix = `${route.getId()}:${route.isReversed() ? 'r' : 'f'}`;
  const isPressable = onTapEndpoint !== undefined;

  return (
    <>
      <Marker
        key={`${keyPrefix}:end`}
        id={`map-endpoint-${keyPrefix}-end`}
        lngLat={[end.lng, end.lat]}
        anchor='bottom'
        {...(onTapEndpoint
          ? { onPress: () => onTapEndpoint(RouteEndpointKind.End, end) }
          : {})}
      >
        <Image
          source={labels.end.source}
          style={[
            styles.label,
            { width: labels.end.width, height: labels.end.height },
          ]}
          accessible
          accessibilityRole={isPressable ? 'button' : 'image'}
          accessibilityLabel={l10n.t('route.endpoint.end')}
        />
      </Marker>
      <Marker
        key={`${keyPrefix}:start`}
        id={`map-endpoint-${keyPrefix}-start`}
        lngLat={[start.lng, start.lat]}
        anchor='bottom'
        {...(onTapEndpoint
          ? { onPress: () => onTapEndpoint(RouteEndpointKind.Start, start) }
          : {})}
      >
        <Image
          source={labels.start.source}
          style={[
            styles.label,
            { width: labels.start.width, height: labels.start.height },
          ]}
          accessible
          accessibilityRole={isPressable ? 'button' : 'image'}
          accessibilityLabel={l10n.t('route.endpoint.start')}
        />
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    resizeMode: 'contain',
  },
});

export default observer(MapEndpointMarkersView);
