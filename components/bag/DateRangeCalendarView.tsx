import dayjs from 'dayjs';
import { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
  initialMonth?: dayjs.Dayjs;
}

const DateRangeCalendarView: FC<Props> = ({
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
      <View style={styles.dateSelectionContainer}>
        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>시작일</Text>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {startDate ? startDate.format('YYYY.MM.DD') : '선택 안됨'}
            </Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>종료일</Text>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {endDate ? endDate.format('YYYY.MM.DD') : '선택 안됨'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={navigateToPreviousMonth}
          style={styles.navigationButton}
        >
          <Text style={styles.navigationArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentMonth.format('YYYY년 M월')}
        </Text>
        <TouchableOpacity
          onPress={navigateToNextMonth}
          style={styles.navigationButton}
        >
          <Text style={styles.navigationArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.weekdaysContainer}>
          {weekdays.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.daysContainer}>
          {calendarDays.map((day, index) => {
            const isStart = isSelectedStart(day);
            const isEnd = isSelectedEnd(day);
            const isSelected = isStart || isEnd;
            const isRange = isInRange(day);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDateClick(day)}
                style={styles.dayContainer}
              >
                <View
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDay,
                    isRange && !isSelected && styles.rangeDay,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth(day) && styles.otherMonthText,
                      isSelected && styles.selectedDayText,
                      index % 7 === 0 &&
                        isCurrentMonth(day) &&
                        !isSelected &&
                        styles.sundayText,
                      index % 7 === 6 &&
                        isCurrentMonth(day) &&
                        !isSelected &&
                        styles.saturdayText,
                      (isToday(day) || isSelected) && styles.boldText,
                    ]}
                  >
                    {day.date()}
                  </Text>
                </View>
                {isToday(day) && !isSelected && (
                  <View style={styles.todayIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dateSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateSection: {
    flex: 1,
    gap: 5,
  },
  dateLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateDisplay: {
    backgroundColor: 'rgb(238, 238, 238)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dateText: {
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  navigationButton: {
    padding: 10,
  },
  navigationArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  calendarContainer: {
    flex: 1,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  weekdayCell: {
    flex: 1,
    padding: 5,
    alignItems: 'center',
  },
  weekdayText: {
    fontWeight: 'bold',
  },
  sundayText: {
    color: '#FF5252',
  },
  saturdayText: {
    color: '#2196F3',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 240,
  },
  dayContainer: {
    width: '14.28%', // 100% / 7 days
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCell: {
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
    textAlign: 'center',
  },
  otherMonthText: {
    color: '#BDBDBD',
  },
  selectedDayText: {
    color: 'white',
  },
  boldText: {
    fontWeight: 'bold',
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

export default DateRangeCalendarView;
