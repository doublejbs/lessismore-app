import React, { FC } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import dayjs from 'dayjs';
import BagAddDateView from './BagAddDateView';
import PretendardText from '@/components/PretendardText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  visible: boolean;
  inputValue: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onChangeName: (text: string) => void;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  confirmText?: string;
  disabled?: boolean;
}

const BagFormModalView: FC<Props> = ({
  visible,
  inputValue,
  startDate,
  endDate,
  onChangeName,
  onStartDateChange,
  onEndDateChange,
  onConfirm,
  onCancel,
  title,
  confirmText = '확인',
  disabled = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent={true} onRequestClose={onCancel}>
      <TouchableOpacity
        style={styles.modalOverlay}
        onPress={onCancel}
        activeOpacity={1}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'height' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={[styles.modalContent, { paddingBottom: insets.bottom + 12 }]}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {title ? (
                <PretendardText weight='bold' style={styles.title}>
                  {title}
                </PretendardText>
              ) : null}
              <View style={styles.inputSection}>
                <PretendardText weight='bold' style={styles.inputLabel}>
                  배낭 이름
                </PretendardText>
                <TextInput
                  style={styles.textInput}
                  placeholder='배낭 이름을 입력해주세요'
                  value={inputValue}
                  onChangeText={onChangeName}
                  placeholderTextColor={Color.textSecondary}
                />
              </View>
              <BagAddDateView
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={onStartDateChange}
                onEndDateChange={onEndDateChange}
              />
            </ScrollView>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <PretendardText style={styles.cancelButtonText}>취소</PretendardText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  disabled ? styles.confirmButtonDisabled : null,
                ]}
                onPress={onConfirm}
                activeOpacity={0.7}
                disabled={disabled}
              >
                <PretendardText style={styles.confirmButtonText}>
                  {confirmText}
                </PretendardText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  scrollView: {
    flexGrow: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    color: Color.textPrimary,
    marginBottom: 16,
  },
  inputSection: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  textInput: {
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default BagFormModalView;
