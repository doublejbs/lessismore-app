import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  GestureResponderEvent,
} from 'react-native';
import AlertManager from '@/model/alert/AlertManager';

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
      animationType="fade"
      onRequestClose={handleClickCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.messageText}>{message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClickCancel}
            >
              <Text style={styles.cancelButtonText}>취소하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleClickConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: 350,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    paddingBottom: 20,
  },
  messageText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    fontFamily: 'Pretendard-Bold',
    color: '#000000',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    height: 51,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: 'black',
    fontFamily: 'Pretendard-Medium',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Pretendard-Medium',
  },
});

export default observer(AlertView);
