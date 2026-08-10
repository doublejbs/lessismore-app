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
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidGlassField, {
  LIQUID_FIELD_HEIGHT,
} from '@/components/liquid/LiquidGlassField';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
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
// 답글 길이 상한 — 리뷰 글(RP-1)과 같은 값이다.
const MAX_CONTENT_LENGTH = 1000;
// 여러 줄 답글이 자랄 수 있는 최대 높이. 넘으면 필드 안에서 스크롤한다.
const GROWN_MAX_HEIGHT = 120;
// 포커스가 실제로 붙기까지의 지연 — 필드가 렌더된 다음 프레임에 focus를 건다.
const FOCUS_DELAY = 100;

/**
 * RP-2 답글 입력 바 (Liquid Depth, 2026-08-11 이식).
 *
 * 지면 위에 놓인 바라 띠 면을 깔지 않는다 — 흰 띠가 화면 하단을 가로지르면 지면이 끊긴다.
 * 대신 **필드가 유리**이고(공용 `LiquidGlassField` — 검색 필드·리뷰 쓰기 진입과 같은 셸),
 * 값이 들어오면 채움을 한 단계 진하게 덮는다. 저장은 잉크 알약이되 주 액션 높이(54)가 아니라
 * 필드와 같은 48이다 — 바 안에 든 인라인 액션이라 화면의 주 액션 자리를 가져가지 않는다.
 */
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
        }, FOCUS_DELAY);
      }
    }, [replyTarget]);

    const handlePressInput = () => {
      setIsInputMode(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, FOCUS_DELAY);
    };

    const handleSave = async () => {
      if (!text.trim() || isSaving) {
        return;
      }

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

    const canSave = Boolean(text.trim()) && !isSaving;

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
              <LiquidGlassField
                onPress={handlePressInput}
                accessibilityLabel='답글 쓰기'
                style={styles.field}
              >
                <View style={styles.fieldBody}>
                  <Ionicons
                    name='chatbubble-outline'
                    size={18}
                    color={Liquid.inkMuted}
                  />
                  <PretendardText style={styles.placeholder}>
                    답글을 남겨보세요
                  </PretendardText>
                </View>
              </LiquidGlassField>
            ) : (
              <LiquidGlassField
                filled
                grownMaxHeight={GROWN_MAX_HEIGHT}
                style={styles.field}
              >
                <View style={styles.fieldBody}>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder='답글을 남겨보세요'
                    placeholderTextColor={Liquid.inkMuted}
                    value={text}
                    onChangeText={setText}
                    onBlur={handleBlur}
                    multiline
                    maxLength={MAX_CONTENT_LENGTH}
                    accessibilityLabel='답글 입력'
                  />
                </View>
              </LiquidGlassField>
            )}

            {isInputMode ? (
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveDisabled]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
                accessibilityLabel='답글 저장'
                accessibilityState={{ disabled: !canSave, busy: isSaving }}
              >
                {isSaving ? (
                  <ActivityIndicator size='small' color={Liquid.surface} />
                ) : (
                  <PretendardText weight='semibold' style={styles.saveText}>
                    저장
                  </PretendardText>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: INPUT_BAR_GAP,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  // 행 안에서 저장 버튼을 뺀 남는 폭을 채운다.
  field: {
    flex: 1,
  },
  fieldBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  placeholder: {
    flex: 1,
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkMuted,
  },
  textInput: {
    flex: 1,
    // TextInput은 PretendardText로 감쌀 수 없어 서체를 직접 지정한다 — 지정하지 않으면
    // 입력값만 시스템 서체로 렌더돼 화면에서 튄다.
    fontFamily: 'Pretendard-Medium',
    fontSize: 15.5,
    lineHeight: 21,
    color: Liquid.ink,
    padding: 0,
  },
  // 바 안에 든 인라인 액션이라 주 액션 알약 높이(54)를 쓰지 않는다. 필드와 같은 48이라
  // HIG 44pt를 넘는다.
  saveButton: {
    minHeight: LIQUID_FIELD_HEIGHT,
    paddingHorizontal: 20,
    borderRadius: LIQUID_FIELD_HEIGHT / 2,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: LiquidShadow.glassSm,
  },
  // 누를 수 없는 상태 — 면·모서리는 그대로 두고 투명도만 낮춘다(색을 바꾸면 다른 버튼처럼 읽힌다).
  saveDisabled: {
    opacity: LiquidMotion.disabledOpacity,
  },
  saveText: {
    fontSize: LiquidType.body.fontSize,
    color: Liquid.surface,
  },
});

export default ReplyDetailInputView;
