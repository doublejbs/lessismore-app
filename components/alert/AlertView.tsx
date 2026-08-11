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
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  alertManager: AlertManager;
}

const AlertView: FC<Props> = ({ alertManager }) => {
  const isVisible = alertManager.isVisible();
  const message = alertManager.getMessage();
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
          <PretendardText weight='bold' style={styles.messageText}>
            {message}
          </PretendardText>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClickCancel}
            >
              <PretendardText weight='medium' style={styles.cancelButtonText}>
                취소하기
              </PretendardText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleClickConfirm}
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
    fontSize: 20,
    marginBottom: 24,
    color: Color.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    height: 51,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Color.surfaceMuted,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Color.textPrimary,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default observer(AlertView);
