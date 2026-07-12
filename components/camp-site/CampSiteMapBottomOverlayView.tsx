import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Color } from '@/constants/DesignTokens';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import CampSiteSummaryCardView from './CampSiteSummaryCardView';

interface Props {
  campSiteMap: CampSiteMap;
  // 하단 플로팅 요소가 iOS 플로팅 탭바에 가리지 않게 하는 여유(부모가 계산).
  bottomClearance: number;
  locationGranted: boolean;
  onMoveToCurrentLocation: () => void;
  onPressSpot: (spot: CampSpot) => void;
  // 위치로 이동(CS-2) — 카메라를 선택 박지 위치로 되돌린다.
  onMoveToSpot: (spot: CampSpot) => void;
}

// 지도 하단 오버레이(CS-2): 현재 위치 버튼 + 선택 박지 요약 카드.
// 지도 화면에서 분리된 observer라 마커 탭(선택 변경) 시 이 영역만 리렌더된다.
const CampSiteMapBottomOverlayView: FC<Props> = observer(
  ({
    campSiteMap,
    bottomClearance,
    locationGranted,
    onMoveToCurrentLocation,
    onPressSpot,
    onMoveToSpot,
  }) => {
    const selectedSpot = campSiteMap.getSelectedSpot();

    return (
      <>
        {/* 현재 위치 버튼 — 권한 허용 시에만 노출 */}
        {locationGranted && (
          <View
            style={[
              styles.locateWrap,
              { bottom: bottomClearance + (selectedSpot ? 190 : 24) },
            ]}
            pointerEvents='box-none'
          >
            <TouchableOpacity
              style={styles.locateButton}
              onPress={onMoveToCurrentLocation}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel='현재 위치로 이동'
            >
              <Ionicons name='locate' size={22} color={Color.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {selectedSpot && (
          <CampSiteSummaryCardView
            spot={selectedSpot}
            bottomInset={bottomClearance}
            onPress={() => onPressSpot(selectedSpot)}
            onPressMoveToSpot={() => onMoveToSpot(selectedSpot)}
          />
        )}
      </>
    );
  }
);

const styles = StyleSheet.create({
  // bottom은 탭바 여유(bottomClearance) + 카드 유무에 따라 렌더에서 동적으로 지정한다.
  locateWrap: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
  },
  locateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Color.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
});

export default CampSiteMapBottomOverlayView;
