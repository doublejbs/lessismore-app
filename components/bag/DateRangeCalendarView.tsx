import dayjs from 'dayjs';
import { FC, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';

interface DateRangeCalendarProps {
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
  initialMonth?: dayjs.Dayjs;
}

const DateRangeCalendar: FC<DateRangeCalendarProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  initialMonth,
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    initialMonth ? initialMonth.startOf('month') : dayjs().startOf('month')
  );
  const [calendarDays, setCalendarDays] = useState<dayjs.Dayjs[]>([]);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  useEffect(() => {
    const firstDayOfMonth = currentMonth.startOf('month');
    const lastDayOfMonth = currentMonth.endOf('month');

    // 이전 달의 마지막 일부 날짜들 (첫째 주를 채우기 위함)
    const daysFromPrevMonth = firstDayOfMonth.day();
    const prevMonthDays = Array.from({ length: daysFromPrevMonth }, (_, i) =>
      firstDayOfMonth.subtract(daysFromPrevMonth - i, 'day')
    );

    // 현재 달의 모든 날짜
    const daysInMonth = lastDayOfMonth.date();
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) =>
      firstDayOfMonth.add(i, 'day')
    );

    // 다음 달의 첫 일부 날짜들 (마지막 주를 채우기 위함)
    const daysFromNextMonth = 6 - lastDayOfMonth.day();
    const nextMonthDays = Array.from({ length: daysFromNextMonth }, (_, i) =>
      lastDayOfMonth.add(i + 1, 'day')
    );

    setCalendarDays([...prevMonthDays, ...currentMonthDays, ...nextMonthDays]);
  }, [currentMonth]);

  const handleDateClick = (day: dayjs.Dayjs) => {
    // 1. startDate와 endDate가 모두 있으면 - 새 startDate 선택하고 endDate는 해제
    if (startDate && endDate) {
      onStartDateChange(day);
      onEndDateChange(null);
    }
    // 2. startDate만 있고, 선택한 날짜가 startDate보다 이전이면 - 새 startDate 선택
    else if (startDate && !endDate && day.isBefore(startDate)) {
      onStartDateChange(day);
    }
    // 3. startDate만 있고, 선택한 날짜가 startDate보다 나중이면 - endDate 선택
    else if (startDate && !endDate && day.isAfter(startDate)) {
      onEndDateChange(day);
    } else if (startDate && day.isSame(startDate)) {
      onEndDateChange(day);
    }
    // 4. startDate가 없으면 (또는 기타 경우) - startDate 선택
    else {
      onStartDateChange(day);
    }
  };

  const isInRange = (day: dayjs.Dayjs) => {
    if (!startDate || !endDate) return false;
    return day.isAfter(startDate) && day.isBefore(endDate);
  };

  const isToday = (day: dayjs.Dayjs) => {
    return day.format('YYYY.MM.DD') === dayjs().format('YYYY.MM.DD');
  };

  const isSelectedStart = (day: dayjs.Dayjs) => {
    if (!startDate) return false;
    return day.format('YYYY.MM.DD') === startDate.format('YYYY.MM.DD');
  };

  const isSelectedEnd = (day: dayjs.Dayjs) => {
    if (!endDate) return false;
    return day.format('YYYY.MM.DD') === endDate.format('YYYY.MM.DD');
  };

  const isCurrentMonth = (day: dayjs.Dayjs) => {
    return day.month() === currentMonth.month();
  };

  const navigateToPreviousMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const navigateToNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateRangeHeader}>
        <View style={styles.dateSection}>
          <PretendardText style={styles.dateLabel}>시작일</PretendardText>
          <View style={styles.dateDisplay}>
            <PretendardText style={styles.dateText}>
              {startDate ? startDate.format('YYYY.MM.DD') : '선택 안됨'}
            </PretendardText>
          </View>
        </View>

        <View style={styles.dateSection}>
          <PretendardText style={styles.dateLabel}>종료일</PretendardText>
          <View style={styles.dateDisplay}>
            <PretendardText style={styles.dateText}>
              {endDate ? endDate.format('YYYY.MM.DD') : '선택 안됨'}
            </PretendardText>
          </View>
        </View>
      </View>
      <View style={styles.monthNavigation}>
        <TouchableOpacity
          onPress={navigateToPreviousMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <PretendardText style={styles.navIcon}>‹</PretendardText>
        </TouchableOpacity>
        <PretendardText style={styles.monthTitle}>
          {currentMonth.format('YYYY년 M월')}
        </PretendardText>
        <TouchableOpacity
          onPress={navigateToNextMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <PretendardText style={styles.navIcon}>›</PretendardText>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.weekdaysRow}>
          {weekdays.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <PretendardText
                style={[
                  styles.weekdayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </PretendardText>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <View key={rowIndex} style={styles.calendarRow}>
              {calendarDays
                .slice(rowIndex * 7, (rowIndex + 1) * 7)
                .map((day, colIndex) => {
                  const index = rowIndex * 7 + colIndex;
                  const isStart = isSelectedStart(day);
                  const isEnd = isSelectedEnd(day);
                  const isSelected = isStart || isEnd;
                  const isRange = isInRange(day);

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleDateClick(day)}
                      style={styles.dayCell}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dayButton,
                          isSelected && styles.selectedDay,
                          isRange && !isSelected && styles.rangeDay,
                        ]}
                      >
                        <PretendardText
                          style={[
                            styles.dayText,
                            !isCurrentMonth(day) && styles.otherMonthText,
                            isSelected && styles.selectedDayText,
                            index % 7 === 0 && styles.sundayText,
                            index % 7 === 6 && styles.saturdayText,
                            (isToday(day) || isSelected) && styles.boldText,
                          ]}
                        >
                          {day.date()}
                        </PretendardText>
                      </View>
                      {isToday(day) && !isSelected && (
                        <View style={styles.todayIndicator} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dateRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateSection: {
    flexDirection: 'column',
    gap: 5,
    flex: 1,
  },
  dateLabel: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
  },
  dateDisplay: {
    backgroundColor: 'rgb(238, 238, 238)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  navButton: {
    padding: 8,
  },
  navIcon: {
    fontSize: 24,
    fontFamily: 'Pretendard-Bold',
  },
  monthTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 18,
  },
  calendarContainer: {
    flex: 1,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayCell: {
    flex: 1,
    padding: 5,
    alignItems: 'center',
  },
  weekdayText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 14,
  },
  sundayText: {
    color: '#FF5252',
  },
  saturdayText: {
    color: '#2196F3',
  },
  calendarGrid: {
    height: 240,
  },
  calendarRow: {
    flexDirection: 'row',
    flex: 1,
  },
  dayCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  selectedDay: {
    backgroundColor: 'black',
  },
  rangeDay: {
    backgroundColor: 'rgb(238, 238, 238)',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
  },
  otherMonthText: {
    color: '#BDBDBD',
  },
  selectedDayText: {
    color: 'white',
  },
  boldText: {
    fontFamily: 'Pretendard-Bold',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A90E2',
  },
});

export default DateRangeCalendar;
