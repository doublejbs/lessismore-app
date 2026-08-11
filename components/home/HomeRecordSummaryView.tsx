import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import Gear from '@/model/gear/Gear';
import BagItem from '@/model/bag/BagItem';
import { getHomeRecordSummary } from '@/model/home/HomeRecordSummary';
import { Acg, AcgFontSize, AcgRadius } from '@/constants/DesignTokens';

interface Props {
  gears: Gear[];
  bags: BagItem[];
}

/**
 * HM-7 내 기록 — 장비·총 무게·여행·안 쓴 장비 네 수치.
 *
 * 홈 맨 아래에 둔다. 위쪽은 "다음에 할 일"(HM-1·HM-4)이고 이건 훑고 내려온 끝에 놓이는
 * 회고성 정보다.
 *
 * **누를 수 있는 건 `안 쓴 장비` 하나뿐이다.** 나머지 셋은 다음 행동이 없어 표시로 족하고,
 * 이 지표만 "덜어내기"라는 분명한 다음 걸음이 있어 창고를 그 필터가 걸린 채로 연다.
 * 그 하나를 라임 숫자가 아니라 **셰브론**으로 알린다(2026-08-11) — 홈의 라임은 일정 면의
 * 주 액션 하나뿐이고, 색으로 누를 수 있음을 말하면 색맹 사용자에게는 신호가 사라진다.
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
      <PretendardText style={styles.metricLabel}>{label}</PretendardText>
      <AcgDisplayText style={styles.metricValue}>{value}</AcgDisplayText>
    </View>
  );

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title='내 기록' />

      {/* 2×2 격자. 지표가 넷이라 한 줄에 넷을 넣으면 큰 숫자에서 값이 잘린다. */}
      <View style={styles.tile}>
        {renderMetric('장비', String(summary.gearCount))}
        {renderMetric('총 무게', `${summary.totalWeightKg}kg`)}
        {renderMetric('여행', String(summary.bagCount))}

        <TouchableOpacity
          style={styles.metric}
          onPress={handlePressUnused}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`안 쓴 장비 ${summary.unusedCount}개, 창고에서 보기`}
        >
          <View style={styles.metricLabelRow}>
            <PretendardText style={styles.metricLabel}>
              안 쓴 장비
            </PretendardText>
            <Ionicons name='chevron-forward' size={14} color={Acg.textMuted} />
          </View>
          <AcgDisplayText style={styles.metricValue}>
            {String(summary.unusedCount)}
          </AcgDisplayText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  tile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    // 순백 지면 위 연회색 면(HomeUpcomingTripView의 면과 같은 규칙).
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
  },
  metric: {
    width: '50%',
    gap: 2,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Acg.textMuted,
  },
  metricValue: {
    fontSize: 26,
    lineHeight: 30,
    color: Acg.ink,
  },
});

export default HomeRecordSummaryView;
