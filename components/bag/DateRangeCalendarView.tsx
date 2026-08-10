import dayjs from 'dayjs';
import { FC, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

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
  /**
   * 캘린더 펼침 상태(BAG-2). **기본은 접힘**이다 — 대다수는 기본 날짜(오늘~내일)를 그대로
   * 쓰는데 캘린더가 항상 펼쳐져 있으면 정작 먼저 손대는 이름 입력이 위로 밀린다.
   */
  const [isOpen, setIsOpen] = useState(false);
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

  const handleToggle = () => {
    setIsOpen(open => !open);
  };

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
      // 범위 선택이 끝났으므로 접는다(BAG-2) — 다시 누르면 열린다.
      setIsOpen(false);
    } else if (startDate && day.isSame(startDate)) {
      onEndDateChange(day);
      setIsOpen(false);
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

  // 두 날짜가 모두 있어야 기간으로 읽힌다 — 값 표기와 플레이스홀더를 가른다.
  const hasRange = startDate !== null && endDate !== null;

  const navigateToPreviousMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const navigateToNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  return (
    <View style={styles.container}>
      {/**
       * 여행 기간은 **필드 하나**다(BAG-2).
       *
       * 예전에는 `시작일`·`종료일`을 각각 라벨 + 값 박스로 나눠 두 필드처럼 보였는데,
       * 실제 컨트롤은 행 전체 하나이고 열리는 것도 **범위 선택기 하나**였다. 종료일 박스를
       * 눌러도 범위 규칙(먼저 누른 날이 시작일)으로 동작해 기대와 어긋났다.
       * 구조를 동작에 맞춰 하나로 합치고, 이름 입력과 같은 높이·같은 면을 쓴다.
       */}
      <View style={styles.fieldSection}>
        <LiquidFieldLabel>여행 기간</LiquidFieldLabel>
        <TouchableOpacity
          style={styles.periodField}
          onPress={handleToggle}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel='여행 기간 선택'
        >
          <PretendardText
            style={[styles.periodText, !hasRange && styles.periodPlaceholder]}
          >
            {hasRange
              ? `${startDate.format('YYYY.MM.DD')} – ${endDate.format('YYYY.MM.DD')}`
              : '기간을 선택해주세요'}
          </PretendardText>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Liquid.inkSubtle}
          />
        </TouchableOpacity>
      </View>

      {isOpen ? (
        <>
          <View style={styles.navigationContainer}>
            {/* 아이콘은 Ionicons로 통일한다 — 글자 화살표(‹ ›)는 서체마다 두께가 갈린다. */}
            <TouchableOpacity
              onPress={navigateToPreviousMonth}
              style={styles.navigationButton}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='지난달'
            >
              <Ionicons name='chevron-back' size={20} color={Liquid.ink} />
            </TouchableOpacity>
            <PretendardText weight='semibold' style={styles.monthTitle}>
              {currentMonth.format('YYYY년 M월')}
            </PretendardText>
            <TouchableOpacity
              onPress={navigateToNextMonth}
              style={styles.navigationButton}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='다음달'
            >
              <Ionicons name='chevron-forward' size={20} color={Liquid.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarContainer}>
            <View style={styles.weekdaysContainer}>
              {weekdays.map((day, index) => (
                <View key={index} style={styles.weekdayCell}>
                  <PretendardText
                    weight='bold'
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

            <View
              style={[
                styles.daysContainer,
                { height: Math.ceil(calendarDays.length / 7) * 44 },
              ]}
            >
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
                    activeOpacity={LiquidMotion.pressOpacity}
                    accessibilityRole='button'
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={day.format('YYYY년 M월 D일')}
                  >
                    <View
                      style={[
                        styles.dayCell,
                        isSelected && styles.selectedDay,
                        isRange && !isSelected && styles.rangeDay,
                      ]}
                    >
                      <PretendardText
                        weight={isToday(day) || isSelected ? 'bold' : 'regular'}
                        style={[
                          styles.dayText,
                          !isCurrentMonth(day) && styles.otherMonthText,
                          index % 7 === 0 &&
                            isCurrentMonth(day) &&
                            !isSelected &&
                            styles.sundayText,
                          index % 7 === 6 &&
                            isCurrentMonth(day) &&
                            !isSelected &&
                            styles.saturdayText,
                          isSelected && styles.selectedDayText,
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
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  fieldSection: {
    flexDirection: 'column',
  },
  // 이름 입력과 같은 면·높이(알약)를 쓴다 — 같은 폼 안에서 필드 문법이 갈리지 않게 한다.
  periodField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: LiquidLayout.pillHeight,
    backgroundColor: Liquid.surfaceSunken,
    borderRadius: LiquidRadius.pill,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  // 날짜·구분자뿐이라 콘덴스드를 쓴다(한글이 섞이지 않는 문자열).
  periodText: {
    fontFamily: LiquidFont.condensed,
    fontSize: 16,
    color: Liquid.ink,
  },
  // 플레이스홀더는 한글이라 콘덴스드를 벗긴다 — Archivo Narrow에 한글 글리프가 없다.
  periodPlaceholder: {
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    color: Liquid.inkMuted,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  // 아이콘 전용 컨트롤이라 HIG 최소 터치 타깃 44pt를 채운다.
  navigationButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
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
    fontSize: LiquidType.caption.fontSize,
    color: Liquid.inkSecondary,
  },
  // 달력 요일색은 시맨틱 예외다(CLAUDE.md) — 리디자인해도 바꾸지 않는다.
  sundayText: {
    color: '#FF5252',
  },
  saturdayText: {
    color: '#2196F3',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: '14.28%', // 100% / 7 days
    height: 44,
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
  // 고른 양 끝은 잉크 채움(선택 칩과 같은 문법), 그 사이는 가라앉은 면으로 잇는다.
  selectedDay: {
    backgroundColor: Liquid.ink,
  },
  rangeDay: {
    backgroundColor: Liquid.surfaceSunken,
  },
  dayText: {
    textAlign: 'center',
    color: Liquid.ink,
  },
  otherMonthText: {
    color: Liquid.inkSubtle,
  },
  selectedDayText: {
    color: Liquid.surface,
  },
  /**
   * 오늘 표식. 라임 계열 잉크를 쓴다 — 잉크로 두면 고른 날(잉크 채움)과 같은 값이라
   * 시스템이 알려 주는 사실(오늘)과 사용자가 고른 값이 구분되지 않는다. 라임 원색은
   * 4px 점으로는 흰 면에서 거의 보이지 않아 한 단계 어두운 값을 쓴다.
   */
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Liquid.limeInk,
  },
});

export default DateRangeCalendarView;
