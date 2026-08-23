import { FC, useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';

interface Props {
  replyDetail: ReplyDetail;
  scrollViewRef: React.RefObject<ScrollView>;
}

// 입력 바 위아래 여백. 키보드가 올라왔을 때 키보드와의 간격이기도 하다.
const INPUT_BAR_GAP = 12;
// RP-7: 입력칸·저장 알약이 같은 높이로 나란히 선다. 알약 모서리는 이 값의 절반이다.
const INPUT_BAR_HEIGHT = 44;

const ReplyDetailInputView: FC<Props> = observer(
  ({ replyDetail, scrollViewRef }) => {
    const [isInputMode, setIsInputMode] = useState(false);
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const insets = useSafeAreaInsets();
    const replyTarget = replyDetail.getReplyTarget();

    useEffect(() => {
      if (isInputMode) {
        replyDetail.setInputRef(inputRef.current as View);
      }
    }, [replyDetail, isInputMode]);

    useEffect(() => {
      if (replyTarget) {
        const mention = `@${replyTarget.authorName} `;
        setText(mention);
        setIsInputMode(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }, [replyTarget]);

    const handlePressInput = () => {
      setIsInputMode(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    const handleSave = async () => {
      if (!text.trim() || isSaving) return;

      setIsSaving(true);
      try {
        // @멘션 제거하고 내용만 저장
        const content = replyTarget
          ? text.replace(`@${replyTarget.authorName} `, '').trim()
          : text.trim();

        if (!content) {
          setIsSaving(false);
          return;
        }

        await replyDetail.createReply(content);
        app.getAnalyticsManager()?.logClick('reply_submit', { depth: 'reply' });
        setText('');
        setIsInputMode(false);
        Keyboard.dismiss();
        scrollViewRef.current?.scrollToEnd({ animated: true });
      } catch (error) {
        console.error('답글 저장 실패:', error); // l10n-ignore
      } finally {
        setIsSaving(false);
      }
    };

    const handleBlur = () => {
      if (!text.trim()) {
        setIsInputMode(false);
        replyDetail.clearReplyTarget();
      }
    };

    return (
      // KeyboardAvoidingView의 padding은 `키보드 높이 + 오프셋`이라 양수 오프셋이 그대로
      // 키보드 위 빈칸이 된다(옛 76pt가 그랬다). 컨테이너는 홈 인디케이터를 피할 만큼
      // 패딩을 갖는데 키보드가 올라오면 그 몫이 빈칸이 되므로, 음수 오프셋으로 상쇄하고
      // 위아래 여백(INPUT_BAR_GAP)만 남긴다 — 키보드에 딱 붙으면 입력칸이 눌린 것처럼 보인다.
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
      >
        <View
          style={[
            styles.container,
            { paddingBottom: insets.bottom + INPUT_BAR_GAP },
          ]}
        >
          <View style={styles.content}>
            {!isInputMode ? (
              <TouchableOpacity
                style={styles.inputButton}
                onPress={handlePressInput}
                accessibilityRole='button'
                accessibilityLabel={app.getL10n().t('reply.writeReply')}
              >
                <PretendardText weight='medium' style={styles.placeholder}>
                  {app.getL10n().t('reply.replyPlaceholder')}
                </PretendardText>
              </TouchableOpacity>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder={app.getL10n().t('reply.replyPlaceholder')}
                  placeholderTextColor={Acg.textMuted}
                  value={text}
                  onChangeText={setText}
                  onBlur={handleBlur}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!text.trim() || isSaving) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!text.trim() || isSaving}
                  accessibilityRole='button'
                accessibilityLabel={app.getL10n().t('reply.saveReply')}
                >
                  {isSaving ? (
                    // 라임 면 위라 인디케이터도 잉크다.
                    <ActivityIndicator size='small' color={Acg.ink} />
                  ) : (
                    <PretendardText
                      weight='semibold'
                      style={[
                        styles.saveButtonText,
                        (!text.trim() || isSaving) &&
                          styles.saveButtonTextDisabled,
                      ]}
                    >
                      {app.getL10n().t('reply.saveReply')}
                    </PretendardText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: INPUT_BAR_GAP,
    // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 화면 하단을 가로지르면 층이 하나 늘어난다.
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  // RP-7: 순백 지면 위 연회색 면 + 모서리 12(앱 공통 입력 면 문법).
  inputButton: {
    flex: 1,
    minHeight: INPUT_BAR_HEIGHT,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholder: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  // 여러 줄 입력이라 `body` 단을 스프레드한다(TextInput은 서체를 직접 지정).
  textInput: {
    flex: 1,
    minHeight: INPUT_BAR_HEIGHT,
    maxHeight: 100,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...AcgType.body,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
  },
  // 이 화면의 주 액션 — 라임 알약 하나.
  saveButton: {
    backgroundColor: Acg.lime,
    paddingHorizontal: 16,
    minHeight: INPUT_BAR_HEIGHT,
    borderRadius: INPUT_BAR_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  // 비활성은 연회색 면이다 — 옛 `#CCCCCC` + opacity 0.5는 토큰 밖 값이었다.
  saveButtonDisabled: {
    backgroundColor: Acg.controlFill,
  },
  saveButtonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  saveButtonTextDisabled: {
    color: Acg.textMuted,
  },
});

export default ReplyDetailInputView;
