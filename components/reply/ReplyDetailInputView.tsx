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
import { Acg } from '@/constants/DesignTokens';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';

interface Props {
  replyDetail: ReplyDetail;
  scrollViewRef: React.RefObject<ScrollView>;
}

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
      // 오프셋 76은 키보드 위에 그만큼 빈 지면을 남겼다(2026-08-03 실기기 확인).
      // 아래 컨테이너가 홈 인디케이터만큼 패딩을 갖는데, 키보드가 올라오면 그 패딩이
      // 키보드 위 빈칸이 된다 — 음수 오프셋으로 정확히 그만큼만 상쇄한다.
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.line2,
    backgroundColor: Acg.paper,
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
    backgroundColor: Acg.bg,
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
    backgroundColor: Acg.bg,
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
