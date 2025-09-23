import React, { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Bag from '@/model/bag/Bag';
import dayjs from 'dayjs';
import BagAddDateView from './BagAddDateView';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';

interface Props {
  bag: Bag;
}

const BagAddView: FC<Props> = ({ bag }) => {
  const [shouldShowAdd, setShouldShowAdd] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const router = useRouter();

  const showAdd = () => {
    if (app.getFirebase()?.isLoggedIn()) {
      setShouldShowAdd(true);
    } else {
      app.getLogInAlertManager()?.show();
    }
  };

  const handleChange = (text: string) => {
    setInputValue(text);
  };

  const handleClickConfirm = async () => {
    if (!startDate || !endDate) {
      Alert.alert('오류', '날짜를 선택해주세요');
      return;
    }
    const bagID = await bag.add(inputValue, startDate, endDate);

    if (bagID) {
      setInputValue('');
      setShouldShowAdd(false);
      setStartDate(dayjs());
      setEndDate(dayjs());
      router.push(`/bag/${bagID}`);
    }
  };

  const handleClickCancel = () => {
    setInputValue('');
    setShouldShowAdd(false);
  };

  const handleStartDateChange = (date: dayjs.Dayjs) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={showAdd}
        activeOpacity={0.8}
      >
        <PretendardText style={styles.buttonText}>배낭 추가</PretendardText>
      </TouchableOpacity>
      <Modal
        visible={shouldShowAdd}
        transparent={true}
        onRequestClose={handleClickCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleClickCancel}
          activeOpacity={1}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'height' : 'height'}
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
                <View style={styles.inputSection}>
                  <PretendardText style={styles.inputLabel}>
                    배낭 이름
                  </PretendardText>
                  <TextInput
                    style={styles.textInput}
                    placeholder='배낭 이름을 입력해주세요'
                    value={inputValue}
                    onChangeText={handleChange}
                    placeholderTextColor='#999'
                  />
                </View>
                <BagAddDateView
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                />
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClickCancel}
                  activeOpacity={0.7}
                >
                  <PretendardText style={styles.cancelButtonText}>
                    취소
                  </PretendardText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleClickConfirm}
                  activeOpacity={0.7}
                >
                  <PretendardText style={styles.confirmButtonText}>
                    확인
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
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: Platform.select({
      ios: 80,
      android: 0,
      default: 80,
    }),
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'black',
    height: 48,
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 127,
    gap: 6,
  },
  plusIcon: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    textAlignVertical: 'center',
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
    flexGrow: 1,
    marginBottom: 16,
  },
  inputSection: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 20,
  },
  textInput: {
    borderRadius: 10,
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Pretendard-Regular',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Pretendard-Regular',
  },
});

export default BagAddView;
