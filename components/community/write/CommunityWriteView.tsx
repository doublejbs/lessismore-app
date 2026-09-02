import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType, Color, Radius } from '@/constants/DesignTokens';
import CommunityError from '@/model/community/CommunityError';
import CommunityImagePipelineError from '@/model/community-image/CommunityImagePipelineError';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityValidationError from '@/model/community/CommunityValidationError';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import CommunityWriteField from '@/model/community-write/CommunityWriteField';
import CommunityWriteMode from '@/model/community-write/CommunityWriteMode';
import CommunityWriteBagSelectView from './CommunityWriteBagSelectView';
import CommunityWriteImagesView from './CommunityWriteImagesView';
import CommunityWritePollOptionsView from './CommunityWritePollOptionsView';
import app from '@/model/app/App';

interface Props {
  write: CommunityWrite;
}

const SUBMIT_BUTTON_HEIGHT = 48;
const BOTTOM_BAR_TOP_PADDING = 8;
const CONTENT_BOTTOM_EXTRA = 24;

const getTypeLabel = (type: CommunityPostType): string => {
  switch (type) {
    case CommunityPostType.Question:
      return app.getL10n().t('community.type.question');
    case CommunityPostType.BagReview:
      return app.getL10n().t('community.type.bagReview');
    case CommunityPostType.Poll:
      return app.getL10n().t('community.type.poll');
  }
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
  const canEditPollStructure = write.canEditPollStructure();
  const bottomInset = Math.max(insets.bottom, 12);
  const contentBottomPadding =
    SUBMIT_BUTTON_HEIGHT + BOTTOM_BAR_TOP_PADDING + bottomInset + CONTENT_BOTTOM_EXTRA;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!write.isDirty || write.isSubmitting) {
        return;
      }

      event.preventDefault();
      app.getAlertManager()?.show({
        message: l10n.t('community.write.discardConfirm'),
        confirmText: l10n.t('community.write.discard'),
        onConfirm: async () => {
          try {
            await write.cleanupForDiscard(app.getFirebase().getUserId());
          } finally {
            navigation.dispatch(event.data.action);
          }
        },
      });
    });

    return unsubscribe;
  }, [l10n, navigation, write]);

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
        router.replace(`/community/${postId}` as never);
      }
    } catch (error) {
      if (error instanceof CommunityError) {
        const field = write.fieldErrors.keys().next().value;

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
    const error = write.fieldErrors.get(field);

    if (!error) {
      return null;
    }

    const key =
      error === CommunityValidationError.TitleLength
        ? 'titleLength'
        : error === CommunityValidationError.BodyLength
          ? 'bodyLength'
          : error === CommunityValidationError.PollOptionCount
            ? 'pollOptionCount'
            : error === CommunityValidationError.PollOptionLength
              ? 'pollOptionLength'
              : error === CommunityValidationError.PollOptionDuplicate
                ? 'pollOptionDuplicate'
                : error === CommunityValidationError.BagSnapshotRequired
                  ? 'bagSnapshotRequired'
                  : error === CommunityValidationError.ImageCount
                    ? 'imageCount'
                    : error === CommunityValidationError.PollLocked
                      ? 'pollLocked'
                      : error === CommunityValidationError.PostNotFound
                        ? 'postNotFound'
                        : 'notLoggedIn';

    return l10n.t(`community.validation.${key}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.select({ ios: 'padding', android: 'height', default: undefined })}
    >
      <Stack.Screen options={{ headerShown: false }} />
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
          <PretendardText style={styles.typeLabel}>
            {getTypeLabel(write.type)}
          </PretendardText>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <PretendardText style={styles.author}>
          {`${l10n.t('community.write.author')}: ${write.getAuthorName()}`}
        </PretendardText>
        <View onLayout={(event) => setTitleInputY(event.nativeEvent.layout.y)} style={styles.field}>
          <View style={styles.fieldHeader}>
            <PretendardText style={styles.label} weight='semibold'>
              {l10n.t('community.write.titleLabel')}
            </PretendardText>
            <PretendardText style={styles.counter}>
              {l10n.t('community.write.counter', { count: write.title.length, max: 80 })}
            </PretendardText>
          </View>
          <TextInput
            style={[styles.input, !canEditPollStructure && styles.inputDisabled]}
            value={write.title}
            onChangeText={(value) => write.setTitle(value)}
            placeholder={l10n.t('community.write.titlePlaceholder')}
            placeholderTextColor={Color.textSecondary}
            maxLength={80}
            editable={canEditPollStructure}
            accessibilityState={{ disabled: !canEditPollStructure }}
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
              {l10n.t('community.write.bodyLabel')}
            </PretendardText>
            <PretendardText style={styles.counter}>
              {l10n.t('community.write.counter', { count: write.body.length, max: 5000 })}
            </PretendardText>
          </View>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={write.body}
            onChangeText={(value) => write.setBody(value)}
            placeholder={l10n.t('community.write.bodyPlaceholder')}
            placeholderTextColor={Color.textSecondary}
            multiline
            textAlignVertical='top'
            maxLength={5000}
          />
          {getErrorText(CommunityWriteField.Body) && (
            <PretendardText style={styles.error}>
              {getErrorText(CommunityWriteField.Body)}
            </PretendardText>
          )}
        </View>
        {write.type === CommunityPostType.BagReview && (
          <View onLayout={(event) => setBagInputY(event.nativeEvent.layout.y)} style={styles.subsection}>
            <CommunityWriteBagSelectView write={write} />
            {getErrorText(CommunityWriteField.Bag) && (
              <PretendardText style={styles.error}>{getErrorText(CommunityWriteField.Bag)}</PretendardText>
            )}
          </View>
        )}
        {write.type === CommunityPostType.Poll && (
          <View onLayout={(event) => setPollInputY(event.nativeEvent.layout.y)} style={styles.subsection}>
            <CommunityWritePollOptionsView write={write} />
            {getErrorText(CommunityWriteField.PollOptions) && (
              <PretendardText style={styles.error}>{getErrorText(CommunityWriteField.PollOptions)}</PretendardText>
            )}
          </View>
        )}
        <CommunityWriteImagesView write={write} />
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.submitButton, write.isSubmitting && styles.submitDisabled]}
          onPress={() => void handleSubmit()}
          disabled={write.isSubmitting}
          accessibilityRole='button'
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: write.isSubmitting }}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {actionLabel}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
    gap: 2,
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  typeLabel: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 132,
    gap: 24,
  },
  author: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  field: {
    gap: 8,
  },
  subsection: {
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
    ...AcgType.control,
    color: Acg.ink,
  },
  bodyInput: {
    minHeight: 180,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  error: {
    ...AcgType.meta,
    color: '#B3261E',
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
