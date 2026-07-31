import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';
import HomeTripStage from '@/model/home/HomeTripStage';
import {
  getDDayLabel,
  getPrimaryAction,
  HomeTripPlan,
} from '@/model/home/HomeTripPlan';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import app from '@/model/app/App';

interface Props {
  plan: HomeTripPlan;
}

/**
 * HM-1 다가오는 일정.
 *
 * 이 카드의 핵심은 **주 액션이 남은 일수에 따라 갈린다**는 것이고, 그 분기는
 * 알림(NT-2/NT-3)이 유도하는 행동과 같은 목적지여야 한다 — 알림을 놓쳐도 홈에서
 * 같은 할 일에 닿게 하는 것이 존재 이유다. 분기 계산은 `HomeTripPlan`이 맡는다.
 */
const HomeUpcomingTripView: FC<Props> = ({ plan }) => {
  const router = useRouter();
  const { primary, stage, next } = plan;

  const handleCreate = async () => {
    await createQuickBag(router);
  };

  const handleOpenBag = (bag: BagItem) => {
    app.getAnalyticsManager()?.logClick('home_trip');
    router.push(`/bag/${bag.getID()}`);
  };

  const handlePrimaryAction = () => {
    if (!primary || stage === null) {
      return;
    }

    const action = getPrimaryAction(primary, stage);

    app.getAnalyticsManager()?.logClick('home_trip_action', { stage });
    router.push(action.route as never);
  };

  if (!primary || stage === null) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <PretendardText weight='bold' style={styles.sectionTitle}>
            다가오는 일정
          </PretendardText>
        </View>
        <View style={styles.card}>
          <PretendardText weight='bold' style={styles.emptyTitle}>
            아직 계획한 여행이 없어요
          </PretendardText>
          <PretendardText style={styles.emptySubtitle}>
            이번 주말 1박으로 하나 만들어 둘까요?
          </PretendardText>
          <TouchableOpacity
            style={styles.cta}
            onPress={handleCreate}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='새 배낭 만들기'
          >
            <PretendardText weight='bold' style={styles.ctaText}>
              새 배낭 만들기
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dDayLabel = getDDayLabel(primary);
  const action = getPrimaryAction(primary, stage);
  const locationName = primary.getLocationName();
  const displayDate = primary.getDisplayDate();
  // 배낭에 저장된 스냅샷을 읽을 뿐 새로 조회하지 않는다(HM-1). 요약 규칙(눈>비>맑음)은
  // 배낭 상세·날씨 화면과 같은 함수를 공유해 표시가 갈리지 않게 한다.
  const weatherSummary = summarizeWeatherPeriod(
    primary.getWeather()?.daily ?? []
  );
  // 이미 시작한 일은 주 액션이 아니다 — 여행 중에는 보조 버튼으로 내린다.
  const isSecondaryAction = stage === HomeTripStage.Ongoing;
  const packingPercent = primary.getPackingPercent();
  const hasPackingRecord = primary.hasPackingRecord();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <PretendardText weight='bold' style={styles.sectionTitle}>
          다가오는 일정
        </PretendardText>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => handleOpenBag(primary)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${primary.getName()} 배낭 상세`}
        >
          {dDayLabel !== null && (
            <View style={styles.dDayRow}>
              <View style={styles.dDayBadge}>
                <PretendardText weight='bold' style={styles.dDayText}>
                  {dDayLabel}
                </PretendardText>
              </View>
            </View>
          )}

          <PretendardText
            weight='bold'
            style={styles.tripName}
            numberOfLines={1}
          >
            {primary.getName()}
          </PretendardText>

          {(displayDate !== null || locationName !== null) && (
            <PretendardText style={styles.tripMeta} numberOfLines={1}>
              {[displayDate, locationName].filter(Boolean).join(' · ')}
            </PretendardText>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <PretendardText style={styles.statKey}>총 무게</PretendardText>
              <PretendardText weight='bold' style={styles.statValue}>
                {`${primary.getWeight()}kg`}
              </PretendardText>
            </View>
            <View style={[styles.stat, styles.statDivided]}>
              <PretendardText style={styles.statKey}>
                {weatherSummary ? '예보' : '장비'}
              </PretendardText>
              <PretendardText weight='bold' style={styles.statValue}>
                {weatherSummary
                  ? `${weatherSummary.cond} ${weatherSummary.low}° / ${weatherSummary.high}°`
                  : `${primary.getGearCount()}개`}
              </PretendardText>
            </View>
          </View>
        </TouchableOpacity>

        {hasPackingRecord && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              <PretendardText style={styles.progressLabel}>
                패킹 진행
              </PretendardText>
              <PretendardText style={styles.progressLabel}>
                {`${packingPercent}%`}
              </PretendardText>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${packingPercent}%` }]}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.cta, isSecondaryAction && styles.ctaGhost]}
          onPress={handlePrimaryAction}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={action.label}
        >
          <PretendardText
            weight='bold'
            style={[styles.ctaText, isSecondaryAction && styles.ctaGhostText]}
          >
            {action.label}
          </PretendardText>
        </TouchableOpacity>
      </View>

      {next.map(bag => (
        <TouchableOpacity
          key={bag.getID()}
          style={styles.nextRow}
          onPress={() => handleOpenBag(bag)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${bag.getName()} 배낭 상세`}
        >
          <PretendardText style={styles.nextDDay}>
            {getDDayLabel(bag) ?? ''}
          </PretendardText>
          <PretendardText style={styles.nextName} numberOfLines={1}>
            {bag.getName()}
          </PretendardText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHead: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  card: {
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.modal,
    padding: 18,
  },
  dDayRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dDayBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: Radius.card,
    backgroundColor: Color.chipActiveBg,
  },
  dDayText: {
    fontSize: 12,
    color: Color.background,
  },
  tripName: {
    fontSize: 21,
    color: Color.textPrimary,
    marginBottom: 4,
  },
  tripMeta: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Color.borderLight,
  },
  stat: {
    flex: 1,
    paddingVertical: 12,
    gap: 2,
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Color.borderLight,
    paddingLeft: 14,
  },
  statKey: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  statValue: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  progressWrap: {
    marginTop: 16,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Color.chipInactiveBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Color.chipActiveBg,
  },
  cta: {
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: Radius.card,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGhost: {
    backgroundColor: Color.inputBg,
  },
  ctaText: {
    fontSize: 15,
    color: Color.background,
  },
  ctaGhostText: {
    color: Color.textPrimary,
  },
  emptyTitle: {
    fontSize: 17,
    color: Color.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  nextDDay: {
    fontSize: 12,
    color: Color.textSecondary,
    minWidth: 44,
  },
  nextName: {
    flex: 1,
    fontSize: 14,
    color: Color.textPrimary,
  },
});

export default observer(HomeUpcomingTripView);
