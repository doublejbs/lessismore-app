import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  onRequestPermission: () => void;
}

// 권한 요청 전 설명 화면(HA-2). HealthKit은 무엇을 왜 읽는지 앱 UI에서 먼저
// 드러내야 한다(App Store 심사 2.5.1) — 이 화면의 주 액션에서만 권한 시트가 뜬다.
const READ_ITEMS = [
  '운동 기록(종류·시간·거리)',
  '이동 경로와 상승고도',
  '소모 칼로리와 심박수',
];

const HERO_ICON_SIZE = 40;
const ITEM_ICON_SIZE = 16;

const BagActivityIntroView: FC<Props> = ({ onRequestPermission }) => {
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Ionicons
          name='heart-outline'
          size={HERO_ICON_SIZE}
          color={Liquid.ink}
        />
        <PretendardText style={styles.title} weight='bold'>
          건강 앱의 운동 기록을 가져옵니다
        </PretendardText>
        <PretendardText style={styles.description}>
          최근 운동 기록을 골라 배낭에 연결합니다. 아래 항목만 읽고, 건강 앱에
          쓰거나 서버에 저장하지 않습니다.
        </PretendardText>
        {/* 읽는 범위는 심사에서 근거가 되는 목록이라 종이 면으로 묶어 본문과 구분한다. */}
        <LiquidCard tone='paper' radius='card' style={styles.itemList}>
          {READ_ITEMS.map(item => (
            <View key={item} style={styles.item}>
              <Ionicons
                name='checkmark'
                size={ITEM_ICON_SIZE}
                color={Liquid.inkSecondary}
              />
              <PretendardText style={styles.itemText}>{item}</PretendardText>
            </View>
          ))}
        </LiquidCard>
      </View>
      <LiquidPillButton
        label='건강 앱에서 불러오기'
        variant='primary'
        block
        onPress={onRequestPermission}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: LiquidLayout.section,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: Liquid.ink,
  },
  // 여러 줄 설명은 목업 박지 상세의 설명 값(14/22)을 쓴다.
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: Liquid.inkTertiary,
  },
  itemList: {
    marginTop: 4,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkSecondary,
  },
});

export default BagActivityIntroView;
