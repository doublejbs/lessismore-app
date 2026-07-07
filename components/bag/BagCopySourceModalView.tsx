import React, { FC } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import BagItem from '@/model/bag/BagItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  visible: boolean;
  bags: BagItem[];
  onSelect: (bagItem: BagItem) => void;
  onClose: () => void;
  onDismiss?: () => void;
}

const BagCopySourceModalView: FC<Props> = ({
  visible,
  bags,
  onSelect,
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
        <TouchableOpacity
          style={[styles.modalContent, { paddingBottom: insets.bottom + 12 }]}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
        >
          <PretendardText weight='bold' style={styles.title}>
            복사할 배낭 선택
          </PretendardText>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {bags.map(bagItem => (
              <TouchableOpacity
                key={bagItem.getID()}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => onSelect(bagItem)}
              >
                <View style={styles.rowInfo}>
                  <View style={styles.titleContainer}>
                    <PretendardText weight='bold' style={styles.name}>
                      {bagItem.getName()}
                    </PretendardText>
                    <PretendardText style={styles.date}>
                      {bagItem.getDate()}
                    </PretendardText>
                  </View>
                  <PretendardText weight='bold' style={styles.weight}>
                    {bagItem.getWeight()}kg
                  </PretendardText>
                </View>
                <IconSymbol
                  name='chevron.right'
                  size={20}
                  color={Color.iconMuted}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <PretendardText style={styles.closeButtonText}>
              닫기
            </PretendardText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const { height: screenHeight } = Dimensions.get('window');

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
    padding: 16,
    maxHeight: screenHeight * 0.9,
  },
  title: {
    fontSize: 20,
    color: Color.textPrimary,
    marginBottom: 16,
  },
  scrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.divider,
  },
  rowInfo: {
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'column',
    gap: 9,
  },
  name: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  date: {
    fontSize: 12,
    color: Color.textPrimary,
  },
  weight: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default BagCopySourceModalView;
