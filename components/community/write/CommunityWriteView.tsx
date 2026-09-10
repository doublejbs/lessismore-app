import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Href, Stack, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import AlertView from '@/components/alert/AlertView';
import LogInView from '@/components/login/LogInView';
import ToastView from '@/components/toast/ToastView';
import KeyboardDoneAccessoryView from '@/components/ui/KeyboardDoneAccessoryView';
import { Acg, AcgLayout, AcgRadius, AcgType, Radius } from '@/constants/DesignTokens';
import CommunityError from '@/model/community/CommunityError';
import CommunityImagePipelineError from '@/model/community-image/CommunityImagePipelineError';
import CommunityValidationError from '@/model/community/CommunityValidationError';
import {
  COMMUNITY_BODY_MAX_LENGTH,
  COMMUNITY_TITLE_MAX_LENGTH,
} from '@/model/community/CommunityLimits';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import CommunityWriteField from '@/model/community-write/CommunityWriteField';
import CommunityWriteMode from '@/model/community-write/CommunityWriteMode';
import CommunityWriteAttachmentsView from './CommunityWriteAttachmentsView';
import CommunityWriteImagesView from './CommunityWriteImagesView';
import app from '@/model/app/App';

interface Props {
  write: CommunityWrite;
}

const SUBMIT_BUTTON_HEIGHT = 48;
const BOTTOM_BAR_TOP_PADDING = 8;
const CONTENT_BOTTOM_EXTRA = 24;
const NATIVE_HEADER_HEIGHT = 44;
const IS_IOS = Platform.OS === 'ios';
// iOS 본문 입력 전용 키보드 위 '완료' 바 — Fabric InputAccessoryView는 첫 TextInput 하나에만 붙으므로 입력 하나에 바 하나(CM-2)
const BODY_ACCESSORY_ID = 'communityWriteBodyAccessory';
const VALIDATION_KEYS: Partial<Record<CommunityValidationError, string>> = {
  [CommunityValidationError.TitleLength]: 'titleLength',
  [CommunityValidationError.BodyLength]: 'bodyLength',
  [CommunityValidationError.PollOptionCount]: 'pollOptionCount',
  [CommunityValidationError.PollOptionLength]: 'pollOptionLength',
  [CommunityValidationError.PollOptionDuplicate]: 'pollOptionDuplicate',
  [CommunityValidationError.ImageCount]: 'imageCount',
  [CommunityValidationError.PollLocked]: 'pollLocked',
  [CommunityValidationError.PostNotFound]: 'postNotFound',
};

/**
 * 커뮤니티 글쓰기·수정 화면 View다(CM-2, CM-3, CM-4, CM-5, CM-6, CM-9, CM-11).
 * 본문과 사진은 공개 커뮤니티 모델만 사용하고 개인 장비 사진 경로와 분리한다.
 */
const CommunityWriteView = ({ write }: Props) => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [titleInputY, setTitleInputY] = useState(0);
  const [bodyInputY, setBodyInputY] = useState(0);
  const [bagInputY, setBagInputY] = useState(0);
  const [pollInputY, setPollInputY] = useState(0);
  const l10n = app.getL10n();
  const isEdit = write.getMode() === CommunityWriteMode.Edit;
  const title = isEdit
    ? l10n.t('community.write.editTitle')
    : l10n.t('community.write.title');
  const actionLabel = isEdit
    ? l10n.t('community.write.save')
    : l10n.t('community.write.publish');
  const bottomInset = Math.max(insets.bottom, 12);
  const contentBottomPadding =
    SUBMIT_BUTTON_HEIGHT + BOTTOM_BAR_TOP_PADDING + bottomInset + CONTENT_BOTTOM_EXTRA;
  const shouldPreventDiscard = write.getIsDirty() && !write.getIsSubmitting();
  const shouldPreventRemove = shouldPreventDiscard || write.getIsSubmitting();

  usePreventRemove(shouldPreventRemove, ({ data }) => {
    if (write.getIsSubmitting()) {
      app.getToastManager()?.show({
        message: l10n.t('common.processing'),
      });

      return;
    }

    if (!write.getIsDirty()) {
      navigation.dispatch(data.action);

      return;
    }

    app.getAlertManager()?.show({
      message: l10n.t('community.write.discardConfirm'),
      confirmText: l10n.t('community.write.discard'),
      cancelText: l10n.t('community.write.keepWriting'),
      onConfirm: async () => {
        try {
          await write.cleanupForDiscard(app.getFirebase().getUserId());
        } finally {
          navigation.dispatch(data.action);
        }
      },
    });
  });

  const handleSubmit = async () => {
    try {
      const postId = await write.submit();

      if (!postId) {
        return;
      }

      app.getToastManager()?.show({
        message: isEdit
          ? l10n.t('community.write.updated')
          : l10n.t('community.write.published'),
      });

      if (isEdit) {
        router.back();
      } else {
        router.replace(`/community/${postId}` as Href);
      }
    } catch (error) {
      if (error instanceof CommunityError) {
        const field = write.getFieldErrors().keys().next().value;

        if (error.code === CommunityValidationError.NotLoggedIn) {
          app.getToastManager()?.show({
            message: l10n.t('community.write.failed'),
          });
          app.getLogInAlertManager()?.show();

          return;
        }

        if (field === CommunityWriteField.Title) {
          scrollRef.current?.scrollTo({ y: titleInputY, animated: true });
        } else if (field === CommunityWriteField.Body) {
          scrollRef.current?.scrollTo({ y: bodyInputY, animated: true });
        } else if (field === CommunityWriteField.Bag) {
          scrollRef.current?.scrollTo({ y: bagInputY, animated: true });
        } else if (field === CommunityWriteField.PollOptions) {
          scrollRef.current?.scrollTo({ y: pollInputY, animated: true });
        }

        return;
      }

      if (error instanceof CommunityImagePipelineError) {
        app.getToastManager()?.show({
          message: l10n.t('community.write.image.failed'),
        });

        return;
      }

      app.getToastManager()?.show({
        message: l10n.t('community.write.failed'),
      });
    }
  };

  const getErrorText = (field: CommunityWriteField): string | null => {
    const error = write.getFieldErrors().get(field);

    if (!error) {
      return null;
    }

    const key = VALIDATION_KEYS[error] ?? 'failed';

    return l10n.t(`community.validation.${key}`);
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({
          ios: 'padding',
          android: 'height',
          default: undefined,
        })}
      >
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: title,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Acg.ink} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <PretendardText style={styles.title} weight='semibold'>
              {title}
            </PretendardText>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          IS_IOS && {
            paddingTop: insets.top + NATIVE_HEADER_HEIGHT + AcgLayout.screenPadding,
          },
          { paddingBottom: contentBottomPadding },
        ]}
        contentInsetAdjustmentBehavior='never'
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.authorRow}
          accessible
          accessibilityLabel={l10n.t('community.write.authorAccessibility', {
            name: write.getAuthorName(),
          })}
        >
          <Ionicons name='person-circle-outline' size={20} color={Acg.ink} />
          <PretendardText style={styles.author} weight='semibold'>
            {write.getAuthorName()}
          </PretendardText>
        </View>
        <View onLayout={(event) => setTitleInputY(event.nativeEvent.layout.y)} style={styles.field}>
          <View style={styles.fieldHeader}>
            <PretendardText style={styles.label} weight='semibold'>
              {l10n.t('community.write.titleLabel')}
            </PretendardText>
            <PretendardText style={styles.counter}>
              {l10n.t('community.write.counter', { count: write.getTitle().length, max: COMMUNITY_TITLE_MAX_LENGTH })}
            </PretendardText>
          </View>
          <TextInput
            style={styles.input}
            value={write.getTitle()}
            onChangeText={(value) => write.setTitle(value)}
            placeholder={l10n.t('community.write.titlePlaceholder')}
            placeholderTextColor={Acg.textMuted}
            maxLength={COMMUNITY_TITLE_MAX_LENGTH}
            editable={!write.getIsSubmitting()}
            returnKeyType='done'
            accessibilityState={{ disabled: write.getIsSubmitting() }}
          />
          {getErrorText(CommunityWriteField.Title) && (
            <PretendardText style={styles.error}>
              {getErrorText(CommunityWriteField.Title)}
            </PretendardText>
          )}
        </View>
        <View onLayout={(event) => setBodyInputY(event.nativeEvent.layout.y)} style={styles.field}>
          <View style={styles.fieldHeader}>
            <PretendardText style={styles.label} weight='semibold'>
              {l10n.t(
                write.hasBagSnapshot() || write.hasPoll()
                  ? 'community.write.bodyLabelOptional'
                  : 'community.write.bodyLabel'
              )}
            </PretendardText>
            <PretendardText style={styles.counter}>
              {l10n.t('community.write.counter', { count: write.getBody().length, max: COMMUNITY_BODY_MAX_LENGTH })}
            </PretendardText>
          </View>
          <TextInput
            style={[
              styles.input,
              styles.bodyInput,
            ]}
            value={write.getBody()}
            onChangeText={(value) => write.setBody(value)}
            placeholder={l10n.t('community.write.bodyPlaceholder')}
            placeholderTextColor={Acg.textMuted}
            multiline
            textAlignVertical='top'
            maxLength={COMMUNITY_BODY_MAX_LENGTH}
            editable={!write.getIsSubmitting()}
            {...(IS_IOS ? { inputAccessoryViewID: BODY_ACCESSORY_ID } : {})}
            accessibilityState={{ disabled: write.getIsSubmitting() }}
          />
          {getErrorText(CommunityWriteField.Body) && (
            <PretendardText style={styles.error}>
              {getErrorText(CommunityWriteField.Body)}
            </PretendardText>
          )}
        </View>
        <CommunityWriteImagesView write={write} />
        <View
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            setBagInputY(y);
            setPollInputY(y);
          }}
        >
          <CommunityWriteAttachmentsView write={write} />
          {getErrorText(CommunityWriteField.Bag) && (
            <PretendardText style={styles.error}>
              {getErrorText(CommunityWriteField.Bag)}
            </PretendardText>
          )}
          {getErrorText(CommunityWriteField.PollOptions) && (
            <PretendardText style={styles.error}>
              {getErrorText(CommunityWriteField.PollOptions)}
            </PretendardText>
          )}
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.submitButton, write.getIsSubmitting() && styles.submitDisabled]}
          onPress={() => void handleSubmit()}
          disabled={write.getIsSubmitting()}
          accessibilityRole='button'
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: write.getIsSubmitting() }}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {actionLabel}
          </PretendardText>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      {/* 여러 줄 본문 입력 전용 iOS 키보드 '완료' 바 — 본문 TextInput보다 트리에서 뒤에 둔다. */}
      <KeyboardDoneAccessoryView nativeID={BODY_ACCESSORY_ID} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  screen: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: AcgLayout.screenPadding,
    gap: 24,
  },
  // 홈 프로필 버튼과 같은 사람 아이콘을 앞에 두어 '작성자(내 계정)' 줄임을 알린다 — 라벨 접두 없이.
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // 상세 헤더의 작성자 줄과 같은 문법(14 잉크 semibold) — 회색 메타는 흰 지면에서 잘 안 보였다.
  author: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  field: {
    gap: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  counter: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 14,
    paddingVertical: 14,
    // 단일행 TextInput에 lineHeight를 얹으면 iOS에서 글자가 아래로 치우쳐 상하 패딩이 어긋난다
    // (BagFormContent와 같은 처리). 줄간은 여러 줄 본문에서만 준다.
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    color: Acg.ink,
  },
  bodyInput: {
    minHeight: 200,
    lineHeight: AcgType.control.lineHeight,
  },
  error: {
    ...AcgType.meta,
    color: Acg.error,
  },
  bottomBar: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
    backgroundColor: Acg.paper,
  },
  submitButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(CommunityWriteView);
