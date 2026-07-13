import React, { FC } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
  const isAndroid = Platform.OS === 'android';

  // 본문(제목 + 이름 입력 + 날짜 범위)을 추출해, Android는 스크롤 컨테이너로 감싼다.
  const bodyContent = (
    <>
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
    </>
  );

  return (
    <View
      style={[
        styles.container,
        isAndroid && styles.containerFill,
        {
          // Android formSheet는 제스처 바 인셋을 제대로 못 잡아, 버튼이 홈 인디케이터와
          // 겹치지 않도록 하단 패딩을 넉넉히 확보한다. iOS는 홈 인디케이터에 맞춰 보정.
          paddingBottom: isAndroid
            ? Math.max(insets.bottom, 24)
            : Math.max(insets.bottom - 12, 12),
        },
      ]}
    >
      {isAndroid ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {bodyContent}
        </ScrollView>
      ) : (
        <View style={styles.body}>{bodyContent}</View>
      )}
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
    paddingTop: 52,
  },
  // Android는 고정 높이(0.9) 시트라 컨테이너를 채워 버튼을 하단에 고정한다.
  containerFill: {
    flex: 1,
  },
  // Android 본문 스크롤 영역. flex:1로 버튼을 하단으로 밀어낸다.
  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    color: Color.textPrimary,
    marginBottom: 24,
  },
  inputSection: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 28,
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
