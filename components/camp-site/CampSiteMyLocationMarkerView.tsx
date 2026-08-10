import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Liquid, LiquidShadow } from '@/constants/DesignTokens';

interface Props {
  latitude: number;
  longitude: number;
}

// 내 위치 파란 점(CS-1). 네이티브 위치 오버레이(setLocationTrackingMode)는 이 라이브러리에서
// 줌 스케일에 따라 점이 실제 좌표에서 드리프트하는 버그가 있어, 박지 마커(CampSiteMarkerView)와
// 동일한 지오 앵커 NaverMapMarkerOverlay로 직접 렌더한다 — 마커 경로는 줌에 정확히 고정된다.
// 위치 표시 파란색은 지도 컨벤션 의미색이라 토큰이 아닌 하드코딩을 허용한다(마커 유형색과 동일 예외).
const MY_LOCATION_BLUE = '#2D8CFF';

const CampSiteMyLocationMarkerView: FC<Props> = ({ latitude, longitude }) => {
  return (
    <NaverMapMarkerOverlay
      latitude={latitude}
      longitude={longitude}
      anchor={{ x: 0.5, y: 0.5 }}
      width={26}
      height={26}
      // 박지 마커·캡션보다 항상 위에 그려 내 위치가 가려지지 않게 한다.
      zIndex={1000}
    >
      {/* 커스텀 View 마커는 최상위 자식에 collapsable=false로 렌더를 보장한다(라이브러리 요구). */}
      <View key='my-location' collapsable={false} style={styles.hitArea}>
        <View style={styles.halo} />
        <View style={styles.dot} />
      </View>
    </NaverMapMarkerOverlay>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 은은한 정확도 후광 — 파란 점 주변을 부드럽게 감싼다.
  halo: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(45, 140, 255, 0.18)',
  },
  // 흰 테두리 + 파란 코어 + 그림자로 지도 위에서 떠오르는 표준 현위치 점.
  // 테두리·그림자는 박지 마커(CampSiteMarkerView)와 같은 값을 쓴다 — 같은 지도 위에 나란히
  // 놓이는 점이라 떠 있는 정도가 갈리면 한쪽이 다른 층에 있는 것처럼 보인다.
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: MY_LOCATION_BLUE,
    borderWidth: 3,
    borderColor: Liquid.surface,
    boxShadow: LiquidShadow.markerOnMap,
  },
});

export default CampSiteMyLocationMarkerView;
