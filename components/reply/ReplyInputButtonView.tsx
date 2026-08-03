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
  container: {
    paddingHorizontal: AcgLayout.screenH,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.line2,
    backgroundColor: Acg.paper,
    width: '100%',
  },
  // 각진 인풋 + 지면색 채움(ACG) — 종이 면 위 인풋이라 회색을 또 두지 않는다.
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Acg.bg,
    borderRadius: 0,
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
    color: Acg.textSecondary,
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
