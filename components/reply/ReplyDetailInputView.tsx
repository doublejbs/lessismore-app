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
import ReplyDetail from '@/model/reply/ReplyDetail';
import { observer } from 'mobx-react-lite';

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

    const handlePressAuthor = () => {
      // TODO: 작성자 프로필로 이동
    };

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 76 : 0}
      >
        <View style={[styles.container]}>
          <View style={styles.content}>
            {!isInputMode ? (
              <TouchableOpacity
                style={styles.inputButton}
                onPress={handlePressInput}
              >
                <PretendardText style={styles.placeholder}>
                  답글을 남겨보세요
                </PretendardText>
              </TouchableOpacity>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder='답글을 남겨보세요'
                  placeholderTextColor='#9BA2AD'
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
                    <ActivityIndicator size='small' color='#FFFFFF' />
                  ) : (
                    <PretendardText style={styles.saveButtonText}>
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  authorButton: {
    width: 40,
    height: 40,
    backgroundColor: '#000000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  inputButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholder: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9BA2AD',
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
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 10,
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ReplyDetailInputView;
