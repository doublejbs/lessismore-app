import { FC, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';

interface Props {
  readonly gearId: string;
  readonly commentId: string;
  readonly initialContent: string;
}

const ReplyEditView: FC<Props> = ({ gearId, commentId, initialContent }) => {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
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
      await app
        .getReplyStore()
        ?.updateComment(gearId, commentId, app.getFirebase().getUserId(), {
          content: content.trim(),
        });
      router.back();
    } catch (error) {
      app.getAlertManager()?.show({
        message:
          error instanceof Error
            ? error.message
            : '댓글 수정 중 오류가 발생했습니다.',
        confirmText: '확인',
        onConfirm: async () => {},
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
            <Ionicons
              name='chevron-back'
              size={24}
              color={Color.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>
        <TextInput
          style={styles.textInput}
          placeholder='장비가 어땠나요?'
          placeholderTextColor={Color.textSecondary}
          multiline
          textAlignVertical='top'
          value={content}
          onChangeText={setContent}
          editable={!isLoading}
        />
      </View>
      <View
        style={[
          styles.buttonContainer,
          {
            paddingBottom: isKeyboardVisible ? keyboardHeight - 260 : 16,
          },
        ]}
      >
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
            <ActivityIndicator size='small' color={Color.background} />
          ) : (
            <PretendardText
              weight='semibold'
              style={[
                styles.completeButtonText,
                content.trim() && !isLoading
                  ? styles.completeButtonTextActive
                  : styles.completeButtonTextDisabled,
              ]}
            >
              완료
            </PretendardText>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: Color.background,
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
    borderRadius: Radius.input,
    backgroundColor: Color.inputBg,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    backgroundColor: Color.background,
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: Radius.input,
    alignItems: 'center',
  },
  completeButtonActive: {
    backgroundColor: Color.chipActiveBg,
  },
  completeButtonDisabled: {
    backgroundColor: Color.borderLight,
  },
  completeButtonText: {
    fontSize: 16,
  },
  completeButtonTextActive: {
    color: Color.background,
  },
  completeButtonTextDisabled: {
    color: Color.textSecondary,
  },
});

export default ReplyEditView;
