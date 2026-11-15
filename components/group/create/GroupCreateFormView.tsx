import { FC, RefObject } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import DateRangeCalendarView from '@/components/bag/DateRangeCalendarView';
import GroupDestinationFieldView from '@/components/group/form/GroupDestinationFieldView';
import GroupFormFieldView from '@/components/group/form/GroupFormFieldView';
import GroupTextFieldView from '@/components/group/form/GroupTextFieldView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import GroupCreate from '@/model/group-create/GroupCreate';
import GroupCreateField from '@/model/group-create/GroupCreateField';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import { GROUP_NAME_MAX_LENGTH } from '@/model/group/GroupLimits';

interface Props {
  groupCreate: GroupCreate;
  scrollRef: RefObject<ScrollView | null>;
  onNameFieldLayout: (y: number) => void;
  onDateFieldLayout: (y: number) => void;
  onOpenDestination: () => void;
  onSubmit: () => void;
}

const SUBMIT_BUTTON_HEIGHT = 48;
const BOTTOM_BAR_TOP_PADDING = 8;
const CONTENT_BOTTOM_EXTRA = 24;
const NATIVE_HEADER_HEIGHT = 44;
const IS_IOS = Platform.OS === 'ios';

/**
 * 그룹 만들기 폼 본문과 하단 만들기 알약 (GRP-2). 화면 수명·이동·이탈 확인은 부모(`GroupCreateView`)가 맡는다.
 */
const GroupCreateFormView: FC<Props> = ({
  groupCreate,
  scrollRef,
  onNameFieldLayout,
  onDateFieldLayout,
  onOpenDestination,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const isSubmitting = groupCreate.getIsSubmitting();
  const bottomInset = Math.max(insets.bottom, 12);
  const contentBottomPadding =
    SUBMIT_BUTTON_HEIGHT + BOTTOM_BAR_TOP_PADDING + bottomInset + CONTENT_BOTTOM_EXTRA;
  const destinationName = groupCreate.getDestinationName();

  const getErrorText = (field: GroupCreateField): string | null => {
    const error = groupCreate.getFieldError(field);

    if (!error) {
      return null;
    }

    return getGroupValidationMessage(error);
  };

  return (
    <>
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
        <View onLayout={event => onNameFieldLayout(event.nativeEvent.layout.y)}>
          <GroupFormFieldView
            label={l10n.t('group.create.nameLabel')}
            counterText={l10n.t('group.create.counter', {
              count: groupCreate.getName().length,
              max: GROUP_NAME_MAX_LENGTH,
            })}
            errorText={getErrorText(GroupCreateField.Name)}
          >
            <GroupTextFieldView
              value={groupCreate.getName()}
              onChangeText={value => groupCreate.setName(value)}
              placeholder={l10n.t('group.create.namePlaceholder')}
              maxLength={GROUP_NAME_MAX_LENGTH}
              editable={!isSubmitting}
              accessibilityLabel={l10n.t('group.create.nameLabel')}
            />
          </GroupFormFieldView>
        </View>
        <View onLayout={event => onDateFieldLayout(event.nativeEvent.layout.y)}>
          {/* 날짜 UI는 배낭 생성·편집과 같은 범위 선택기를 그대로 쓴다(새 달력을 만들지 않는다). */}
          <DateRangeCalendarView
            startDate={groupCreate.getStartDate()}
            endDate={groupCreate.getEndDate()}
            onStartDateChange={date => groupCreate.setStartDate(date)}
            onEndDateChange={date => groupCreate.setEndDate(date)}
            initialMonth={groupCreate.getStartDate()}
          />
          {getErrorText(GroupCreateField.Date) ? (
            <PretendardText style={styles.error}>
              {getErrorText(GroupCreateField.Date)}
            </PretendardText>
          ) : null}
        </View>
        <GroupFormFieldView label={l10n.t('group.create.destinationLabel')}>
          <GroupDestinationFieldView
            destinationName={destinationName}
            placeholder={l10n.t('group.create.destinationPlaceholder')}
            selectLabel={l10n.t('group.create.destinationSelect')}
            clearLabel={l10n.t('group.create.destinationClear')}
            disabled={isSubmitting}
            onPress={onOpenDestination}
            onClear={() => groupCreate.clearDestination()}
          />
        </GroupFormFieldView>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.create.submit')}
          accessibilityState={{ disabled: isSubmitting }}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {l10n.t('group.create.submit')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: AcgLayout.screenPadding,
    gap: 24,
  },
  error: {
    ...AcgType.meta,
    color: Acg.error,
    marginTop: 8,
  },
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
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(GroupCreateFormView);
