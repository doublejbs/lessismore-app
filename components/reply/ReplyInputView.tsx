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
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';

const MAX_CONTENT_LENGTH = 1000;
// iOS 멀티라인 입력은 리턴키로 키보드를 못 닫으므로 키보드 위 '완료' 액세서리를 붙인다.
const CONTENT_ACCESSORY_ID = 'replyInputContentAccessory';

interface Props {
  reply: Reply;
}

/**
 * RP-1 장비 리뷰 작성 화면 (Liquid Depth, 2026-08-11 이식) — 네이티브 formSheet 라우트.
 *
 * 별점(필수) + 리뷰 글(선택)로 구성한다. **시트는 종이 면이다** — 지면 위 카드가 아니라
 * 입력이 곧 화면이라 카드를 겹치지 않고, 입력 면만 `surfaceSunken`으로 가라앉힌다
 * (박지 후기 작성 CS-8과 같은 문법).
 */
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
        <LiquidFieldLabel required>별점</LiquidFieldLabel>
        <StarRatingView editable rating={rating} onChange={setRating} />
      </View>

      <View style={styles.section}>
        <LiquidFieldLabel>리뷰 글</LiquidFieldLabel>
        <TextInput
          style={styles.contentInput}
          placeholder='장비가 어땠나요? (선택)'
          placeholderTextColor={Liquid.inkMuted}
          value={content}
          onChangeText={setContent}
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          textAlignVertical='top'
          editable={!isLoading}
          inputAccessoryViewID={isAndroid ? undefined : CONTENT_ACCESSORY_ID}
          accessibilityLabel='리뷰 글'
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
        <LiquidPillButton
          label='취소'
          variant='secondary'
          onPress={handlePressCancel}
          disabled={isLoading}
          style={styles.button}
        />
        {/* 저장 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 사라지면
            무엇을 기다리는지 알 수 없다(박지 후기 작성 CS-8과 같은 처리). */}
        <LiquidPillButton
          label='확인'
          variant='primary'
          onPress={handlePressComplete}
          disabled={confirmDisabled}
          busy={isLoading}
          leading={
            isLoading ? <ActivityIndicator color={Liquid.surface} /> : null
          }
          style={styles.button}
        />
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
  container: {
    // 폼 시트는 종이 면이다 — 입력·선택 면만 `surfaceSunken`으로 가라앉힌다.
    backgroundColor: Liquid.surface,
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
    paddingHorizontal: LiquidLayout.screenH,
    marginBottom: 20,
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    marginBottom: 24,
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  section: {
    flexDirection: 'column',
    marginBottom: LiquidLayout.section,
  },
  /**
   * `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다(TextInput 예외).
   * 여러 줄 입력이라 모서리는 알약이 아니라 타일(20)이다.
   */
  contentInput: {
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: LiquidType.body.fontSize,
    fontFamily: 'Pretendard-Medium',
    color: Liquid.ink,
    minHeight: 100,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: LiquidLayout.listGap,
    paddingHorizontal: LiquidLayout.screenH,
  },
  button: {
    flex: 1,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Liquid.surfaceSunken,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Liquid.hairline,
  },
  accessoryDone: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default ReplyInputView;
