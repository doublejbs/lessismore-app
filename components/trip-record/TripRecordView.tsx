import { FC, ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import ToastView from '@/components/toast/ToastView';
import LogInView from '@/components/login/LogInView';
import KeyboardDoneAccessoryView from '@/components/ui/KeyboardDoneAccessoryView';
import CommunityWriteImagesView from '@/components/community/write/CommunityWriteImagesView';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import {
  COMMUNITY_BODY_MAX_LENGTH,
  COMMUNITY_TITLE_MAX_LENGTH,
} from '@/model/community/CommunityLimits';
import TripRecord from '@/model/trip-record/TripRecord';
import app from '@/model/app/App';
import useTripRecordState from './useTripRecordState';

interface Props {
  tripRecord: TripRecord;
}

const IS_ANDROID = Platform.OS === 'android';
const IS_IOS = Platform.OS === 'ios';
const SUBMIT_BUTTON_HEIGHT = 52;
const BODY_MIN_HEIGHT = 120;
// 여러 줄 본문 전용 iOS 키보드 '완료' 바 — 입력 하나에 바 하나(CM-2 Fabric 제약).
const BODY_ACCESSORY_ID = 'tripRecordBodyAccessory';

/**
 * 여행 기록 시트 View다(CM-16). 위→아래: 공개 안내 → 배낭 요약 한 줄 → 사진(첫 장 필수) →
 * 한 줄 → 접힌 `더 쓰기` → 라임 `기록 남기기`(시트의 유일한 주 액션).
 */
const TripRecordView: FC<Props> = ({ tripRecord }) => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const { write, handleClose, handleSubmit, getTitleError } =
    useTripRecordState(tripRecord);
  const busy = tripRecord.isBusy();
  const canSubmit = tripRecord.canSubmit();
  const titleError = getTitleError();

  const body: ReactNode = (
    <>
      <View style={styles.headerGroup}>
        <View style={styles.header}>
          <PretendardText
            weight='semibold'
            style={styles.title}
            accessibilityRole='header'
          >
            {l10n.t('tripRecord.title')}
          </PretendardText>
          <TouchableOpacity
            style={[styles.closeButton, busy && styles.closeButtonDisabled]}
            onPress={handleClose}
            disabled={busy}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('tripRecord.closeAccessibility')}
            accessibilityState={{ disabled: busy }}
          >
            <Ionicons name='close' size={24} color={Acg.ink} />
          </TouchableOpacity>
        </View>
        {/* 공개임을 모르고 올리지 않게 시트 맨 위에 둔다(CM-16). */}
        <PretendardText style={styles.publicNotice}>
          {l10n.t('tripRecord.publicNotice')}
        </PretendardText>
      </View>
      <View style={styles.summaryRow}>
        <Ionicons name='bag-outline' size={18} color={Acg.ink} />
        <PretendardText style={styles.summaryText} numberOfLines={2}>
          {tripRecord.getBagSummary()}
        </PretendardText>
      </View>
      <CommunityWriteImagesView write={write} />
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <PretendardText style={styles.label} weight='semibold'>
            {l10n.t('tripRecord.titleLabel')}
          </PretendardText>
          <PretendardText style={styles.counter}>
            {l10n.t('community.write.counter', {
              count: write.getTitle().length,
              max: COMMUNITY_TITLE_MAX_LENGTH,
            })}
          </PretendardText>
        </View>
        <TextInput
          style={styles.input}
          value={write.getTitle()}
          onChangeText={value => write.setTitle(value)}
          placeholder={l10n.t('tripRecord.titlePlaceholder')}
          placeholderTextColor={Acg.textMuted}
          maxLength={COMMUNITY_TITLE_MAX_LENGTH}
          returnKeyType='done'
          editable={!busy}
          accessibilityLabel={l10n.t('tripRecord.titleLabel')}
        />
        {titleError ? (
          <PretendardText style={styles.error}>{titleError}</PretendardText>
        ) : null}
      </View>
      {tripRecord.isBodyExpanded() ? (
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <PretendardText style={styles.label} weight='semibold'>
              {l10n.t('tripRecord.bodyLabel')}
            </PretendardText>
            <PretendardText style={styles.counter}>
              {l10n.t('community.write.counter', {
                count: write.getBody().length,
                max: COMMUNITY_BODY_MAX_LENGTH,
              })}
            </PretendardText>
          </View>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={write.getBody()}
            onChangeText={value => write.setBody(value)}
            placeholder={l10n.t('tripRecord.bodyPlaceholder')}
            placeholderTextColor={Acg.textMuted}
            maxLength={COMMUNITY_BODY_MAX_LENGTH}
            multiline
            textAlignVertical='top'
            editable={!busy}
            autoFocus
            accessibilityLabel={l10n.t('tripRecord.bodyLabel')}
            {...(IS_IOS ? { inputAccessoryViewID: BODY_ACCESSORY_ID } : {})}
          />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => tripRecord.expandBody()}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('tripRecord.more')}
        >
          <PretendardText style={styles.moreText} weight='medium'>
            {l10n.t('tripRecord.more')}
          </PretendardText>
          <Ionicons name='chevron-down' size={16} color={Acg.ink} />
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.container,
        IS_ANDROID && styles.containerFill,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {IS_ANDROID ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        // iOS fitToContents 시트 — 빈 곳을 탭하면 키보드를 내린다.
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.content}>{body}</View>
        </TouchableWithoutFeedback>
      )}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('tripRecord.submit')}
          accessibilityState={{ disabled: !canSubmit, busy }}
          {...(!tripRecord.hasPhoto()
            ? { accessibilityHint: l10n.t('tripRecord.photoRequired') }
            : {})}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {busy ? l10n.t('common.processing') : l10n.t('tripRecord.submit')}
          </PretendardText>
        </TouchableOpacity>
        {/* 비활성 이유는 색이 아니라 문장으로 알린다(CM-16). */}
        {!tripRecord.hasPhoto() ? (
          <PretendardText style={styles.reason}>
            {l10n.t('tripRecord.photoRequired')}
          </PretendardText>
        ) : null}
      </View>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      {/* 여러 줄 본문 입력 전용 iOS 키보드 '완료' 바 — 본문 TextInput보다 트리에서 뒤에 둔다. */}
      {tripRecord.isBodyExpanded() ? (
        <KeyboardDoneAccessoryView nativeID={BODY_ACCESSORY_ID} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Acg.paper,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래에서 시작한다(camp-review-write와 같다).
    paddingTop: 28,
  },
  // Android는 고정 높이 시트라 컨테이너를 채워 버튼을 하단에 고정한다.
  containerFill: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 20,
    gap: 20,
  },
  headerGroup: {
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.4,
  },
  publicNotice: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  summaryText: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flex: 1,
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
    // 단일행 TextInput에는 줄간을 얹지 않는다(HM-8 타입 스케일 — 커서·세로 정렬 어긋남).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    color: Acg.ink,
  },
  bodyInput: {
    minHeight: BODY_MIN_HEIGHT,
    lineHeight: AcgType.control.lineHeight,
  },
  error: {
    ...AcgType.meta,
    color: Acg.error,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 44,
  },
  moreText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  bottomBar: {
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 8,
  },
  submitButton: {
    minHeight: SUBMIT_BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
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
  reason: {
    ...AcgType.meta,
    color: Acg.textMuted,
    textAlign: 'center',
  },
});

export default observer(TripRecordView);
