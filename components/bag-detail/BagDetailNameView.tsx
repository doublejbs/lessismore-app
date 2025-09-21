import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailNameView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleNamePress = () => {
    setInputValue(bagDetail.getName());
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (inputValue.trim() === '' || inputValue === bagDetail.getName()) {
      setIsModalOpen(false);
      return;
    }

    try {
      setIsUpdating(true);
      await bagDetail.updateName(inputValue.trim());
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      Alert.alert('오류', '이름 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setInputValue('');
  };

  return (
    <>
      <TouchableOpacity style={styles.nameContainer} onPress={handleNamePress}>
        <Text style={styles.nameText}>{bagDetail.getName()}</Text>
        <Ionicons
          name='create-outline'
          size={18}
          color='#666'
          style={{ opacity: 0.6 }}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalOpen}
        animationType='slide'
        transparent={true}
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleCancel}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>배낭 이름 수정</Text>
            <Text style={styles.modalDescription}>
              새로운 배낭 이름을 입력해주세요
            </Text>

            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder='배낭 이름을 입력하세요'
              style={styles.textInput}
              autoFocus
              onSubmitEditing={handleSave}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isUpdating}
                style={[styles.cancelButton, { opacity: isUpdating ? 0.6 : 1 }]}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isUpdating || inputValue.trim() === ''}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      isUpdating || inputValue.trim() === '' ? '#666' : 'black',
                  },
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {isUpdating ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  nameContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 4,
    gap: 8,
  },
  nameText: {
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default observer(BagDetailNameView);
