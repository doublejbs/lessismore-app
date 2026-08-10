import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
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
 * iOS는 네이티브 투명 헤더가 같은 그림(원형 글래스 back + 글래스 바 버튼)을 시스템에서
 * 내주므로 이 컴포넌트를 쓰지 않는다(LG-1) — 두 플랫폼이 같은 그림을 보되 만드는 주체만 다르다.
 * 배낭 상세와 달리 우측은 아이콘 캡슐이 아니라 **텍스트 알약** 하나다.
 */
const BagPackingChromeView: FC<Props> = ({
  onPressBack,
  onPressReset,
  showReset,
}) => {
  return (
    <View style={styles.header}>
      <LiquidGlassCircleButton
        icon='chevron-back'
        onPress={onPressBack}
        accessibilityLabel='뒤로가기'
      />

      {showReset ? (
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
      ) : null}
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
  resetLabel: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
});

export default BagPackingChromeView;
