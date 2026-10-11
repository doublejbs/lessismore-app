import { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MY_LOCATION_BLUE } from '@/components/map/MyLocationColor';
import { Acg } from '@/constants/DesignTokens';
import {
  CompassHeading,
  normalizeDegrees,
} from '@/model/location/CompassHeading';

interface Props {
  x: number;
  y: number;
  // 바라보는 방향(진북 기준). 있으면 부채꼴을 붙인다.
  heading: CompassHeading | null;
  // 캔버스가 돌아간 각도(도, 시계 방향) — 부채꼴은 화면이 아니라 진북 기준이라 이만큼 더 돌린다.
  canvasRotation: number;
}

// 지도의 내 위치 마커(MapMyLocationMarkerView)와 같은 부채꼴 이미지·점 치수를 쓴다.
const HEADING_CONE_SIZE = 88;
const HEADING_CONE = require('@/assets/images/map/my-location-heading.png');
const HEADING_CONE_WIDE = require('@/assets/images/map/my-location-heading-wide.png');
const DOT_AREA = 26;

/**
 * 오프라인 캔버스의 내 위치 (OF-6) — 파란 점 + 방향 부채꼴. 위치·방향은 지도와 같은 소스
 * (`useMyLocationHeadingMode` — BD-11 방향 모드)라 지도와 같은 자리·같은 방향을 가리킨다.
 */
const OfflineCanvasMyLocationView: FC<Props> = ({
  x,
  y,
  heading,
  canvasRotation,
}) => {
  return (
    <View
      pointerEvents='none'
      style={[
        styles.container,
        { left: x - HEADING_CONE_SIZE / 2, top: y - HEADING_CONE_SIZE / 2 },
      ]}
    >
      {heading ? (
        <Image
          source={heading.isLowAccuracy ? HEADING_CONE_WIDE : HEADING_CONE}
          style={[
            styles.cone,
            {
              transform: [
                {
                  rotate: `${normalizeDegrees(heading.bearing + canvasRotation)}deg`,
                },
              ],
            },
          ]}
        />
      ) : null}
      <View style={styles.halo} />
      <View style={styles.dot} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
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
    backgroundColor: 'rgba(45, 140, 255, 0.18)',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: MY_LOCATION_BLUE,
    borderWidth: 3,
    borderColor: Acg.paper,
  },
});

export default OfflineCanvasMyLocationView;
