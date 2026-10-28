import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  GestureResponderEvent,
} from 'react-native';
import AlertManager from '@/model/alert/AlertManager';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  alertManager: AlertManager;
}

const AlertView: FC<Props> = ({ alertManager }) => {
  const isVisible = alertManager.isVisible();
  const message = alertManager.getMessage();
  const description = alertManager.getDescription();
  const confirmText = alertManager.getConfirmText();

  const handleClickCancel = (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alertManager.hide();
  };

  const handleClickConfirm = (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alertManager.confirm();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType='fade'
      onRequestClose={handleClickCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <PretendardText
            weight='bold'
            style={[styles.messageText, description !== '' && styles.messageWithDescription]}
          >
            {message}
          </PretendardText>
          {description !== '' ? (
            <PretendardText style={styles.descriptionText}>
              {description}
            </PretendardText>
          ) : null}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClickCancel}
            >
              <PretendardText weight='medium' style={styles.cancelButtonText}>
                {alertManager.getCancelText() || app.getL10n().t('common.cancel')}
              </PretendardText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                alertManager.isDestructive() && styles.destructiveButton,
                alertManager.isConfirming() && styles.confirmButtonPending,
              ]}
              onPress={handleClickConfirm}
              disabled={alertManager.isConfirming()}
              accessibilityState={{ disabled: alertManager.isConfirming() }}
            >
              <PretendardText weight='medium' style={styles.confirmButtonText}>
                {confirmText}
              </PretendardText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: 350,
    backgroundColor: Color.background,
    borderRadius: Radius.modal,
    padding: 24,
    paddingBottom: 20,
  },
  messageText: {
    ...AcgType.screenTitle,
    marginBottom: 24,
    color: Color.textPrimary,
  },
  messageWithDescription: {
    marginBottom: AcgLayout.titleDescriptionGap,
  },
  descriptionText: {
    ...AcgType.body,
    marginBottom: 24,
    color: Color.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 51,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Color.surfaceMuted,
    borderRadius: 26,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Color.textPrimary,
    borderRadius: 26,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 되돌릴 수 없는 액션의 확인 면. 삭제·경고 red는 의미색이라 토큰 예외다(HM-8).
  destructiveButton: {
    backgroundColor: Acg.error,
  },
  confirmButtonPending: {
    opacity: 0.6,
  },
  confirmButtonText: {
    ...AcgType.control,
    color: '#FFFFFF',
  },
});

export default observer(AlertView);
