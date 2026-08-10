import { Stack, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import PretendardText from '@/components/PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';

// 잘못된 링크·삭제된 문서로 도착하는 404. 빈 상태 규칙(사실 + 다음 걸음 두 줄)과
// 같은 문법으로, 주 액션은 홈 복귀 하나만 둔다.
const NotFoundScreen = () => {
  const router = useRouter();

  const handlePressHome = () => {
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.container}>
        <PretendardText weight='bold' style={styles.fact}>
          여기엔 화면이 없어요
        </PretendardText>
        <PretendardText style={styles.next}>
          주소가 바뀌었거나 삭제된 페이지예요
        </PretendardText>
        <LiquidPillButton label='홈으로 가기' onPress={handlePressHome} />
      </View>
    </>
  );
};

export default NotFoundScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: LiquidLayout.screenH,
    gap: 8,
    backgroundColor: Liquid.canvas,
  },
  fact: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  next: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
    marginBottom: 18,
  },
});
