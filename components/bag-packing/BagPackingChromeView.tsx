import { FC } from 'react';
import { StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidHeaderChrome from '@/components/liquid/LiquidHeaderChrome';
import { Liquid } from '@/constants/DesignTokens';

interface Props {
  onPressBack: () => void;
  onPressReset: () => void;
  /** 장비가 있을 때만 `처음부터 다시`를 노출한다(PK-4) */
  showReset: boolean;
}

// 텍스트 알약 내부 좌우 여백(목업 §7). 아이콘 칸을 담는 캡슐(5)보다 넓다.
const RESET_PILL_PAD_H = 14;

/**
 * Android·Web용 패킹 모드 크롬 (Liquid Depth, 목업 §7).
 *
 * 유리 크롬 한 줄은 `LiquidHeaderChrome`이 그리고(iOS가 이 크롬을 안 쓰는 이유도 거기 있다 —
 * LG-1), 이 파일은 이 화면만의 우측 노드를 얹는다: 배낭 상세와 달리 우측이 아이콘 캡슐이
 * 아니라 **텍스트 알약** 하나이고, 캡슐 자체가 버튼이다.
 */
const BagPackingChromeView: FC<Props> = ({
  onPressBack,
  onPressReset,
  showReset,
}) => {
  const resetPill = showReset ? (
    <LiquidGlassCapsule
      paddingHorizontal={RESET_PILL_PAD_H}
      onPress={onPressReset}
      accessibilityLabel='처음부터 다시'
    >
      {/* 한글이라 콘덴스드를 쓰지 않는다 — Archivo Narrow에 한글 글리프가 없다. */}
      <PretendardText weight='semibold' style={styles.resetLabel}>
        처음부터 다시
      </PretendardText>
    </LiquidGlassCapsule>
  ) : null;

  return <LiquidHeaderChrome onPressBack={onPressBack} right={resetPill} />;
};

const styles = StyleSheet.create({
  resetLabel: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
});

export default BagPackingChromeView;
