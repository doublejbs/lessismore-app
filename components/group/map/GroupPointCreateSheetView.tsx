import { FC, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryChipView from '@/components/browse/CategoryChipView';
import GroupFormFieldView from '@/components/group/form/GroupFormFieldView';
import GroupTextFieldView from '@/components/group/form/GroupTextFieldView';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupPointType from '@/model/group/GroupPointType';
import {
  GROUP_POINT_DESCRIPTION_MAX_LENGTH,
  GROUP_POINT_TITLE_MAX_LENGTH,
} from '@/model/group/GroupLimits';
import {
  GROUP_POINT_TYPES,
  getGroupPointTypeColor,
  getGroupPointTypeLabel,
} from '@/model/group-point/GroupPointLabels';

// 시트가 화면에 올리는 값. 좌표는 지도가 들고 있으므로 담지 않는다.
export interface GroupPointDraft {
  type: GroupPointType;
  title: string;
  description: string;
}

interface Props {
  visible: boolean;
  // 수정 대상. `null`이면 등록이다.
  point: GroupPoint | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (draft: GroupPointDraft) => void;
}

const IS_ANDROID = Platform.OS === 'android';
const SUBMIT_BUTTON_HEIGHT = 52;

/**
 * 포인트 등록·수정 시트 (GRP-9).
 *
 * 지도를 길게 눌러 좌표를 찍은 뒤 열린다. 입력은 유형(칩 4종) · 제목(필수 1~40자) ·
 * 설명(선택 최대 200자)이고, 시트 문법은 박지·커뮤니티 시트를 그대로 따른다(GRP-11).
 */
const GroupPointCreateSheetView: FC<Props> = ({
  visible,
  point,
  submitting,
  onClose,
  onSubmit,
}) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const { isReduceMotionEnabled } = useSheetTransition();
  // 초기값은 마운트 시점에 한 번만 잡는다 — 화면이 시트를 열 때마다 `key`를 바꿔
  // 새로 마운트하므로, 닫았다 다시 열어도 앞선 입력이 남지 않는다(이펙트 안 setState 불필요).
  const [type, setType] = useState<GroupPointType>(
    point ? point.getType() : GroupPointType.Water
  );
  const [title, setTitle] = useState(point ? point.getTitle() : '');
  const [description, setDescription] = useState(
    point?.getDescription() ?? ''
  );

  const isEditing = !!point;
  const canSubmit = title.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit({ type, title: title.trim(), description: description.trim() });
  };

  const sheetContent = (
    <>
      <SheetGrabberView />
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          {l10n.t(isEditing ? 'group.point.editTitle' : 'group.point.title')}
        </PretendardText>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.point.close')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='close' size={24} color={Acg.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.body, IS_ANDROID && styles.bodyAndroid]}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <GroupFormFieldView label={l10n.t('group.point.typeLabel')}>
          <View style={styles.chipRow}>
            {GROUP_POINT_TYPES.map(value => (
              <CategoryChipView
                key={value}
                label={getGroupPointTypeLabel(value)}
                dotColor={getGroupPointTypeColor(value)}
                selected={type === value}
                onPress={() => setType(value)}
              />
            ))}
          </View>
        </GroupFormFieldView>

        <GroupFormFieldView
          label={l10n.t('group.point.titleLabel')}
          counterText={l10n.t('group.point.counter', {
            count: title.length,
            max: GROUP_POINT_TITLE_MAX_LENGTH,
          })}
        >
          <GroupTextFieldView
            value={title}
            onChangeText={setTitle}
            placeholder={l10n.t('group.point.titlePlaceholder')}
            maxLength={GROUP_POINT_TITLE_MAX_LENGTH}
            editable={!submitting}
            accessibilityLabel={l10n.t('group.point.titleLabel')}
          />
        </GroupFormFieldView>

        <GroupFormFieldView
          label={l10n.t('group.point.descriptionLabel')}
          counterText={l10n.t('group.point.counter', {
            count: description.length,
            max: GROUP_POINT_DESCRIPTION_MAX_LENGTH,
          })}
        >
          <GroupTextFieldView
            value={description}
            onChangeText={setDescription}
            placeholder={l10n.t('group.point.descriptionPlaceholder')}
            maxLength={GROUP_POINT_DESCRIPTION_MAX_LENGTH}
            editable={!submitting}
            accessibilityLabel={l10n.t('group.point.descriptionLabel')}
            multiline
          />
        </GroupFormFieldView>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: IS_ANDROID ? 12 : Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.point.save')}
          accessibilityState={{ disabled: !canSubmit }}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {l10n.t(submitting ? 'common.processing' : 'group.point.save')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </>
  );

  // Android: presentationStyle는 iOS 전용이라 Modal이 전체화면으로 뜬다.
  // 딤 배경 + 하단 라운드 바텀시트로 감싸 시트처럼 보이게 한다(박지 시트와 같은 처리).
  if (IS_ANDROID) {
    return (
      <Modal
        visible={visible}
        animationType={isReduceMotionEnabled ? 'fade' : 'slide'}
        transparent
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView style={styles.androidBackdrop} behavior='height'>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backdropTouchable} />
          </TouchableWithoutFeedback>
          <View style={[styles.androidSheet, { paddingBottom: insets.bottom }]}>
            {sheetContent}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType={isReduceMotionEnabled ? 'fade' : 'slide'}
      presentationStyle='pageSheet'
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <KeyboardAvoidingView style={styles.sheet} behavior='padding'>
        {sheetContent}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Acg.paper,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  androidBackdrop: {
    flex: 1,
    backgroundColor: Acg.scrim,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  androidSheet: {
    maxHeight: '90%',
    backgroundColor: Acg.paper,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: -4,
  },
  body: {
    flex: 1,
  },
  // Android 시트는 내용 높이에 맞춰 줄어들어야 한다 — flexBasis를 auto로 되돌린다.
  bodyAndroid: {
    flex: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: AcgLayout.chipGap,
  },
  bottomBar: {
    paddingTop: 8,
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

export default GroupPointCreateSheetView;
