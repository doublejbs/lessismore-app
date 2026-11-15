import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  latitude: number;
  longitude: number;
}

const MARKER_SIZE = 26;
const CORE_SIZE = 12;

/**
 * 고도 그래프를 훑는 동안 코스 위를 따라 움직이는 마커 (MAP-2 · GRP-8 · OF-6) — 흰 원 + 잉크 테두리 + 잉크 점.
 * 손가락이 그래프 위에 있는 동안에만 떠 있으므로 탭 동작이 없다.
 */
const MapScrubMarkerView = memo<Props>(({ latitude, longitude }) => {
  return (
    <Marker id='map-scrub' lngLat={[longitude, latitude]} anchor='center'>
      <View collapsable={false} pointerEvents='none' style={styles.marker}>
        <View style={styles.core} />
      </View>
    </Marker>
  );
});

MapScrubMarkerView.displayName = 'MapScrubMarkerView';

const styles = StyleSheet.create({
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: Acg.paper,
    borderWidth: 2,
    borderColor: Acg.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: Acg.ink,
  },
});

export default MapScrubMarkerView;
