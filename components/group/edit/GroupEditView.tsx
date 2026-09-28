import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertView from '@/components/alert/AlertView';
import DateRangeCalendarView from '@/components/bag/DateRangeCalendarView';
import PretendardText from '@/components/PretendardText';
import ToastView from '@/components/toast/ToastView';
import GroupStateView from '@/components/group/GroupStateView';
import GroupDestinationFieldView from '@/components/group/form/GroupDestinationFieldView';
import GroupFormFieldView from '@/components/group/form/GroupFormFieldView';
import GroupTextFieldView from '@/components/group/form/GroupTextFieldView';
import LoadingView from '@/components/ui/LoadingView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { setBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import GroupEdit from '@/model/group-edit/GroupEdit';
import GroupEditField from '@/model/group-edit/GroupEditField';
import {
  getGroupErrorMessage,
  getGroupValidationMessage,
} from '@/model/group-error/GroupErrorMessage';
import {
  GROUP_MEETING_NOTE_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
} from '@/model/group/GroupLimits';

interface Props {
  groupEdit: GroupEdit;
}

const SUBMIT_BUTTON_HEIGHT = 48;
const BOTTOM_BAR_TOP_PADDING = 8;
const CONTENT_BOTTOM_EXTRA = 24;
const NATIVE_HEADER_HEIGHT = 44;
const IS_IOS = Platform.OS === 'ios';

/**
 * 그룹 정보 수정 (GRP-7). **방장만** 들어온다.
 * 폼 칸은 만들기 화면과 같은 공용 컴포넌트(`components/group/form/`)를 쓰고,
 * 날짜는 배낭과 같은 범위 선택기를, 여행지는 공용 선택기를 그대로 재사용한다.
 */
const GroupEditView: FC<Props> = ({ groupEdit }) => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  // 저장 직후 같은 틱에 뒤로 가므로 상태가 아니라 ref로 잠금을 푼다(만들기 화면과 같은 이유).
  const completedRef = useRef(false);
  const [nameFieldY, setNameFieldY] = useState(0);
  const [dateFieldY, setDateFieldY] = useState(0);
  const l10n = app.getL10n();
  const isSubmitting = groupEdit.getIsSubmitting();
  const bottomInset = Math.max(insets.bottom, 12);
  const contentBottomPadding =
    SUBMIT_BUTTON_HEIGHT +
    BOTTOM_BAR_TOP_PADDING +
    bottomInset +
    CONTENT_BOTTOM_EXTRA;

  useEffect(() => {
    void groupEdit.initialize();
  }, [groupEdit]);

  usePreventRemove(groupEdit.getIsDirty() || isSubmitting, ({ data }) => {
    if (completedRef.current) {
      navigation.dispatch(data.action);

      return;
    }

    if (isSubmitting) {
      app.getToastManager()?.show({ message: l10n.t('common.processing') });

      return;
    }

    app.getAlertManager()?.show({
      message: l10n.t('group.edit.discardConfirm'),
      confirmText: l10n.t('group.edit.discard'),
      cancelText: l10n.t('group.edit.keepEditing'),
      onConfirm: async () => {
        navigation.dispatch(data.action);
      },
    });
  });

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const getErrorText = (field: GroupEditField): string | null => {
    const error = groupEdit.getFieldError(field);

    if (!error) {
      return null;
    }

    return getGroupValidationMessage(error);
  };

  const handleOpenDestination = () => {
    setBagDestinationPicker({
      currentLocation: groupEdit.getDestination(),
      // 좌표는 폼 상태로만 쓰고 그룹에는 저장하지 않는다(GRP-2 공개 원칙).
      onConfirm: async (location: BagLocation) => {
        groupEdit.setDestination(location);
      },
    });

    router.push('/bag-destination-picker');
  };

  const handleSubmit = async () => {
    try {
      await groupEdit.submit();
      completedRef.current = true;
      app.getToastManager()?.show({ message: l10n.t('group.edit.saved') });
      router.back();
    } catch (error) {
      const field = groupEdit.getFirstErrorField();

      if (field === GroupEditField.Name) {
        scrollRef.current?.scrollTo({ y: nameFieldY, animated: true });
      } else if (field === GroupEditField.Date) {
        scrollRef.current?.scrollTo({ y: dateFieldY, animated: true });
      }

      if (!field) {
        app.getToastManager()?.show({ message: getGroupErrorMessage(error) });
      }
    }
  };

  const renderForm = () => (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          IS_IOS && {
            paddingTop:
              insets.top + NATIVE_HEADER_HEIGHT + AcgLayout.screenPadding,
          },
          { paddingBottom: contentBottomPadding },
        ]}
        contentInsetAdjustmentBehavior='never'
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View onLayout={event => setNameFieldY(event.nativeEvent.layout.y)}>
          <GroupFormFieldView
            label={l10n.t('group.edit.nameLabel')}
            counterText={l10n.t('group.edit.counter', {
              count: groupEdit.getName().length,
              max: GROUP_NAME_MAX_LENGTH,
            })}
            errorText={getErrorText(GroupEditField.Name)}
          >
            <GroupTextFieldView
              value={groupEdit.getName()}
              onChangeText={value => groupEdit.setName(value)}
              placeholder={l10n.t('group.edit.namePlaceholder')}
              maxLength={GROUP_NAME_MAX_LENGTH}
              editable={!isSubmitting}
              accessibilityLabel={l10n.t('group.edit.nameLabel')}
            />
          </GroupFormFieldView>
        </View>
        <View onLayout={event => setDateFieldY(event.nativeEvent.layout.y)}>
          {/* 날짜 UI는 배낭·그룹 만들기와 같은 범위 선택기를 그대로 쓴다. */}
          <DateRangeCalendarView
            startDate={groupEdit.getStartDate()}
            endDate={groupEdit.getEndDate()}
            onStartDateChange={date => groupEdit.setStartDate(date)}
            onEndDateChange={date => groupEdit.setEndDate(date)}
            initialMonth={groupEdit.getStartDate()}
          />
          {getErrorText(GroupEditField.Date) ? (
            <PretendardText style={styles.error}>
              {getErrorText(GroupEditField.Date)}
            </PretendardText>
          ) : null}
        </View>
        <GroupFormFieldView label={l10n.t('group.edit.destinationLabel')}>
          <GroupDestinationFieldView
            destinationName={groupEdit.getDestinationName()}
            placeholder={l10n.t('group.edit.destinationPlaceholder')}
            selectLabel={l10n.t('group.edit.destinationSelect')}
            clearLabel={l10n.t('group.edit.destinationClear')}
            disabled={isSubmitting}
            onPress={handleOpenDestination}
            onClear={() => groupEdit.clearDestination()}
          />
        </GroupFormFieldView>
        <GroupFormFieldView
          label={l10n.t('group.edit.meetingNoteLabel')}
          counterText={l10n.t('group.edit.counter', {
            count: groupEdit.getMeetingNote().length,
            max: GROUP_MEETING_NOTE_MAX_LENGTH,
          })}
          errorText={getErrorText(GroupEditField.MeetingNote)}
        >
          <GroupTextFieldView
            value={groupEdit.getMeetingNote()}
            onChangeText={value => groupEdit.setMeetingNote(value)}
            placeholder={l10n.t('group.edit.meetingNotePlaceholder')}
            maxLength={GROUP_MEETING_NOTE_MAX_LENGTH}
            editable={!isSubmitting}
            accessibilityLabel={l10n.t('group.edit.meetingNoteLabel')}
            multiline
          />
        </GroupFormFieldView>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.edit.submit')}
          accessibilityState={{ disabled: isSubmitting }}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {l10n.t('group.edit.submit')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderContent = () => {
    switch (true) {
      case !groupEdit.getIsInitialized() || groupEdit.getIsLoading(): {
        // 조회 중에는 흰 화면을 두지 않는다 — 참여 화면과 같은 로딩 표시를 쓴다.
        return <LoadingView />;
      }
      case groupEdit.isNotFound(): {
        return (
          <GroupStateView
            title={l10n.t('group.edit.notFound')}
            actionLabel={l10n.t('group.edit.goBack')}
            onPress={handleBack}
          />
        );
      }
      case groupEdit.isNotOwner(): {
        return (
          <GroupStateView
            title={l10n.t('group.edit.notOwner')}
            actionLabel={l10n.t('group.edit.goBack')}
            onPress={handleBack}
          />
        );
      }
      case !!groupEdit.getError(): {
        return (
          <GroupStateView
            title={l10n.t('group.edit.loadFailed')}
            actionLabel={l10n.t('group.edit.goBack')}
            onPress={handleBack}
          />
        );
      }
      default: {
        return renderForm();
      }
    }
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
            headerTitle: l10n.t('group.edit.title'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        {!IS_IOS && (
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('common.back')}
            >
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <PretendardText style={styles.title} weight='semibold'>
                {l10n.t('group.edit.title')}
              </PretendardText>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        )}
        {renderContent()}
      </KeyboardAvoidingView>
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Acg.paper },
  screen: { flex: 1, backgroundColor: Acg.paper },
  header: {
    minHeight: 64,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 44 },
  title: { ...AcgType.screenTitle, color: Acg.ink },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: AcgLayout.screenPadding,
    gap: 24,
  },
  error: { ...AcgType.meta, color: Acg.error, marginTop: 8 },
  bottomBar: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: BOTTOM_BAR_TOP_PADDING,
    backgroundColor: Acg.paper,
  },
  submitButton: {
    width: '100%',
    minHeight: SUBMIT_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { ...AcgType.control, color: Acg.ink },
});

export default observer(GroupEditView);
