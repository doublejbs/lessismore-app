import Reply from '@/model/reply/Reply';
import { FC, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useKeyboard from '@/hooks/useKeyboard';

interface Props {
  reply: Reply;
}

const ReplyInputView: FC<Props> = ({ reply }) => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isKeyboardVisible, keyboardHeight } = useKeyboard();

  const handlePressBack = () => {
    if (isLoading) return;
    router.back();
  };

  const handlePressComplete = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await reply.confirm(content.trim());
    } catch (error) {
      Alert.alert(
        '댓글 작성 실패',
        error instanceof Error
          ? error.message
          : '댓글 작성 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 76 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
            <Ionicons name='chevron-back' size={24} color='#191F28' />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>
        <TextInput
          style={styles.textInput}
          placeholder='장비가 어땠나요?'
          placeholderTextColor='#999'
          multiline
          textAlignVertical='top'
          value={content}
          onChangeText={setContent}
          editable={!isLoading}
        />
      </View>
      <View style={[styles.buttonContainer]}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            content.trim() && !isLoading
              ? styles.completeButtonActive
              : styles.completeButtonDisabled,
          ]}
          onPress={handlePressComplete}
          disabled={!content.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size='small' color='#fff' />
          ) : (
            <Text
              style={[
                styles.completeButtonText,
                content.trim() && !isLoading
                  ? styles.completeButtonTextActive
                  : styles.completeButtonTextDisabled,
              ]}
            >
              완료
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 4,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
    padding: 16,
    fontSize: 16,
    minHeight: 200,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonActive: {
    backgroundColor: '#000',
  },
  completeButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButtonTextActive: {
    color: '#fff',
  },
  completeButtonTextDisabled: {
    color: '#999',
  },
});

export default ReplyInputView;
