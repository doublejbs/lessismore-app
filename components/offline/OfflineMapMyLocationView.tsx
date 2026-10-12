import { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import {
  MY_LOCATION_BLUE,
  MY_LOCATION_HALO,
} from '@/components/map/MyLocationColor';
import { Acg } from '@/constants/DesignTokens';
import { MapCoordinate } from '@/hooks/useMapCurrentLocation';
import {
  CompassHeading,
  normalizeDegrees,
} from '@/model/location/CompassHeading';

interface Props {
  coordinate: MapCoordinate;
  // 바라보는 방향(진북 기준). 있으면 부채꼴을 붙인다.
  heading: CompassHeading | null;
  // 지금 지도의 방위(도). 마커는 화면에 서 있는 뷰라 부채꼴을 진북 기준으로 두려면 이만큼 빼서 돌린다.
  mapBearing: number;
}

// 네이버 지도의 내 위치 마커(MapMyLocationMarkerView)와 같은 부채꼴 이미지·점 치수를 쓴다.
const HEADING_CONE_SIZE = 88;
const HEADING_CONE = require('@/assets/images/map/my-location-heading.png');
const HEADING_CONE_WIDE = require('@/assets/images/map/my-location-heading-wide.png');
const DOT_SIZE = 14;
const DOT_AREA = 26;

/**
 * 오프라인 코스 지도의 내 위치 (OF-6 · BD-11) — 파란 점 + 방향 부채꼴. 위치·방향은 네이버 지도와 같은 훅
 * (`useMyLocationHeadingMode`)에서 온다. 부채꼴 꼭짓점이 이미지 정중앙이라 마커는 가운데를 좌표에 둔다.
 */
const OfflineMapMyLocationView: FC<Props> = ({
  coordinate,
  heading,
  mapBearing,
}) => {
  return (
    <Marker
      id='offline-my-location'
      lngLat={[coordinate.longitude, coordinate.latitude]}
      anchor='center'
    >
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

export default OfflineMapMyLocationView;
