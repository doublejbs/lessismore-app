import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import Reply from '@/model/reply/Reply';

interface Props {
  reply: Reply;
}

const ReplyInputButtonView: FC<Props> = ({ reply }) => {
  const handlePress = () => {
    reply.moveToInput();
  };

  return (
    <View style={styles.container}>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 10,
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
    color: '#999999',
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
