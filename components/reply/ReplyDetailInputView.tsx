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
import { Acg, AcgLayout } from '@/constants/DesignTokens';
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
        console.error('답글 저장 실패:', error);
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
              >
                <PretendardText weight='medium' style={styles.placeholder}>
                  답글을 남겨보세요
                </PretendardText>
              </TouchableOpacity>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder='답글을 남겨보세요'
                  placeholderTextColor={Acg.textSecondary}
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
                >
                  {isSaving ? (
                    <ActivityIndicator size='small' color={Acg.paper} />
                  ) : (
                    <PretendardText
                      weight='semibold'
                      style={styles.saveButtonText}
                    >
                      저장
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
    paddingHorizontal: AcgLayout.screenH,
    paddingTop: INPUT_BAR_GAP,
    // 지면 위에 놓인 바라 면을 깔지 않는다 — 흰 띠가 화면 하단을 가로지르면 지형이 끊긴다.
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  authorButton: {
    width: 40,
    height: 40,
    backgroundColor: Acg.ink,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 16,
    fontWeight: '500',
    color: Acg.paper,
  },
  inputButton: {
    flex: 1,
    height: 40,
    backgroundColor: Acg.controlFill,
    borderRadius: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholder: {
    fontSize: 16,
    color: Acg.textSecondary,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Acg.controlFill,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500',
    color: Acg.ink,
  },
  saveButton: {
    backgroundColor: Acg.ink,
    borderRadius: 0,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    color: Acg.paper,
  },
});

export default ReplyDetailInputView;
