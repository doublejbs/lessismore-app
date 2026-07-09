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
        <Ionicons name='pencil' size={15} color={Color.textSecondary} />
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
                  onPress={handleSave}
                  disabled={isUpdating || inputValue.trim() === ''}
                  style={[
                    styles.saveButton,
                    (isUpdating || inputValue.trim() === '') &&
                      styles.saveButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <PretendardText style={styles.saveButtonText} weight='bold'>
                    {isUpdating ? '저장 중...' : '저장'}
                  </PretendardText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={isUpdating}
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                >
                  <PretendardText style={styles.cancelButtonText} weight='medium'>
                    취소
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
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 4,
    borderRadius: Radius.listThumb,
    gap: 6,
  },
  nameText: {
    fontSize: 28,
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
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    maxHeight: screenHeight * 0.7, // 화면 높이의 70%로 제한 (키보드 공간 확보)
  },
  scrollView: {
    flexGrow: 0,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 4,
    textAlign: 'center',
    color: Color.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  textInput: {
    padding: 14,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 8,
  },
  saveButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.35,
  },
  saveButtonText: {
    color: Color.background,
    fontSize: 16,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Color.textSecondary,
    fontSize: 15,
  },
});

export default observer(BagDetailNameView);
