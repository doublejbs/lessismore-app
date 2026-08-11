import { FC, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  NaverMapMarkerOverlay,
  NaverMapView,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { Ionicons } from '@expo/vector-icons';
import { Color, Radius } from '@/constants/DesignTokens';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { getCampSiteTypeColor } from '@/model/camp-site/CampSiteLabels';
import { deltaToZoom } from '@/model/map/MapZoom';

interface Props {
  location: BagLocation;
  // 연결 박지 스냅샷. 있으면 유형색 마커, 없으면(자유 위치·조회 불가) 기본 핀을 쓴다.
  linkedSpot: CampSpot | null;
  onPress: () => void;
}

// 여행지 허브(DST-8)의 지도 미리보기. 여행지 좌표 중심 + 마커의 네이티브 지도로,
// 확인용이라 제스처(팬·줌·회전·기울임)를 모두 막고 탭하면 공용 선택기를 연다.
// 웹은 상위(BagDestinationHubView)에서 렌더하지 않는다 — 여기선 네이티브만 다룬다.
const BagDestinationMapPreviewView: FC<Props> = ({
  location,
  linkedSpot,
  onPress,
}) => {
  const markerColor = linkedSpot ? getCampSiteTypeColor(linkedSpot.type) : null;

  const mapRef = useRef<NaverMapViewRef>(null);
  const zoom = deltaToZoom(0.05);

  // initialCamera는 최초 마운트에만 적용되므로, 여행지를 바꿔 좌표가 달라지면
  // 마커만 이동하고 지도는 옛 위치에 머문다 — 좌표 변경 시 카메라를 새 위치로 옮긴다(DST-8).
  useEffect(() => {
    mapRef.current?.animateCameraTo({
      latitude: location.latitude,
      longitude: location.longitude,
      zoom,
      duration: 0,
    });
  }, [location.latitude, location.longitude, zoom]);

  return (
    <View style={styles.container}>
      <NaverMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={{
          latitude: location.latitude,
          longitude: location.longitude,
          // 동네 수준 줌 — CampSiteMapView와 동일 환산 사용.
          zoom,
        }}
        isShowLocationButton={false}
        isShowZoomControls={false}
        isShowScaleBar={false}
        isShowCompass={false}
        // 확인용 지도 — 모든 제스처를 막아 탐색 대신 여행지 위치만 보여준다.
        isScrollGesturesEnabled={false}
        isZoomGesturesEnabled={false}
        isTiltGesturesEnabled={false}
        isRotateGesturesEnabled={false}
        isStopGesturesEnabled={false}
      >
        {markerColor ? (
          <NaverMapMarkerOverlay
            latitude={location.latitude}
            longitude={location.longitude}
            anchor={{ x: 0.5, y: 0.5 }}
            width={28}
            height={28}
          >
            {/* 커스텀 View 마커는 최상위 자식에 색을 key로 넘기고 collapsable=false로 렌더를 보장한다(라이브러리 요구). */}
            <View
              key={markerColor}
              collapsable={false}
              style={styles.markerHitArea}
            >
              <View
                style={[styles.markerDot, { backgroundColor: markerColor }]}
              />
            </View>
          </NaverMapMarkerOverlay>
        ) : (
          <NaverMapMarkerOverlay
            latitude={location.latitude}
            longitude={location.longitude}
            anchor={{ x: 0.5, y: 1 }}
            width={32}
            height={40}
          >
            <View key='pin' collapsable={false} style={styles.pinWrap}>
              <Ionicons name='location' size={32} color={Color.textPrimary} />
            </View>
          </NaverMapMarkerOverlay>
        )}
      </NaverMapView>

      {/* 제스처를 막은 지도라 탭 처리는 오버레이가 전담한다 — 지도 어디를 눌러도 선택기를 연다. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel='여행지 지도, 눌러서 변경'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Color.thumbBg,
  },
  markerHitArea: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Color.background,
  },
  pinWrap: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});

export default BagDestinationMapPreviewView;
