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
import StarRatingView from '@/components/camp-site/StarRatingView';
import { CommentUpdateRequest } from '@/model/reply/Comment';
import { Color, Radius } from '@/constants/DesignTokens';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';

interface Props {
  readonly gearId: string;
  readonly commentId: string;
  readonly initialContent: string;
  // 최상위 댓글(=리뷰)일 때만 별점을 편집한다. 답글은 글만 수정한다.
  readonly isTopLevel: boolean;
  readonly initialRating: number;
}

const ReplyEditView: FC<Props> = ({
  gearId,
  commentId,
  initialContent,
  isTopLevel,
  initialRating,
}) => {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [rating, setRating] = useState(initialRating);
  const [isLoading, setIsLoading] = useState(false);

  const { isKeyboardVisible, keyboardHeight } = useKeyboard();

  // 최상위 댓글은 별점(1~5)이 있어야 저장할 수 있다. 답글은 별점 조건이 없다.
  const isRatingValid = !isTopLevel || rating >= 1;
  const canSubmit = Boolean(content.trim()) && isRatingValid && !isLoading;

  const handlePressBack = () => {
    if (isLoading) {
      return;
    }

    router.back();
  };

  const handlePressComplete = async () => {
    if (!canSubmit) {
      return;
    }

    setIsLoading(true);

    try {
      // 별점은 최상위 댓글일 때만 실어 보낸다(답글엔 별점 개념 없음).
      const request: CommentUpdateRequest = {
        content: content.trim(),
        ...(isTopLevel ? { rating } : {}),
      };

      await app
        .getReplyStore()
        ?.updateComment(gearId, commentId, app.getFirebase().getUserId(), request);
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
        {isTopLevel && (
          <View style={styles.ratingSection}>
            <PretendardText weight='semibold' style={styles.ratingLabel}>
              별점
            </PretendardText>
            <StarRatingView editable rating={rating} onChange={setRating} />
          </View>
        )}
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
            canSubmit
              ? styles.completeButtonActive
              : styles.completeButtonDisabled,
          ]}
          onPress={handlePressComplete}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator size='small' color={Color.background} />
          ) : (
            <PretendardText
              weight='semibold'
              style={[
                styles.completeButtonText,
                canSubmit
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
  ratingSection: {
    gap: 10,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: Color.textPrimary,
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
