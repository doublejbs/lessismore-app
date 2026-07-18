import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';

interface Props {
  // 하단 플로팅 요소가 iOS 플로팅 탭바에 가리지 않게 하는 여유(부모가 계산).
  bottomClearance: number;
  locationGranted: boolean;
  onMoveToCurrentLocation: () => void;
}

// 지도 하단 오버레이(CS-2): 현재 위치 버튼.
// 선택 박지 정보는 상세 바텀 시트(`/camp-site/{id}`)가 담당한다.
const CampSiteMapBottomOverlayView: FC<Props> = ({
  bottomClearance,
  locationGranted,
  onMoveToCurrentLocation,
}) => {
  // 현재 위치 버튼 — 권한 허용 시에만 노출
  if (!locationGranted) {
    return null;
  }

  return (
    <View
      style={[styles.locateWrap, { bottom: bottomClearance + 24 }]}
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
  );
};

const styles = StyleSheet.create({
  // bottom은 탭바 여유(bottomClearance) 기준으로 렌더에서 동적으로 지정한다.
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
