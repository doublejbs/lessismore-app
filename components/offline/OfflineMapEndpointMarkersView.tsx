import { FC } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import { ROUTE_ENDPOINT_LABELS } from '@/model/route/RouteEndpointLabels';

interface Props {
  // 시작·끝을 표시할 코스 — 선택된 코스 하나다(`RouteEndpointMarkersView`와 같은 규칙).
  route: RouteDisplay | null;
}

/**
 * 오프라인 코스 지도의 시작·끝 말풍선 (OF-6 · GRP-8). 꼬리 끝이 좌표를 가리키므로 아래 가운데에 붙인다.
 * 뒤집으면 두 마커의 자리가 바뀐다(뒤집힌 좌표의 첫 점이 시작이다). 끝을 먼저 그려 순환 코스에서
 * 두 끝이 겹치면 시작이 위에 온다.
 */
const OfflineMapEndpointMarkersView: FC<Props> = ({ route }) => {
  const coordinates = route?.getSimplified() ?? [];

  if (!route || coordinates.length < 2) {
    return null;
  }

  const labels = ROUTE_ENDPOINT_LABELS[app.getL10n().language];
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  // 방향이 바뀌면 마커를 새로 붙인다 — 같은 id로 좌표만 바꾸면 이전 자리에 남는 경우가 있다.
  const keyPrefix = `${route.getId()}:${route.isReversed() ? 'r' : 'f'}`;

  return (
    <>
      <Marker
        key={`${keyPrefix}:end`}
        id={`offline-endpoint-${keyPrefix}-end`}
        lngLat={[end.lng, end.lat]}
        anchor='bottom'
      >
        <Image
          source={labels.end.source}
          style={[
            styles.label,
            { width: labels.end.width, height: labels.end.height },
          ]}
          accessible
          accessibilityRole='image'
          accessibilityLabel={app.getL10n().t('route.endpoint.end')}
        />
      </Marker>
      <Marker
        key={`${keyPrefix}:start`}
        id={`offline-endpoint-${keyPrefix}-start`}
        lngLat={[start.lng, start.lat]}
        anchor='bottom'
      >
        <Image
          source={labels.start.source}
          style={[
            styles.label,
            { width: labels.start.width, height: labels.start.height },
          ]}
          accessible
          accessibilityRole='image'
          accessibilityLabel={app.getL10n().t('route.endpoint.start')}
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

export default observer(OfflineMapEndpointMarkersView);
