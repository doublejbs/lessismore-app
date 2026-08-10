import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Liquid,
  LiquidMotion,
  LiquidSemantic,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  // 하단 플로팅 요소가 iOS 플로팅 탭바에 가리지 않게 하는 여유(부모가 계산).
  bottomClearance: number;
  locationGranted: boolean;
  onMoveToCurrentLocation: () => void;
  // 즐겨찾기 목록 시트 열기(CS-9) — 로그인 가드는 호출자가 처리한다.
  onOpenFavorites: () => void;
}

// 플로팅 원형 버튼 지름(목업 §4).
const BUTTON_SIZE = 48;

/**
 * 떠 있는 탭바 위로 버튼을 띄우는 여유. 목업은 화면 밑변에서 `bottom: 150`이고,
 * 그 값은 세이프에어리어(34) + 탭바(49) + 이 여유로 분해된다 — 기기별 세이프에어리어와
 * 플랫폼별 탭바 차이는 부모가 `bottomClearance`로 넘긴다.
 *
 * 안드로이드는 JS 탭바가 레이아웃 공간을 차지해 `bottomClearance`가 0이므로 이 값이 곧
 * 탭바 위 간격이 된다 — 목업의 탭바 위 간격(150 − 68 = 82)보다 작아 남는 여백이 아니다.
 */
const BUTTON_STACK_CLEARANCE = 64;

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
      style={[
        styles.buttonStack,
        { bottom: bottomClearance + BUTTON_STACK_CLEARANCE },
      ]}
      pointerEvents='box-none'
    >
      {/* 즐겨찾기 목록 열기 — 현재 위치 버튼 위(CS-9). 채움은 지도용 진한 유리 톤이고
          **실제 블러는 쓰지 않는다** — 채움이 92%라 블러가 보이지 않는데 지도 팬·줌 중
          매 프레임 비용만 남는다(검색 필드·필터 칩과 같은 판단). */}
      <TouchableOpacity
        style={[styles.buttonShadow, styles.glassButton]}
        onPress={onOpenFavorites}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='즐겨찾기 목록'
      >
        <Ionicons name='star' size={22} color={LiquidSemantic.favorite} />
      </TouchableOpacity>

      {/* 현재 위치 버튼 — 권한 허용 시에만 노출. **지도 크롬(검색·필터·플로팅 버튼) 계층에서
          라임 면은 이 버튼 하나**다. 선택 마커 핀도 라임 면이지만 그건 지도 위 마커 계층이라
          크롬과 자리를 다투지 않는다(CS-2). */}
      {locationGranted ? (
        <TouchableOpacity
          style={[styles.buttonShadow, styles.locateButton]}
          onPress={onMoveToCurrentLocation}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='현재 위치로 이동'
        >
          <Ionicons name='locate' size={22} color={Liquid.limeOn} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // bottom은 탭바 여유(bottomClearance) 기준으로 렌더에서 동적으로 지정한다.
  buttonStack: {
    position: 'absolute',
    right: 18,
    alignItems: 'flex-end',
    gap: 12,
  },
  // 두 버튼이 같은 지오메트리(지름 48 원)를 공유한다 — 채움만 갈린다.
  buttonShadow: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: LiquidShadow.glass,
  },
  glassButton: {
    backgroundColor: Liquid.glassFillOnMap,
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
  },
  locateButton: {
    backgroundColor: Liquid.lime,
    boxShadow: LiquidShadow.accent,
  },
});

export default CampSiteMapBottomOverlayView;
