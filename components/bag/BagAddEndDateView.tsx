import React, { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  endDate: dayjs.Dayjs;
  handleEndDateChange: (date: string) => void;
}

const BagAddEndDateView: FC<Props> = ({ endDate, handleEndDateChange }) => {
  const handleDatePress = () => {
    // React Native에서는 날짜 선택을 위해 DateTimePicker나 별도의 날짜 선택 모달을 사용해야 합니다.
    // 여기서는 현재 날짜 형식의 문자열을 전달합니다.
    const dateString = endDate.format('YYYY-MM-DD');
    handleEndDateChange(dateString);
  };

  return (
    <View style={styles.container}>
      <PretendardText weight='bold' style={styles.label}>
        기간
      </PretendardText>
      <TouchableOpacity
        style={styles.dateInput}
        onPress={handleDatePress}
        activeOpacity={0.7}
      >
        <PretendardText style={styles.dateText}>
          {endDate.format('YYYY-MM-DD')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  label: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  dateInput: {
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
});

export default BagAddEndDateView;
