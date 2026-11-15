import { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import {
  MY_LOCATION_BLUE,
  MY_LOCATION_HALO,
} from '@/components/map/MyLocationColor';
import { Acg } from '@/constants/DesignTokens';
import {
  CompassHeading,
  normalizeDegrees,
} from '@/model/location/CompassHeading';

interface Props {
  latitude: number;
  longitude: number;
  // 방향 모드(BD-11 · GRP-10)에서 바라보는 방향(진북 기준). 있으면 파란 점에 방향 부채꼴을 붙인다.
  heading?: CompassHeading | null | undefined;
  // 지금 지도의 방위(도). 마커는 화면에 서 있는 뷰라 부채꼴을 진북 기준으로 두려면 이만큼 빼서 돌린다. 기본 0.
  mapBearing?: number;
}

// 방향 부채꼴 이미지 — 위(북)를 향하고 꼭짓점이 정중앙이다(88pt, 1x/2x/3x, `assets/images/map/`).
const HEADING_CONE_SIZE = 88;
const HEADING_CONE = require('@/assets/images/map/my-location-heading.png');
// 나침반 정확도가 낮을 때 — 더 넓고 옅은 부채꼴. 방향을 믿기 어렵다는 것을 모양으로 알린다.
const HEADING_CONE_WIDE = require('@/assets/images/map/my-location-heading-wide.png');
const DOT_SIZE = 14;
const DOT_AREA = 26;

/**
 * 내 위치 (MAP-2 · CS-1 · BD-11 · GRP-10) — 파란 점 + 방향 부채꼴. 박지 지도·그룹 지도·배낭 코스 지도가 함께 쓴다.
 * 위치·방향은 `useMyLocationHeadingMode`(또는 화면의 위치 구독)에서 온다.
 *
 * MapLibre `Marker`는 실제 RN 뷰라(스냅숏이 아니다) 부채꼴을 `transform: rotate(heading − mapBearing)`으로
 * 화면 기준 보정해 돌린다 — 지도가 방향 모드로 돌아가 있어도 부채꼴은 실제 방위를 가리킨다.
 * 부채꼴 꼭짓점이 이미지 정중앙이라 마커는 가운데를 좌표에 둔다. 위치 파랑은 지도 관례 의미색(`MyLocationColor`).
 */
const MapMyLocationMarkerView: FC<Props> = ({
  latitude,
  longitude,
  heading,
  mapBearing = 0,
}) => {
  return (
    <Marker id='map-my-location' lngLat={[longitude, latitude]} anchor='center'>
      <View collapsable={false} pointerEvents='none' style={styles.container}>
        {heading ? (
          <Image
            source={heading.isLowAccuracy ? HEADING_CONE_WIDE : HEADING_CONE}
            style={[
              styles.cone,
              {
                transform: [
                  {
                    rotate: `${normalizeDegrees(heading.bearing - mapBearing)}deg`,
                  },
                ],
              },
            ]}
          />
        ) : null}
        <View style={styles.halo} />
        <View style={styles.dot} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: HEADING_CONE_SIZE,
    height: HEADING_CONE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cone: {
    position: 'absolute',
    width: HEADING_CONE_SIZE,
    height: HEADING_CONE_SIZE,
  },
  // 은은한 정확도 후광 — 파란 점 주변을 부드럽게 감싼다.
  halo: {
    position: 'absolute',
    width: DOT_AREA,
    height: DOT_AREA,
    borderRadius: DOT_AREA / 2,
    backgroundColor: MY_LOCATION_HALO,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: MY_LOCATION_BLUE,
    borderWidth: 2,
    borderColor: Acg.paper,
  },
});

export default MapMyLocationMarkerView;
