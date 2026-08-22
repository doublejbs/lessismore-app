import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Color,
  Spacing,
} from '@/constants/DesignTokens';

interface Props {
  onRequestPermission: () => void;
}

// 권한 요청 전 설명 화면(HA-2). HealthKit은 무엇을 왜 읽는지 앱 UI에서 먼저
// 드러내야 한다(App Store 심사 2.5.1) — 이 화면의 주 액션에서만 권한 시트가 뜬다.
//
// **주 액션 문구는 중립어(`계속`)여야 한다** — App Store 심사 5.1.1(iv), 2026-08-21 지적.
// `건강 앱에서 불러오기`처럼 허용을 권유하는 낱말은 "사용자에게 권한 허용을 유도한다"로
// 판정된다. 접근성 라벨도 같은 기준을 받는다(이전 값 `건강 앱 접근 허용하기`가 더 직접적이었다).
// 무엇을 읽는지는 위 본문·목록이 설명하므로 버튼이 그 역할을 대신할 필요가 없다.
const READ_ITEMS = [
  '운동 기록(종류·시간·거리)',
  '이동 경로와 상승고도',
  '소모 칼로리와 심박수',
];

const BagActivityIntroView: FC<Props> = ({ onRequestPermission }) => {
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Ionicons name='heart-outline' size={40} color={Color.textPrimary} />
        <PretendardText style={styles.title} weight='semibold'>
          건강 앱의 운동 기록을 가져옵니다
        </PretendardText>
        <PretendardText style={styles.description}>
          최근 운동 기록을 골라 배낭에 연결합니다. 아래 항목만 읽고, 건강 앱에
          쓰거나 서버에 저장하지 않습니다.
        </PretendardText>
        <View style={styles.itemList}>
          {READ_ITEMS.map(item => (
            <View key={item} style={styles.item}>
              <Ionicons
                name='checkmark'
                size={16}
                color={Color.textSecondary}
              />
              <PretendardText style={styles.itemText}>{item}</PretendardText>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onRequestPermission}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel='계속'
      >
        <PretendardText style={styles.primaryButtonText} weight='semibold'>
          계속
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: Spacing.section,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.item,
  },
  title: {
    ...AcgType.screenTitle,
    color: Color.textPrimary,
  },
  description: {
    ...AcgType.body,
    color: Color.textSecondary,
  },
  itemList: {
    gap: 8,
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default BagActivityIntroView;
