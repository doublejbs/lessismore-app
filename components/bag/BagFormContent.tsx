import { FC } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import DateRangeCalendar from './DateRangeCalendarView';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  title: string;
  inputValue: string;
  startDate: dayjs.Dayjs | null;
  endDate: dayjs.Dayjs | null;
  confirmText: string;
  /**
   * 저장 요청이 오가는 중 — 세 호출부(생성·복사·정보 수정) 모두 이 뜻으로 넘긴다.
   * 입력 검증 결과가 아니라 **진행 중** 상태라, 재탭을 막으면서 진행 표시까지 붙인다.
   */
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
        <LiquidFieldLabel>배낭 이름</LiquidFieldLabel>
        <TextInput
          style={styles.textInput}
          placeholder='배낭 이름을 입력해주세요'
          value={inputValue}
          onChangeText={onChangeName}
          placeholderTextColor={Liquid.inkMuted}
          accessibilityLabel='배낭 이름'
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
        <LiquidPillButton
          label='취소'
          variant='secondary'
          onPress={onCancel}
          style={styles.button}
        />
        {/* 처리 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 사라지면
            무엇을 기다리는지 알 수 없다(공유 시트 BD-7과 같은 처리). */}
        <LiquidPillButton
          label={confirmText}
          variant='primary'
          onPress={onConfirm}
          disabled={disabled}
          busy={disabled}
          leading={
            disabled ? <ActivityIndicator color={Liquid.surface} /> : null
          }
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 폼 시트는 종이 면이다 — 입력이 곧 화면이라 카드를 겹치지 않고, 입력 면만 가라앉힌다.
    backgroundColor: Liquid.surface,
    /**
     * 그래버 아래 여백. **앞 단계인 `배낭 추가` 시트(`app/bag-add-options.tsx`)와 같은 20pt**를 쓴다
     * — 두 시트가 연달아 뜨므로 상단 여백이 다르면 화면이 튄 것처럼 보인다.
     * 예전 52pt는 그래버를 피하려던 값인데, 같은 네이티브 formSheet인 배낭 추가 시트가
     * 20pt로도 가려지지 않는 것으로 확인돼 과했다.
     */
    paddingTop: 20,
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
    paddingHorizontal: LiquidLayout.screenH,
    marginBottom: 20,
  },
  // 시트 제목은 화면 대상이라 title3 — 폼 라벨(마이크로)과 위계가 갈린다(sort-sheet 선례).
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    marginBottom: 24,
  },
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  inputSection: {
    flexDirection: 'column',
    marginBottom: 28,
  },
  /**
   * `PretendardText`를 쓸 수 없는 자리라 서체를 직접 건다(TextInput 예외).
   * 한 줄 입력이라 아래 버튼 줄과 같은 알약이다 — 입력과 액션이 한 덩어리로 읽힌다
   * (닉네임 편집 시트와 같은 값).
   */
  textInput: {
    height: LiquidLayout.pillHeight,
    paddingHorizontal: 20,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    color: Liquid.ink,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: LiquidLayout.listGap,
    paddingHorizontal: LiquidLayout.screenH,
  },
  button: {
    flex: 1,
  },
});

export default BagFormContent;
