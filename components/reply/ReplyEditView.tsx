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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import StarRatingView from '@/components/camp-site/StarRatingView';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { CommentUpdateRequest } from '@/model/reply/Comment';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import useKeyboard from '@/hooks/useKeyboard';
import app from '@/model/app/App';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';
// 고정(비스크롤) 화면 — 자동 인셋을 줄 스크롤 뷰가 없어 네이티브 헤더 높이(44pt)만큼 직접 내린다.
const NATIVE_HEADER_HEIGHT = LiquidLayout.navBar;
/**
 * Android·Web 하단 버튼이 키보드를 피하는 몫.
 *
 * `KeyboardAvoidingView`(`height`)가 이미 컨테이너를 줄이므로 키보드 높이를 그대로 더하면
 * 두 번 밀린다 — 실측으로 잡은 이 값만큼 되돌린다. 키보드가 낮은 기기에서 음수가 되지 않게
 * 기본 여백(16)을 하한으로 둔다.
 */
const KEYBOARD_BUTTON_OFFSET = 260;
const BUTTON_BOTTOM_GAP = 16;

interface Props {
  readonly gearId: string;
  readonly commentId: string;
  readonly initialContent: string;
  // 최상위 댓글(=리뷰)일 때만 별점을 편집한다. 답글은 글만 수정한다.
  readonly isTopLevel: boolean;
  readonly initialRating: number;
}

/**
 * RP-4 리뷰·답글 수정 화면 (Liquid Depth, 2026-08-11 이식).
 *
 * 지면 위에 **종이 카드 인풋** 하나가 놓인 화면이다 — 회색 채움을 두면 지면과 붙어 입력
 * 영역이 사라진다(뒤가 지면이면 종이, 뒤가 종이면 가라앉은 면 — 앱 공통 규칙).
 * 완료는 iOS는 네이티브 headerRight 바 버튼, Android·Web은 하단 잉크 알약이 맡는다.
 */
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

  // LG-2: 완료 액션 — iOS는 네이티브 headerRight로, Android/Web은 하단 알약으로 렌더.
  const renderHeaderComplete = () => (
    <TouchableOpacity
      onPress={handlePressComplete}
      disabled={!canSubmit}
      style={styles.headerCompleteButton}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityLabel='완료'
      accessibilityRole='button'
      accessibilityState={{ disabled: !canSubmit, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator size='small' color={Liquid.ink} />
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
        <View style={styles.chrome}>
          <LiquidGlassCircleButton
            icon='chevron-back'
            onPress={handlePressBack}
            disabled={isLoading}
            accessibilityLabel='뒤로가기'
          />
        </View>
      )}
      <View style={styles.content}>
        {isTopLevel && (
          <View style={styles.ratingSection}>
            <LiquidFieldLabel required>별점</LiquidFieldLabel>
            <StarRatingView editable rating={rating} onChange={setRating} />
          </View>
        )}
        {/* 답글에는 별점이 없고 글만 고친다(RP-2) — 라벨도 무엇을 고치는지 그대로 말한다. */}
        <LiquidFieldLabel>{isTopLevel ? '리뷰 글' : '답글'}</LiquidFieldLabel>
        <TextInput
          style={styles.textInput}
          placeholder={isTopLevel ? '장비가 어땠나요?' : '답글을 남겨보세요'}
          placeholderTextColor={Liquid.inkMuted}
          multiline
          textAlignVertical='top'
          value={content}
          onChangeText={setContent}
          editable={!isLoading}
          accessibilityLabel={isTopLevel ? '리뷰 글' : '답글'}
        />
      </View>
      {/* Android/Web 전용 하단 완료 버튼 — iOS는 headerRight 바 버튼으로 대체(주 액션 1개 유지). */}
      {!IS_IOS && (
        <View
          style={[
            styles.buttonContainer,
            {
              paddingBottom: isKeyboardVisible
                ? Math.max(
                    keyboardHeight - KEYBOARD_BUTTON_OFFSET,
                    BUTTON_BOTTOM_GAP
                  )
                : BUTTON_BOTTOM_GAP,
            },
          ]}
        >
          {/* 저장 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 사라지면
              무엇을 기다리는지 알 수 없다. */}
          <LiquidPillButton
            label='완료'
            variant='primary'
            block
            onPress={handlePressComplete}
            disabled={!canSubmit}
            busy={isLoading}
            leading={
              isLoading ? <ActivityIndicator color={Liquid.surface} /> : null
            }
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 Layout이 받는 LiquidBackdrop이 깐다.
    backgroundColor: 'transparent',
  },
  // 크롬 좌우 여백은 콘텐츠(20)보다 좁다 — 유리 원이 화면 가장자리에 가깝게 앉는다(목업 §8).
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    padding: LiquidLayout.screenH,
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  ratingSection: {
    marginBottom: LiquidLayout.section,
  },
  /**
   * 지면 위 종이 카드 인풋. `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다
   * (TextInput 예외). 여러 줄 입력이라 모서리는 알약이 아니라 타일(20)이다.
   */
  textInput: {
    flex: 1,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
    padding: 16,
    fontSize: LiquidType.body.fontSize,
    fontFamily: 'Pretendard-Medium',
    color: Liquid.ink,
    minHeight: 200,
  },
  buttonContainer: {
    paddingHorizontal: LiquidLayout.screenH,
    backgroundColor: 'transparent',
  },
  // iOS 네이티브 headerRight 완료 버튼 — HIG 최소 터치 타깃 44pt.
  headerCompleteButton: {
    minHeight: LiquidLayout.touchMin,
    minWidth: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCompleteText: {
    fontSize: 15,
    color: Liquid.ink,
  },
  headerCompleteTextDisabled: {
    color: Liquid.inkMuted,
  },
});

export default ReplyEditView;
