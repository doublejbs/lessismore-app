import React, { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { observer } from 'mobx-react-lite';
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
        transparent={true}
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleCancel}
          activeOpacity={1}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
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
                  returnKeyType='done'
                />
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={isUpdating}
                  style={[
                    styles.cancelButton,
                    { opacity: isUpdating ? 0.6 : 1 },
                  ]}
                  activeOpacity={0.7}
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
                        isUpdating || inputValue.trim() === ''
                          ? '#666'
                          : 'black',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>
                    {isUpdating ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const { height: screenHeight } = Dimensions.get('window');

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
    color: 'black',
  },
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
    maxHeight: screenHeight * 0.7, // 화면 높이의 70%로 제한 (키보드 공간 확보)
  },
  scrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: 'black',
  },
  modalDescription: {
    fontSize: 14,
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
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
    color: 'black',
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
