import React from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import DateRangeCalendar from './DateRangeCalendarView';

interface Props {
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
}

const BagAddDateView = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: Props) => {
  return (
    <View>
      <DateRangeCalendar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
    </View>
  );
};

export default BagAddDateView;
