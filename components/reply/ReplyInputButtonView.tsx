import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import Reply from '@/model/reply/Reply';

interface Props {
  reply: Reply;
}

const ReplyInputButtonView: FC<Props> = ({ reply }) => {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    reply.moveToInput();
  };

  return (
    // 화면 맨 아래 바라 홈 인디케이터를 피한다.
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <TouchableOpacity style={styles.inputContainer} onPress={handlePress}>
        <View style={styles.inputWrapper}>
          <PretendardText style={styles.placeholder}>
            댓글을 입력해보세요
          </PretendardText>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 화면 하단을 가로지르면 지형이 끊긴다.
  // 대신 인풋이 종이 면이 된다(뒤가 지면이면 종이, 뒤가 종이면 지면색 — 앱 공통 규칙).
  container: {
    paddingHorizontal: AcgLayout.screenH,
    paddingTop: 12,
    backgroundColor: 'transparent',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholder: {
    fontSize: 16,
    color: Acg.textMuted,
    flex: 1,
    ...Platform.select({
      ios: {
        lineHeight: 20,
      },
      android: {
        lineHeight: 22,
      },
    }),
  },
  sendIcon: {
    marginLeft: 8,
  },
});

export default ReplyInputButtonView;
