import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { MY_LOCATION_BLUE } from '@/components/map/MyLocationColor';
import {
  CompassHeading,
  normalizeDegrees,
} from '@/model/location/CompassHeading';

interface Props {
  latitude: number;
  longitude: number;
  // 방향 모드(BD-11 · GRP-10)에서 바라보는 방향. 있으면 파란 점에 방향 부채꼴을 붙인다.
  heading?: CompassHeading | null | undefined;
}

// 내 위치 파란 점(CS-1). 박지 지도·그룹 지도(GRP-10)·배낭 코스 지도(BD-11)가 함께 쓴다.
// 네이티브 위치 오버레이(setLocationTrackingMode)는 이 라이브러리에서
// 줌 스케일에 따라 점이 실제 좌표에서 드리프트하는 버그가 있어, 박지 마커(CampSiteMarkerView)와
// 동일한 지오 앵커 NaverMapMarkerOverlay로 직접 렌더한다 — 마커 경로는 줌에 정확히 고정된다.
// 위치 표시 파란색은 지도 컨벤션 의미색이라 토큰이 아닌 하드코딩을 허용한다(`MyLocationColor`).
//
// 방향 부채꼴은 **PNG 이미지 마커**다. 커스텀 View 마커는 네이버 지도가 스냅숏으로 굳혀 그리므로
// (코스 끝점 마커에서 글리프가 빠진 이유 — RouteEndpointMarkersView) View transform 회전은 갱신이
// 보장되지 않는다. 이미지 마커는 `angle`을 네이티브가 직접 돌린다. `isFlatEnabled`로 지도에 눕혀
// 각도가 **지도(진북) 기준**이 되게 한다 — 지도가 방향 모드로 돌아도 부채꼴은 실제 방위를 가리킨다.
// 이미지는 위(북)를 향한 부채꼴이고 꼭짓점이 정중앙이다(88pt, 1x/2x/3x, `assets/images/map/`).
const HEADING_CONE_SIZE = 88;
const HEADING_CONE = require('@/assets/images/map/my-location-heading.png');
// 나침반 정확도가 낮을 때 — 더 넓고 옅은 부채꼴. 방향을 믿기 어렵다는 것을 모양으로 알린다.
const HEADING_CONE_WIDE = require('@/assets/images/map/my-location-heading-wide.png');
const CENTER_ANCHOR = { x: 0.5, y: 0.5 };

const MapMyLocationMarkerView: FC<Props> = ({
  latitude,
  longitude,
  heading,
}) => {
  return (
    <>
      {heading ? (
        <NaverMapMarkerOverlay
          latitude={latitude}
          longitude={longitude}
          anchor={CENTER_ANCHOR}
          width={HEADING_CONE_SIZE}
          height={HEADING_CONE_SIZE}
          image={heading.isLowAccuracy ? HEADING_CONE_WIDE : HEADING_CONE}
          angle={normalizeDegrees(heading.bearing)}
          isFlatEnabled
          // 파란 점 바로 아래 — 점이 부채꼴의 꼭짓점을 덮는다.
          zIndex={999}
        />
      ) : null}
      <NaverMapMarkerOverlay
        latitude={latitude}
        longitude={longitude}
        anchor={CENTER_ANCHOR}
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
    </>
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
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: MY_LOCATION_BLUE,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
});

export default MapMyLocationMarkerView;
