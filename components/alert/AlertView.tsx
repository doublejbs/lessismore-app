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
import { AcgType, Color, Radius } from '@/constants/DesignTokens';

interface Props {
  alertManager: AlertManager;
}

const AlertView: FC<Props> = ({ alertManager }) => {
  const isVisible = alertManager.isVisible();
  const message = alertManager.getMessage();
  const confirmText = alertManager.getConfirmText();
  const cancelable = alertManager.isCancelable();
  const confirming = alertManager.isConfirming();

  const handleClickCancel = (e?: GestureResponderEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirming) {
      alertManager.hide();
    }
  };

  const handleClickConfirm = (e?: GestureResponderEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    alertManager.confirm();
  };

  // Android 하드웨어 뒤로가기(APP-9). 2버튼 알럿에서는 **취소**여야 한다 — 확인으로 두면
  // 뒤로가기 한 번에 삭제·로그아웃 같은 파괴적 콜백이 확인 없이 실행된다.
  // 단일 버튼 알림(`notify`, cancelable=false)은 확인 콜백이 닫기뿐이라 둘이 등가다.
  const handleRequestClose = () => {
    if (cancelable) {
      handleClickCancel();

      return;
    }

    handleClickConfirm();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType='fade'
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <PretendardText weight='bold' style={styles.messageText}>
            {message}
          </PretendardText>
          <View
            style={[
              styles.buttonContainer,
              !cancelable && styles.singleButtonContainer,
            ]}
          >
            {cancelable && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClickCancel}
                disabled={confirming}
              >
                <PretendardText weight='medium' style={styles.cancelButtonText}>
                  취소하기
                </PretendardText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !cancelable && styles.singleConfirmButton,
              ]}
              onPress={handleClickConfirm}
              disabled={confirming}
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 51,
  },
  singleButtonContainer: {
    flexDirection: 'column',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.pill,
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
    borderRadius: Radius.pill,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleConfirmButton: {
    width: '100%',
  },
  confirmButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default observer(AlertView);
