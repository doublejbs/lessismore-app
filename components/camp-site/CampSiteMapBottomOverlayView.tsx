import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
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

// 지도 하단 오버레이(CS-2/CS-9): 즐겨찾기 알약 + 현재 위치 원(우하단 세로 스택).
// 즐겨찾기는 현재 위치 버튼 위에 두고 항상 노출한다(위치 권한과 무관).
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
      {/**
       * 즐겨찾기 **목록 열기** — 현재 위치 버튼 위(CS-9).
       *
       * 아이콘만 있는 원이던 시절엔 "즐겨찾기만 보는 필터"인지 "저장 목록"인지 알 수 없었다
       * (2026-08-11 디자인 리뷰) — 별 하나로는 상태 토글로도 읽힌다. 그래서 라벨을 붙여
       * 알약으로 바꿨다: 하는 일을 색이 아니라 **말**로 밝힌다. 별과 노란색은 그대로 둔다 —
       * 즐겨찾기는 앱 전체에서 별이고(박지 상세 액션 칩·빈 상태 카피 `별을 눌러`),
       * `favorite`는 뜻이 값에 묶인 의미색이라 리디자인 대상이 아니다.
       *
       * 채움은 지도용 진한 유리 톤이고 **실제 블러는 쓰지 않는다** — 채움이 92%라 블러가
       * 보이지 않는데 지도 팬·줌 중 매 프레임 비용만 남는다(검색 필드·필터 칩과 같은 판단).
       */}
      <TouchableOpacity
        style={[styles.favoriteButton, styles.glassButton]}
        onPress={onOpenFavorites}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel='즐겨찾기 목록'
      >
        <Ionicons name='star' size={18} color={LiquidSemantic.favorite} />
        <PretendardText weight='semibold' style={styles.favoriteLabel}>
          즐겨찾기
        </PretendardText>
      </TouchableOpacity>

      {/* 현재 위치 버튼 — 권한 허용 시에만 노출. **지도 크롬(검색·필터·플로팅 버튼) 계층에서
          라임 면은 이 버튼 하나**다. 선택 마커 핀도 라임 면이지만 그건 지도 위 마커 계층이라
          크롬과 자리를 다투지 않는다(CS-2). */}
      {locationGranted ? (
        <TouchableOpacity
          style={[styles.circleButton, styles.locateButton]}
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
  // 아이콘만 있는 원(현재 위치). 지름 48.
  circleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: LiquidShadow.glass,
  },
  /**
   * 아이콘 + 라벨 알약(즐겨찾기). 원 버튼과 **높이는 같고**(48) 모서리도 완전한 알약이라
   * 두 버튼이 한 가족으로 읽힌다 — 폭만 라벨만큼 늘어난다.
   */
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: BUTTON_SIZE,
    paddingHorizontal: 16,
    borderRadius: BUTTON_SIZE / 2,
    boxShadow: LiquidShadow.glass,
  },
  favoriteLabel: {
    fontSize: 14,
    color: Liquid.ink,
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
