import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Acg, AcgShadow } from '@/constants/DesignTokens';
import AcgGlassView from '@/components/acg/AcgGlassView';

// 즐겨찾기 상징 노랑 — 마커 캠핑장색과 동일한 시맨틱 리터럴(CS-9).
const FAVORITE_COLOR = '#FFD700';

interface Props {
  // 하단 플로팅 요소가 iOS 플로팅 탭바에 가리지 않게 하는 여유(부모가 계산).
  bottomClearance: number;
  locationGranted: boolean;
  onMoveToCurrentLocation: () => void;
  // 즐겨찾기 목록 시트 열기(CS-9) — 로그인 가드는 호출자가 처리한다.
  onOpenFavorites: () => void;
}

// 지도 하단 오버레이(CS-2/CS-9): 즐겨찾기 버튼 + 현재 위치 버튼(우하단 세로 스택).
// 즐겨찾기 버튼은 현재 위치 버튼 위에 두고 항상 노출한다(위치 권한과 무관).
const CampSiteMapBottomOverlayView: FC<Props> = ({
  bottomClearance,
  locationGranted,
  onMoveToCurrentLocation,
  onOpenFavorites,
}) => {
  return (
    <View
      style={[styles.buttonStack, { bottom: bottomClearance + 24 }]}
      pointerEvents='box-none'
    >
      {/* 즐겨찾기 목록 열기 — 현재 위치 버튼 위(CS-9). */}
      <TouchableOpacity
        style={styles.button}
        onPress={onOpenFavorites}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel='즐겨찾기 목록'
      >
        {/* 채움을 내는 유리 레이어. 원형 지오메트리는 버튼이 그대로 들고 있다. */}
        <AcgGlassView dense elevated={false} style={styles.buttonGlass} />
        <Ionicons name='star' size={22} color={FAVORITE_COLOR} />
      </TouchableOpacity>

      {/* 현재 위치 버튼 — 권한 허용 시에만 노출. 시안에서 이 버튼만 라임 면이다(ACG). */}
      {locationGranted ? (
        <TouchableOpacity
          style={[styles.button, styles.locateButton]}
          onPress={onMoveToCurrentLocation}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel='현재 위치로 이동'
        >
          <Ionicons name='locate' size={22} color={Acg.ink} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // bottom은 탭바 여유(bottomClearance) 기준으로 렌더에서 동적으로 지정한다.
  buttonStack: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 12,
  },
  // 원형 아이콘 버튼은 시안에서도 각지지 않는 예외다(46px).
  // 면은 유리 레이어(buttonGlass)가 낸다 — 지도 위라 채움은 dense를 쓴다. 표준 유리로는
  // 아이콘이 지형에 묻힌다. 어두운 헤어라인·그림자는 그대로 둬 지도와 경계를 유지한다.
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Acg.line2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: AcgShadow.card,
  },
  // 버튼에 `overflow: 'hidden'`을 주면 iOS에서 위 그림자까지 잘린다 — 유리 레이어가
  // 같은 반지름을 들고 스스로 원형으로 잘린다.
  buttonGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 23,
    // 테두리는 버튼 쪽이 그린다.
    borderWidth: 0,
  },
  // 현재 위치 버튼만 라임 면이다(ACG). 라임은 액센트 **면**이라 유리로 흐리면 액센트가
  // 죽는다 — 여기만 단색을 유지한다.
  locateButton: {
    backgroundColor: Acg.lime,
    borderColor: Acg.lime,
  },
});

export default CampSiteMapBottomOverlayView;
