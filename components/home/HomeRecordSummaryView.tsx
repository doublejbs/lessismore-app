import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import Gear from '@/model/gear/Gear';
import BagItem from '@/model/bag/BagItem';
import { getHomeRecordSummary } from '@/model/home/HomeRecordSummary';
import { Acg, AcgShadow } from '@/constants/DesignTokens';

interface Props {
  gears: Gear[];
  bags: BagItem[];
}

// 섹션 제목 크기(ACG) — 홈의 다른 섹션과 같은 18px/700.
const SECTION_TITLE_SIZE = 18;

/**
 * HM-7 내 기록 — 장비·총 무게·여행·안 쓴 장비 네 수치.
 *
 * 홈 맨 아래에 둔다. 위쪽은 "다음에 할 일"(HM-1·HM-4)이고 이건 훑고 내려온 끝에 놓이는
 * 회고성 정보다.
 *
 * **누를 수 있는 건 `안 쓴 장비` 하나뿐이다.** 나머지 셋은 다음 행동이 없어 표시로 족하고,
 * 이 지표만 "덜어내기"라는 분명한 다음 걸음이 있어 창고를 그 필터가 걸린 채로 연다.
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
      <View style={styles.sectionHead}>
        <PretendardText weight='bold' style={styles.sectionTitle}>
          내 기록
        </PretendardText>
      </View>

      <View style={styles.card}>
        {renderMetric('장비', String(summary.gearCount))}
        {renderMetric('총 무게', `${summary.totalWeightKg}kg`)}
        {renderMetric('여행', String(summary.bagCount))}

        {/* 유일하게 다음 걸음이 있는 지표라 누를 수 있게 둔다. */}
        <TouchableOpacity
          style={styles.metric}
          onPress={handlePressUnused}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`안 쓴 장비 ${summary.unusedCount}개, 창고에서 보기`}
        >
          <PretendardText style={styles.metricLabel}>안 쓴 장비</PretendardText>
          <AcgDisplayText style={[styles.metricValue, styles.metricAccent]}>
            {String(summary.unusedCount)}
          </AcgDisplayText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHead: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SECTION_TITLE_SIZE,
    color: Acg.textTertiary,
  },
  // 2×2 격자. 지표가 넷이라 한 줄에 넷을 넣으면 큰 글씨에서 값이 잘린다.
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  metric: {
    width: '50%',
    gap: 2,
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: Acg.textSecondary,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    color: Acg.ink,
  },
  // 덜어낼 후보라 앱의 액센트로 세운다 — 이 숫자만 누를 수 있다는 신호도 겸한다.
  metricAccent: {
    color: Acg.limeText,
  },
});

export default HomeRecordSummaryView;
