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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import StarRatingView from '@/components/camp-site/StarRatingView';
import { CommentUpdateRequest } from '@/model/reply/Comment';
import { Color, Radius } from '@/constants/DesignTokens';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// 고정(비스크롤) 화면 — 자동 인셋을 줄 스크롤 뷰가 없어 네이티브 헤더 높이(44pt)만큼 직접 내린다.
const NATIVE_HEADER_HEIGHT = 44;

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
  const insets = useSafeAreaInsets();
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
        ?.updateComment(
          gearId,
          commentId,
          app.getFirebase().getUserId(),
          request
        );
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

  // LG-2: 완료 액션 — iOS는 네이티브 headerRight로, Android/Web은 기존 하단 버튼으로 렌더.
  const renderHeaderComplete = () => (
    <TouchableOpacity
      onPress={handlePressComplete}
      disabled={!canSubmit}
      style={styles.headerCompleteButton}
      accessibilityLabel='완료'
      accessibilityRole='button'
    >
      {isLoading ? (
        <ActivityIndicator size='small' color={Color.textPrimary} />
      ) : (
        <PretendardText
          weight='semibold'
          style={[
            styles.headerCompleteText,
            !canSubmit && styles.headerCompleteTextDisabled,
          ]}
        >
          완료
        </PretendardText>
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        // 고정 레이아웃이라 자동 인셋이 없어 상태바 + 네이티브 헤더 높이만큼 직접 내린다.
        IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)은 시스템에 위임하고
          완료는 headerRight 바 버튼으로 이관한다(기존 핸들러 재사용). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerRight: renderHeaderComplete,
          // 저장 중 이탈 방지 — 커스텀 back의 isLoading 가드를 시스템 back에도 동등 이관.
          headerBackVisible: !isLoading,
          gestureEnabled: !isLoading,
        }}
      />
      {!IS_IOS && (
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
      )}
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
      {/* Android/Web 전용 하단 완료 버튼 — iOS는 headerRight 바 버튼으로 대체(주 액션 1개 유지). */}
      {!IS_IOS && (
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
      )}
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
  // iOS 네이티브 headerRight 완료 버튼 — HIG 최소 터치 타깃 44pt.
  headerCompleteButton: {
    height: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCompleteText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  headerCompleteTextDisabled: {
    color: Color.textSecondary,
  },
});

export default ReplyEditView;
