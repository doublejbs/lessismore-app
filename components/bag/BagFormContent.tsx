import React, { FC } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import DateRangeCalendar from './DateRangeCalendarView';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  title: string;
  inputValue: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  confirmText: string;
  disabled?: boolean;
  onChangeName: (text: string) => void;
  onStartDateChange: (date: dayjs.Dayjs) => void;
  onEndDateChange: (date: dayjs.Dayjs | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// 배낭 생성/복사 폼의 공용 내용(제목 + 이름 입력 + 날짜 범위 + 취소/확인).
// 네이티브 formSheet 라우트(bag-new / bag-copy) 안에서 렌더된다. 그래버·키보드 회피는 OS 제공.
const BagFormContent: FC<Props> = ({
  title,
  inputValue,
  startDate,
  endDate,
  confirmText,
  disabled = false,
  onChangeName,
  onStartDateChange,
  onEndDateChange,
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom - 12, 12) }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        bounces={true}
      >
        <PretendardText weight='bold' style={styles.title}>
          {title}
        </PretendardText>
        <View style={styles.inputSection}>
          <PretendardText weight='semibold' style={styles.inputLabel}>
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
        <DateRangeCalendar
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
          <PretendardText weight='semibold' style={styles.cancelButtonText}>
            취소
          </PretendardText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, disabled && styles.confirmButtonDisabled]}
          onPress={onConfirm}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <PretendardText weight='semibold' style={styles.confirmButtonText}>
            {confirmText}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다.
    paddingTop: 36,
  },
  scrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: Color.textPrimary,
    marginBottom: 16,
  },
  inputSection: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: Color.textPrimary,
  },
  textInput: {
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  confirmButton: {
    flex: 1,
    height: 52,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default BagFormContent;
