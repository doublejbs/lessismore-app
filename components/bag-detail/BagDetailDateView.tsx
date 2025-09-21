import dayjs from 'dayjs';
import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
// TODO: DateRangeCalendar 컴포넌트를 React Native로 변환 필요
// import DateRangeCalendar from '../bag/component/DateRangeCalendar';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailDateView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDatePress = () => {
    setStartDate(bagDetail.getStartDate());
    setEndDate(bagDetail.getEndDate());
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      Alert.alert('알림', '시작일과 종료일을 모두 선택해주세요.');
      return;
    }

    if (startDate.isAfter(endDate)) {
      Alert.alert('알림', '시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }

    try {
      setIsUpdating(true);
      await bagDetail.updateDates(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update dates:', error);
      Alert.alert('오류', '날짜 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <>
      <TouchableOpacity style={styles.dateContainer} onPress={handleDatePress}>
        <Text style={styles.dateText}>{bagDetail.getDate()}</Text>
        <Ionicons
          name='create-outline'
          size={16}
          color='#9B9B9B'
          style={{ opacity: 0.5 }}
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
            <Text style={styles.modalTitle}>여행 날짜 수정</Text>
            <Text style={styles.modalDescription}>
              여행 시작일과 종료일을 선택해주세요
            </Text>

            <View style={styles.calendarContainer}>
              <Text style={styles.calendarPlaceholder}>
                {/* TODO: DateRangeCalendar를 React Native로 변환 후 사용 */}
                시작일:{' '}
                {startDate ? startDate.format('YYYY.MM.DD') : '선택해주세요'}
                {'\n'}
                종료일:{' '}
                {endDate ? endDate.format('YYYY.MM.DD') : '선택해주세요'}
              </Text>
            </View>

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
                disabled={isUpdating || !startDate || !endDate}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      isUpdating || !startDate || !endDate ? '#666' : 'black',
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
  dateContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 4,
    gap: 8,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#9B9B9B',
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
    maxHeight: '90%',
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
  calendarContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarPlaceholder: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
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

export default observer(BagDetailDateView);
