import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import LiquidGlassField from '@/components/liquid/LiquidGlassField';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';
import Reply from '@/model/reply/Reply';

interface Props {
  reply: Reply;
}

// 입력 바 위아래 여백.
const INPUT_BAR_GAP = 12;

/**
 * RP-1 리뷰 쓰기 진입 바 (Liquid Depth, 2026-08-11 이식).
 *
 * 지면 위에 놓인 바라 띠 면을 깔지 않는다 — 흰 띠가 화면 하단을 가로지르면 지면이 끊긴다.
 * 대신 **필드 자체가 유리**다(공용 `LiquidGlassField` — 검색 필드와 같은 셸).
 * 실제 입력은 formSheet(`ReplyInputView`)가 받으므로 이 자리는 버튼이며, 카피도 시트가
 * 무엇을 받는지 그대로 말한다(`리뷰를 남겨보세요`).
 */
const ReplyInputButtonView: FC<Props> = ({ reply }) => {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    reply.moveToInput();
  };

  return (
    // 화면 맨 아래 바라 홈 인디케이터를 피한다.
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <LiquidGlassField onPress={handlePress} accessibilityLabel='리뷰 쓰기'>
        <View style={styles.body}>
          <Ionicons name='create-outline' size={18} color={Liquid.inkMuted} />
          <PretendardText style={styles.placeholder}>
            리뷰를 남겨보세요
          </PretendardText>
        </View>
      </LiquidGlassField>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: INPUT_BAR_GAP,
    backgroundColor: 'transparent',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  placeholder: {
    flex: 1,
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkMuted,
  },
});

export default ReplyInputButtonView;
