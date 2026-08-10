import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  onPressBack: () => void;
  onPressSearch: () => void;
  onPressAdd: () => void;
  /** 창고가 완전히 빈 상태에서는 검색을 내린다(WH-8) */
  showSearch: boolean;
}

// 캡슐 안 아이콘 칸 한 변 + 캡슐 내부 여백(목업 §8) — 배낭 상세 헤더와 같은 지오메트리다.
const ICON_BOX = 34;
const ACTIONS_PAD_H = 5;
const ACTIONS_GAP = 2;
/**
 * 아이콘 칸(34)을 캡슐 높이(38)까지 넓히는 여유. **현 프리미티브 구조상의 제약**이다 —
 * `LiquidGlassCapsule`의 겉면이 알약으로 클리핑하므로(`overflow: 'hidden'`) 그 밖으로
 * 나간 히트 영역이 전달되지 않아, 아이콘 두 개를 담는 캡슐에서는 시스템 바 버튼과 같은
 * 38이 상한이다(배낭 상세·패킹 헤더와 같은 자리). 클리핑을 안쪽 레이어로 내리면 44까지
 * 넓힐 수 있다 — 지오메트리가 막는 것이 아니다.
 */
const ICON_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

/**
 * Android·Web용 창고 헤더 크롬 (Liquid Depth, 목업 §8).
 *
 * iOS는 네이티브 투명 헤더가 같은 그림(원형 글래스 back + 글래스 바 버튼 `검색`·`추가`)을
 * 시스템에서 내주므로 이 컴포넌트를 쓰지 않는다(LG-1) — 두 플랫폼이 같은 그림을 보되
 * 만드는 주체만 다르다. 버튼 순서도 iOS 바 버튼과 같게 `[검색][+]`로 둔다(WH-1).
 */
const WarehouseChromeView: FC<Props> = ({
  onPressBack,
  onPressSearch,
  onPressAdd,
  showSearch,
}) => {
  return (
    <View style={styles.header}>
      <LiquidGlassCircleButton
        icon='chevron-back'
        onPress={onPressBack}
        accessibilityLabel='뒤로가기'
      />

      <LiquidGlassCapsule paddingHorizontal={ACTIONS_PAD_H} gap={ACTIONS_GAP}>
        {showSearch ? (
          <TouchableOpacity
            style={styles.iconBox}
            onPress={onPressSearch}
            activeOpacity={LiquidMotion.pressOpacity}
            hitSlop={ICON_HIT_SLOP}
            accessibilityRole='button'
            accessibilityLabel='장비 검색'
          >
            <Ionicons name='search' size={19} color={Liquid.ink} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.iconBox}
          onPress={onPressAdd}
          activeOpacity={LiquidMotion.pressOpacity}
          hitSlop={ICON_HIT_SLOP}
          accessibilityRole='button'
          accessibilityLabel='장비 추가'
        >
          <Ionicons name='add' size={23} color={Liquid.ink} />
        </TouchableOpacity>
      </LiquidGlassCapsule>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WarehouseChromeView;
