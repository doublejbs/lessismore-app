import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiquidHeaderChrome, {
  LIQUID_HEADER_ICON_BOX,
} from '@/components/liquid/LiquidHeaderChrome';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  onPressBack: () => void;
  onPressSearch: () => void;
  onPressAdd: () => void;
  /** 창고가 완전히 빈 상태에서는 검색을 내린다(WH-8) */
  showSearch: boolean;
}

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
 * 유리 크롬 한 줄은 `LiquidHeaderChrome`이 그리고(iOS가 이 크롬을 안 쓰는 이유도 거기 있다 —
 * LG-1), 이 파일은 이 화면만의 액션 두 개를 캡슐 칸에 담는다. 버튼 순서도 iOS 바 버튼과
 * 같게 `[검색][+]`로 둔다(WH-1).
 */
const WarehouseChromeView: FC<Props> = ({
  onPressBack,
  onPressSearch,
  onPressAdd,
  showSearch,
}) => {
  const actions = (
    <>
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
    </>
  );

  return <LiquidHeaderChrome onPressBack={onPressBack} actions={actions} />;
};

const styles = StyleSheet.create({
  iconBox: {
    width: LIQUID_HEADER_ICON_BOX,
    height: LIQUID_HEADER_ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WarehouseChromeView;
