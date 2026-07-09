import dayjs from 'dayjs';
import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateRangeCalendarView from '../bag/DateRangeCalendarView';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailDateView: FC<Props> = ({ bagDetail }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const insets = useSafeAreaInsets();

  const handleDatePress = () => {
    app.getAnalyticsManager()?.logClick('bag_info_edit');
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
        <PretendardText style={styles.dateText}>
          {bagDetail.getDate()}
        </PretendardText>
        <Ionicons
          name='create-outline'
          size={16}
          color={Color.textTertiary}
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
          <View
            style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContentContainer}
            >
              <PretendardText style={styles.modalTitle} weight='bold'>
                여행 날짜 수정
              </PretendardText>
              <PretendardText style={styles.modalDescription}>
                여행 시작일과 종료일을 선택해주세요
              </PretendardText>
              <View style={styles.calendarContainer}>
                <DateRangeCalendarView
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isUpdating}
                style={[styles.cancelButton, { opacity: isUpdating ? 0.6 : 1 }]}
              >
                <PretendardText style={styles.cancelButtonText} weight='medium'>
                  취소
                </PretendardText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isUpdating || !startDate || !endDate}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      isUpdating || !startDate || !endDate
                        ? Color.textTertiary
                        : Color.chipActiveBg,
                  },
                ]}
              >
                <PretendardText style={styles.saveButtonText} weight='medium'>
                  {isUpdating ? '저장 중...' : '저장'}
                </PretendardText>
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
    borderRadius: Radius.listThumb,
    gap: 8,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: Color.textPrimary,
    textAlign: 'center',
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
    padding: 24,
    maxHeight: '95%',
    minHeight: '70%',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
    color: Color.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: Color.textPrimary,
  },
  calendarContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  calendarPlaceholder: {
    fontSize: 16,
    textAlign: 'center',
    color: Color.textPrimary,
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

export default observer(BagDetailDateView);
