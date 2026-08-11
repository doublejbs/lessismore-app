import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import Gear from '@/model/gear/Gear';
import BagItem from '@/model/bag/BagItem';
import { formatBagWeight } from '@/model/gear/WeightFormat';
import { getHomeRecordSummary } from '@/model/home/HomeRecordSummary';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';

interface Props {
  gears: Gear[];
  bags: BagItem[];
}

/**
 * HM-7 내 기록 — 장비·창고 무게·배낭·안 쓴 장비 네 수치 (Liquid Depth).
 *
 * 홈 맨 아래에 둔다. 위쪽은 "다음에 할 일"(HM-1·HM-4)이고 이건 훑고 내려온 끝에 놓이는
 * 회고성 정보다.
 *
 * **누를 수 있는 건 `안 쓴 장비` 하나뿐이다.** 나머지 셋은 다음 행동이 없어 표시로 족하고,
 * 이 지표만 "덜어내기"라는 분명한 다음 걸음이 있어 창고를 그 필터가 걸린 채로 연다.
 *
 * **강조는 색이 아니라 동작으로 한다**(2026-08-11 디자인 리뷰). 그 숫자만 `limeInk`로 세워
 * 두었더니 카드에서 가장 덜 중요한 값이 앱의 액센트를 입어 시선을 먼저 끌었다 — 숫자는 넷
 * 모두 잉크로 두고, 이 지표에만 쉐브론을 붙여 눌러서 갈 수 있는 자리임을 밝힌다.
 * 라임 **면**도 쓰지 않는다 — 이 화면의 라임 면은 위쪽 히어로 하나뿐이다.
 */
const HomeRecordSummaryView: FC<Props> = ({ gears, bags }) => {
  const router = useRouter();
  const summary = getHomeRecordSummary(gears, bags);

  // 창고도 배낭도 없으면 보여줄 기록이 없다(HM 원칙: 빈 카드는 그리지 않는다).
  if (summary.gearCount === 0 && summary.bagCount === 0) {
    return null;
  }

  const handlePressUnused = () => {
    router.push('/warehouse?unusedOnly=1');
  };

  const renderMetric = (label: string, value: string) => (
    <View key={label} style={styles.metric}>
      <PretendardText style={styles.metricValue}>{value}</PretendardText>
      <PretendardText weight='semibold' style={styles.metricLabel}>
        {label}
      </PretendardText>
    </View>
  );

  return (
    <View style={styles.section}>
      <LiquidSectionLabel>내 기록</LiquidSectionLabel>

      <View style={styles.card}>
        {renderMetric('장비', String(summary.gearCount))}
        {/* `총 무게`가 아니라 `창고 무게`다 — 홈 히어로(그 배낭 무게)·배낭 상세(그 배낭)와
            같은 말을 쓰면 세 화면에서 뜻이 셋으로 갈린다(2026-08-11 사용자 결정). */}
        {renderMetric('창고 무게', formatBagWeight(summary.totalWeightGram))}
        {/* 배낭 탭·배낭 상세와 같은 말을 쓴다 — `여행`은 여행지·여행 중과 겹친다. */}
        {renderMetric('배낭', String(summary.bagCount))}

        {/* 유일하게 다음 걸음이 있는 지표라 누를 수 있게 둔다 — 라벨 옆 쉐브론이 그 신호다. */}
        <TouchableOpacity
          style={styles.metric}
          onPress={handlePressUnused}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel={`안 쓴 장비 ${summary.unusedCount}개, 창고에서 보기`}
        >
          <PretendardText style={styles.metricValue}>
            {String(summary.unusedCount)}
          </PretendardText>
          <View style={styles.metricLinkRow}>
            <PretendardText weight='semibold' style={styles.metricLabel}>
              안 쓴 장비
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={13}
              color={Liquid.inkMuted}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: LiquidLayout.section,
  },
  // 2×2 격자. 지표가 넷이라 한 줄에 넷을 넣으면 큰 글씨에서 값이 잘린다.
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  metric: {
    width: '50%',
    gap: 4,
    paddingVertical: 10,
    minHeight: LiquidLayout.touchMin,
  },
  metricValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: Liquid.ink,
  },
  metricLabel: {
    fontSize: 12.5,
    color: Liquid.inkSecondary,
  },
  // 라벨과 쉐브론이 한 덩어리로 링크처럼 읽혀야 한다 — 라벨 폭에 붙인다.
  metricLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
});

export default HomeRecordSummaryView;
