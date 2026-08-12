import Reply from '@/model/reply/Reply';
import { FC, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  InputAccessoryView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import StarRatingView from '@/components/camp-site/StarRatingView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

const MAX_CONTENT_LENGTH = 1000;
// iOS 멀티라인 입력은 리턴키로 키보드를 못 닫으므로 키보드 위 '완료' 액세서리를 붙인다.
const CONTENT_ACCESSORY_ID = 'replyInputContentAccessory';

interface Props {
  reply: Reply;
}

// 장비 리뷰 작성 화면 — 네이티브 formSheet 라우트. 별점(필수) + 리뷰 글(선택)로 구성한다.
const ReplyInputView: FC<Props> = ({ reply }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePressCancel = () => {
    if (isLoading) {
      return;
    }

    router.back();
  };

  const handlePressComplete = async () => {
    if (rating === 0 || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // confirm 내부에서 작성 성공 시 router.back()으로 시트를 닫는다.
      await reply.confirm(content.trim(), rating);
      app.getAnalyticsManager()?.logClick('reply_submit', { depth: 'comment' });
    } catch (error) {
      Alert.alert(
        '리뷰 작성 실패',
        error instanceof Error
          ? error.message
          : '리뷰 작성 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDisabled = rating === 0 || isLoading;

  // 본문(별점 + 리뷰 글) — Android는 스크롤 컨테이너로 감싼다.
  const bodyContent = (
    <>
      <PretendardText weight='bold' style={styles.title}>
        리뷰 쓰기
      </PretendardText>

      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.label}>
          별점
        </PretendardText>
        <StarRatingView editable rating={rating} onChange={setRating} />
      </View>

      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.label}>
          리뷰 글
        </PretendardText>
        <TextInput
          style={styles.contentInput}
          placeholder='장비가 어땠나요? (선택)'
          placeholderTextColor={Acg.textMuted}
          value={content}
          onChangeText={setContent}
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          textAlignVertical='top'
          editable={!isLoading}
          inputAccessoryViewID={isAndroid ? undefined : CONTENT_ACCESSORY_ID}
        />
        <PretendardText style={styles.counter}>
          {content.length}/{MAX_CONTENT_LENGTH}
        </PretendardText>
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        isAndroid && styles.containerFill,
        {
          // Android formSheet는 제스처 바 인셋을 제대로 못 잡아 하단 패딩을 넉넉히 확보한다.
          paddingBottom: isAndroid
            ? Math.max(insets.bottom, 24)
            : Math.max(insets.bottom - 12, 12),
        },
      ]}
    >
      {isAndroid ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          {bodyContent}
        </ScrollView>
      ) : (
        // iOS: 빈 영역을 탭하면 키보드를 닫는다(멀티라인 입력 대응).
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>{bodyContent}</View>
        </TouchableWithoutFeedback>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handlePressCancel}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <PretendardText weight='semibold' style={styles.cancelButtonText}>
            취소
          </PretendardText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            confirmDisabled && styles.confirmButtonDisabled,
          ]}
          onPress={handlePressComplete}
          activeOpacity={0.7}
          disabled={confirmDisabled}
        >
          {isLoading ? (
            <ActivityIndicator size='small' color={Acg.paper} />
          ) : (
            <PretendardText weight='semibold' style={styles.confirmButtonText}>
              확인
            </PretendardText>
          )}
        </TouchableOpacity>
      </View>

      {/* iOS 키보드 위 '완료' 바 — 멀티라인 입력에서 키보드를 내린다. */}
      {!isAndroid && (
        <InputAccessoryView nativeID={CONTENT_ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              accessibilityRole='button'
              accessibilityLabel='키보드 닫기'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PretendardText weight='semibold' style={styles.accessoryDone}>
                완료
              </PretendardText>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // 시트는 종이 면이다 — 지면(그레인)은 시트 뒤 화면이 이미 깔고 있다.
  container: {
    backgroundColor: Acg.paper,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다.
    paddingTop: 52,
  },
  // Android는 고정 높이(0.9) 시트라 컨테이너를 채워 버튼을 하단에 고정한다.
  containerFill: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: AcgLayout.screenH,
    marginBottom: 20,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    marginBottom: 24,
  },
  section: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 24,
  },
  label: {
    ...AcgType.sectionSubtitle,
    color: Acg.textMuted,
  },
  // 종이 면 위 인풋이라 채움은 지면색이다 — 흰 면 위 회색 면을 또 두면 층이 하나 늘어난다.
  contentInput: {
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...AcgType.rowSubtitle,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
    minHeight: 100,
  },
  counter: {
    alignSelf: 'flex-end',
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: AcgLayout.screenH,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...AcgType.control,
    color: Acg.ink,
    paddingVertical: 12,
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Acg.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...AcgType.control,
    color: Acg.paper,
    paddingVertical: 12,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Acg.bg,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  accessoryDone: {
    ...AcgType.control,
    color: Acg.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default ReplyInputView;
