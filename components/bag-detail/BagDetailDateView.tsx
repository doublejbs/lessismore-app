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
          {bagDetail.getDate()} · {bagDetail.getPhaseLabel()}
        </PretendardText>
        <Ionicons name='pencil' size={12} color={Color.textSecondary} />
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
                onPress={handleSave}
                disabled={isUpdating || !startDate || !endDate}
                style={[
                  styles.saveButton,
                  (isUpdating || !startDate || !endDate) &&
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
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dateContainer: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 4,
    borderRadius: Radius.listThumb,
    gap: 6,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: Color.textSecondary,
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
    fontSize: 20,
    marginBottom: 4,
    textAlign: 'center',
    color: Color.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: Color.textSecondary,
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

export default observer(BagDetailDateView);
