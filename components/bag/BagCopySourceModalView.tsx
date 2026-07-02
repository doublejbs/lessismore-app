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
          <PretendardText style={styles.title}>복사할 배낭 선택</PretendardText>
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
                    <PretendardText style={styles.name}>
                      {bagItem.getName()}
                    </PretendardText>
                    <PretendardText style={styles.date}>
                      {bagItem.getDate()}
                    </PretendardText>
                  </View>
                  <PretendardText style={styles.weight}>
                    {bagItem.getWeight()}kg
                  </PretendardText>
                </View>
                <IconSymbol name='chevron.right' size={20} color='#999999' />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <PretendardText style={styles.closeButtonText}>닫기</PretendardText>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: screenHeight * 0.9,
  },
  title: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 20,
    color: '#000000',
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
    borderBottomColor: '#F2F4F6',
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
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
    color: '#000000',
  },
  date: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 12,
    color: '#000000',
  },
  weight: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
    color: '#000000',
  },
  closeButton: {
    width: '100%',
    backgroundColor: 'black',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Pretendard-Regular',
  },
});

export default BagCopySourceModalView;
