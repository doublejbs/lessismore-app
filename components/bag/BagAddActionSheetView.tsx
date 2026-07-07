import React, { FC } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  visible: boolean;
  onCreate: () => void;
  onCopy: () => void;
  onClose: () => void;
  onDismiss?: () => void;
}

const BagAddActionSheetView: FC<Props> = ({
  visible,
  onCreate,
  onCopy,
  onClose,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <View
          style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}
        >
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onCreate}>
              <IconSymbol name='plus' size={20} color={Color.textPrimary} />
              <PretendardText style={styles.actionText}>
                새로 만들기
              </PretendardText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onCopy}>
              <IconSymbol
                name='doc.on.doc'
                size={20}
                color={Color.textPrimary}
              />
              <PretendardText style={styles.actionText}>
                기존 배낭 복사하기
              </PretendardText>
            </TouchableOpacity>
          </View>

          <View style={styles.closeButtonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <PretendardText weight='medium' style={styles.closeButtonText}>
                닫기
              </PretendardText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  modalActions: {
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 18,
    gap: 10,
  },
  actionText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  closeButtonContainer: {
    paddingHorizontal: 20,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Color.chipActiveBg,
    padding: 18,
    borderRadius: Radius.input,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default BagAddActionSheetView;
