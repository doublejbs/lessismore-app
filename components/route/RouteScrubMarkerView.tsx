import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  latitude: number;
  longitude: number;
}

const MARKER_SIZE = 26;
const CORE_SIZE = 12;

/**
 * 고도 그래프를 훑는 동안 코스 위를 따라 움직이는 마커 (GRP-8).
 *
 * 등록된 포인트 마커(유형 색 원 + 아이콘)와도, 코스 폴리라인(파란 선)과도 겹치지 않는
 * 생김새를 쓴다 — 흰 테두리 위 잉크 점이다. 손가락이 그래프 위에 있는 동안에만 떠 있으므로
 * 캡션·탭 동작을 두지 않는다.
 */
const RouteScrubMarkerView = memo<Props>(({ latitude, longitude }) => {
  return (
    <NaverMapMarkerOverlay
      latitude={latitude}
      longitude={longitude}
      anchor={{ x: 0.5, y: 0.5 }}
      width={MARKER_SIZE}
      height={MARKER_SIZE}
      zIndex={2}
      isHideCollidedSymbols
    >
      {/* 커스텀 View 마커는 최상위 자식에 collapsable=false가 필요하다(라이브러리 요구사항). */}
      <View collapsable={false} style={styles.marker}>
        <View style={styles.core} />
      </View>
    </NaverMapMarkerOverlay>
  );
});

RouteScrubMarkerView.displayName = 'RouteScrubMarkerView';

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

export default RouteScrubMarkerView;
