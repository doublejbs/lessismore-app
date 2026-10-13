import { FC, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GroupFormFieldView from '@/components/group/form/GroupFormFieldView';
import GroupTextFieldView from '@/components/group/form/GroupTextFieldView';
import PretendardText from '@/components/PretendardText';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';
import app from '@/model/app/App';
import { GROUP_ROUTE_NAME_MAX_LENGTH } from '@/model/group/GroupLimits';

interface Props {
  visible: boolean;
  // 처음 채워 둘 이름(RD-3 — 배낭 `{여행지} 코스`, 그룹 `{그룹} 코스`). 마운트 때 한 번 읽는다.
  defaultName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const IS_ANDROID = Platform.OS === 'android';
const SUBMIT_BUTTON_HEIGHT = 52;

/**
 * 그린 코스 이름 입력 시트 (RD-3) — 포인트 입력 시트(GRP-9 · BD-14)와 같은 문법(iOS pageSheet · Android 딤 + 하단 시트,
 * 그룹 폼 입력, 라임 `저장`). 1~40자 — 비우면 저장할 수 없고, 저장 이름의 절단은 `RouteValidator.toRouteName`이 한다.
 * 화면이 열 때마다 `key`를 바꿔 새로 마운트하므로 입력은 늘 기본값에서 시작한다.
 */
const RouteDrawNameSheetView: FC<Props> = ({
  visible,
  defaultName,
  submitting,
  onClose,
  onSubmit,
}) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const { isReduceMotionEnabled } = useSheetTransition();
  const [name, setName] = useState(() =>
    defaultName.slice(0, GROUP_ROUTE_NAME_MAX_LENGTH)
  );
  const canSubmit = name.trim().length > 0 && !submitting;

  const handleClose = () => {
    // 저장 중에는 닫지 않는다 — 결과가 시트를 내린다.
    if (submitting) {
      return;
    }

    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit(name.trim());
  };

  const sheetContent = (
    <>
      <SheetGrabberView />
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          {l10n.t('routeDraw.nameTitle')}
        </PretendardText>
        <TouchableOpacity
          onPress={handleClose}
          disabled={submitting}
          style={styles.closeButton}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('routeDraw.close')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='close' size={24} color={Acg.ink} />
        </TouchableOpacity>
      </View>

      <View style={[styles.body, IS_ANDROID && styles.bodyAndroid]}>
        <GroupFormFieldView
          label={l10n.t('routeDraw.nameLabel')}
          counterText={l10n.t('routeDraw.nameCounter', {
            count: name.length,
            max: GROUP_ROUTE_NAME_MAX_LENGTH,
          })}
        >
          <GroupTextFieldView
            value={name}
            onChangeText={setName}
            placeholder={l10n.t('routeDraw.namePlaceholder')}
            maxLength={GROUP_ROUTE_NAME_MAX_LENGTH}
            editable={!submitting}
            accessibilityLabel={l10n.t('routeDraw.nameLabel')}
          />
        </GroupFormFieldView>
      </View>

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
          accessibilityLabel={l10n.t('routeDraw.save')}
          accessibilityState={{ disabled: !canSubmit, busy: submitting }}
        >
          <PretendardText style={styles.submitText} weight='semibold'>
            {l10n.t(submitting ? 'routeDraw.saving' : 'routeDraw.save')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </>
  );

  // Android: presentationStyle는 iOS 전용이라 딤 배경 + 하단 라운드 시트로 감싼다(포인트 입력 시트와 같은 처리).
  if (IS_ANDROID) {
    return (
      <Modal
        visible={visible}
        animationType={isReduceMotionEnabled ? 'fade' : 'slide'}
        transparent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView style={styles.androidBackdrop} behavior='height'>
          <TouchableWithoutFeedback onPress={handleClose}>
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
      onRequestClose={handleClose}
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
    paddingTop: 4,
    paddingBottom: 16,
  },
  // Android 시트는 내용 높이에 맞춰 줄어들어야 한다 — flexBasis를 auto로 되돌린다.
  bodyAndroid: {
    flex: 0,
    flexShrink: 1,
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

export default RouteDrawNameSheetView;
