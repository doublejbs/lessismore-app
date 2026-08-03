import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgShadow } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgHighlightText from '@/components/acg/AcgHighlightText';
import AcgPaperView from '@/components/acg/AcgPaperView';
import BagItem from '@/model/bag/BagItem';
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
          <AcgHighlightText fontSize={SECTION_TITLE_SIZE}>
            <PretendardText weight='bold' style={styles.sectionTitle}>
              다가오는 일정
            </PretendardText>
          </AcgHighlightText>
        </View>
        <View style={styles.emptyCard}>
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
  // 챙긴 무게는 장비 문서를 따로 읽어야 나오는데(BagItem은 ID만 들고 있다) 그러면 홈의
  // `네트워크 호출 없음`이 깨진다 — 개수와 진행 바까지만 보여준다.
  const hasPackingRecord = primary.hasPackingRecord();
  const packedCount = primary.getPackedGearCount();
  const gearCount = primary.getGearCount();
  const packingPercent = primary.getPackingPercent();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AcgHighlightText fontSize={SECTION_TITLE_SIZE}>
          <PretendardText weight='bold' style={styles.sectionTitle}>
            다가오는 일정
          </PretendardText>
        </AcgHighlightText>
      </View>

      {/* D-day 스티커는 카드 좌상단에 걸친다(ACG) — 카드보다 먼저 그리면 잘리므로
          형제로 두고 absolute로 얹는다.
          **좌측으로는 내보내지 않는다**(2026-08-03 실기기 확인): 바깥 ScrollView의 경계가
          화면 좌우 패딩(18pt)과 같아 그 밖으로 나간 부분이 잘린다. 시안의 `left: -6`을
          그대로 쓰면 스티커 왼쪽 변이 수직으로 잘려 보였다. 걸침은 위쪽(top: -13)으로만
          낸다 — 위는 섹션 제목 여백이 있어 잘리지 않는다. */}
      <View style={styles.cardWrap}>
        {dDayLabel !== null && (
          <View style={styles.dDaySticker}>
            <AcgDisplayText style={styles.dDayText}>{dDayLabel}</AcgDisplayText>
          </View>
        )}
        <View style={styles.card}>
        <TouchableOpacity
          onPress={() => handleOpenBag(primary)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${primary.getName()} 배낭 상세`}
        >
          <PretendardText
            weight='bold'
            style={styles.tripName}
            numberOfLines={1}
          >
            {primary.getName()}
          </PretendardText>

          {/* 여행지는 날짜 뒤에 `·`로 붙이지 않고 **제 줄**을 준다. 꼬리표로 달면
              긴 기간 문자열 끝에 회색으로 묻혀 "어디 가는지"가 안 읽힌다.
              아이콘 + 본문색은 배낭 상세 여행지 타일(DST-2)이 쓰는 표현과 같다. */}
          {locationName !== null && (
            <View style={styles.locationRow}>
              <Ionicons
                name='location-outline'
                size={14}
                color={Acg.ink}
              />
              <PretendardText
                weight='semibold'
                style={styles.locationText}
                numberOfLines={1}
              >
                {locationName}
              </PretendardText>
            </View>
          )}

          {displayDate !== null && (
            <AcgDisplayText style={styles.tripMeta} numberOfLines={1}>
              {displayDate}
            </AcgDisplayText>
          )}

          {/* 날씨가 없으면 그 칸을 비워 두지 않고 아예 두지 않는다 — 채우려고 장비 수 같은
              다른 지표를 끼워 넣으면 칸의 뜻이 배낭마다 달라진다. */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <PretendardText style={styles.statKey}>총 무게</PretendardText>
              <AcgDisplayText style={styles.statValue}>
                {`${primary.getWeight()}kg`}
              </AcgDisplayText>
            </View>
            {weatherSummary ? (
              <View style={[styles.stat, styles.statDivided]}>
                <PretendardText style={styles.statKey}>예보</PretendardText>
                {/* 날씨는 `흐림` 같은 한글이 섞여 콘덴스드를 못 쓴다(한글 글리프 없음). */}
                <PretendardText
                  weight='bold'
                  style={styles.statValueMixed}
                  numberOfLines={1}
                >
                  {`${weatherSummary.cond} ${weatherSummary.low}°/${weatherSummary.high}°`}
                </PretendardText>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {hasPackingRecord ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              {/* 배낭 상세 하단 바가 쓰는 `패킹 {n}/{m}`(PK-2)과 같은 말이다 —
                  같은 값을 두 화면이 다르게 부르면 같은 것인지 알아보기 어렵다. */}
              <PretendardText style={styles.progressLabel}>패킹</PretendardText>
              <AcgDisplayText style={styles.progressValue}>
                {`${packedCount}/${gearCount}`}
              </AcgDisplayText>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${packingPercent}%` }]}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={styles.cta}
          onPress={handlePrimaryAction}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={action.label}
        >
          <PretendardText weight='bold' style={styles.ctaText}>
            {action.label}
          </PretendardText>
        </TouchableOpacity>
        </View>
        </View>
      </View>

      {next.map(bag => (
        <AcgPaperView key={bag.getID()} style={styles.nextRowWrap}>
        <TouchableOpacity
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
          {/* 눌리는 행에는 화살표를 둔다 — 창고 미리보기 장비 행·정보 탭 메뉴와 같은 규칙이다. */}
          <Ionicons name='chevron-forward' size={13} color={Acg.textSecondary} />
        </TouchableOpacity>
        </AcgPaperView>
      ))}
    </View>
  );
};

// 섹션 제목 크기(ACG) — 18px/700.
const SECTION_TITLE_SIZE = 18;

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
  // 스티커가 카드 밖으로 걸치므로 잘리지 않게 감싸는 래퍼를 둔다.
  cardWrap: {
    position: 'relative',
    marginTop: 22,
  },
  // D-day 스티커 — 잉크 면 + 라임 글자, 좌상단에 비스듬히 얹는다(ACG).
  dDaySticker: {
    position: 'absolute',
    // 회전(-5deg)으로 좌하단 모서리가 1~2px 더 나가므로 0이 아니라 2에서 시작한다.
    left: 2,
    top: -13,
    zIndex: 2,
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.ink,
    transform: [{ rotate: '-5deg' }],
    boxShadow: AcgShadow.sticker,
  },
  dDayText: {
    fontSize: 15,
    letterSpacing: 1.2, // .08em
    color: Acg.lime,
  },
  // 일정 카드는 라임 면이 통째로 액센트다 — 이 화면의 유일한 큰 액센트 면.
  card: {
    backgroundColor: Acg.lime,
    boxShadow: AcgShadow.card,
  },
  tripName: {
    fontSize: 21,
    letterSpacing: -0.5,
    lineHeight: 26,
    color: Acg.ink,
    paddingTop: 20,
    paddingHorizontal: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 14,
    color: Acg.ink,
  },
  tripMeta: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingBottom: 18,
    fontSize: 13,
    letterSpacing: 0.78, // .06em
    color: Acg.textSecondary,
  },
  // 총 무게 / 예보 2열 — 라임 면 위라 구분선은 잉크 계열 `line2`를 쓴다.
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Acg.line2,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Acg.line2,
  },
  statKey: {
    fontSize: 11,
    color: Acg.textSecondary,
  },
  statValue: {
    marginTop: 6,
    fontSize: 26,
    letterSpacing: -0.52,
    lineHeight: 26,
    color: Acg.ink,
  },
  // 한글이 섞인 값 — 콘덴스드가 아니라 한 단계 작게 잡아 폭을 맞춘다.
  statValueMixed: {
    marginTop: 6,
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 26,
    color: Acg.ink,
  },
  progressWrap: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: Acg.line2,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressLabel: {
    fontSize: 12,
    color: Acg.textSecondary,
  },
  progressValue: {
    fontSize: 14,
    color: Acg.ink,
  },
  // 라임 면 위 트랙은 흰색, 채움은 잉크(ACG).
  progressTrack: {
    height: 6,
    marginTop: 8,
    backgroundColor: Acg.paper,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Acg.ink,
  },
  ctaWrap: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Acg.line2,
  },
  // 주 액션 — 잉크 면을 살짝 비틀어 종이에 붙인 라벨처럼 보이게 한다(ACG).
  cta: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.ink,
    transform: [{ rotate: '-1.2deg' }],
    boxShadow: '0 6px 16px rgba(26,26,26,0.18)',
  },
  ctaText: {
    fontSize: 15,
    color: Acg.paper,
  },
  emptyCard: {
    marginTop: 22,
    padding: 18,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  emptyTitle: {
    fontSize: 17,
    color: Acg.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Acg.textSecondary,
  },
  nextRowWrap: {
    marginTop: 8,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  nextDDay: {
    minWidth: 44,
    fontSize: 12,
    color: Acg.textSecondary,
  },
  nextName: {
    flex: 1,
    fontSize: 14,
    color: Acg.ink,
  },
});

export default observer(HomeUpcomingTripView);
