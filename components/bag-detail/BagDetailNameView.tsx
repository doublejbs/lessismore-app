import React, { FC, useState } from 'react';
import {
  View,
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
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailNameView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleNamePress = () => {
    app.getAnalyticsManager()?.logClick('bag_info_edit');
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
        <PretendardText style={styles.nameText} weight='bold'>
          {bagDetail.getName()}
        </PretendardText>
        <Ionicons
          name='create-outline'
          size={18}
          color={Color.textTertiary}
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
                <PretendardText style={styles.modalTitle} weight='bold'>
                  배낭 이름 수정
                </PretendardText>
                <PretendardText style={styles.modalDescription}>
                  새로운 배낭 이름을 입력해주세요
                </PretendardText>

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
                  <PretendardText
                    style={styles.cancelButtonText}
                    weight='medium'
                  >
                    취소
                  </PretendardText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isUpdating || inputValue.trim() === ''}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor:
                        isUpdating || inputValue.trim() === ''
                          ? Color.textTertiary
                          : Color.chipActiveBg,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <PretendardText style={styles.saveButtonText} weight='medium'>
                    {isUpdating ? '저장 중...' : '저장'}
                  </PretendardText>
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
    borderRadius: Radius.listThumb,
    gap: 8,
  },
  nameText: {
    fontSize: 20,
    textAlign: 'center',
    color: Color.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    padding: 16,
    maxHeight: screenHeight * 0.7, // 화면 높이의 70%로 제한 (키보드 공간 확보)
  },
  scrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
    color: Color.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    color: Color.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: Color.borderLight,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Color.background,
    padding: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Color.borderLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Color.textPrimary,
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: Radius.input,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default observer(BagDetailNameView);
