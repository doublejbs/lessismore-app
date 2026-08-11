import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, AcgRadius } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import BagItem from '@/model/bag/BagItem';
import {
  getDDayLabel,
  getPrimaryAction,
  isCondensedDDayLabel,
  HomeTripPlan,
} from '@/model/home/HomeTripPlan';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import app from '@/model/app/App';

interface Props {
  plan: HomeTripPlan;
}

// 주 액션 알약. 높이의 절반이 모서리다(완전한 알약).
const CTA_HEIGHT = 48;

// 다음 일정 행 — 44pt 터치 타깃.
const NEXT_ROW_HEIGHT = 52;

/**
 * HM-1 다가오는 일정.
 *
 * 이 카드의 핵심은 **주 액션이 남은 일수에 따라 갈린다**는 것이고, 그 분기는
 * 알림(NT-2/NT-3)이 유도하는 행동과 같은 목적지여야 한다 — 알림을 놓쳐도 홈에서
 * 같은 할 일에 닿게 하는 것이 존재 이유다. 분기 계산은 `HomeTripPlan`이 맡는다.
 *
 * 표현은 탐색 탭(FD-2)과 같은 문법이다(2026-08-11): 순백 지면 + 연회색 면 하나 + 잉크 글자.
 * **라임은 주 액션 알약 하나에만 쓴다** — 이전에는 카드 면 전체가 라임이라 화면에서 가장
 * 강한 것이 "정보"였고, 정작 눌러야 하는 버튼은 그 위의 검은 사각형이었다.
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

  // D-day는 숫자 라벨일 때만 콘덴스드다 — `여행 중` 같은 한글은 글리프가 없어 깨진다.
  const renderDDay = (label: string, style: object) => {
    if (isCondensedDDayLabel(label)) {
      return <AcgDisplayText style={style}>{label}</AcgDisplayText>;
    }

    return (
      <PretendardText weight='semibold' style={style}>
        {label}
      </PretendardText>
    );
  };

  if (!primary || stage === null) {
    return (
      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.sectionTitle}>
          다가오는 일정
        </PretendardText>

        {/* 빈 상태는 사실 + 다음 걸음 두 줄, 그리고 그 걸음을 떼는 버튼 하나. */}
        <View style={styles.tile}>
          <PretendardText weight='semibold' style={styles.emptyTitle}>
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
            <PretendardText weight='semibold' style={styles.ctaText}>
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
      <PretendardText weight='semibold' style={styles.sectionTitle}>
        다가오는 일정
      </PretendardText>

      <View style={styles.tile}>
        {/*
          면 안에서 이름과 D-day를 한 줄에 둔다. D-day를 스티커로 면 밖에 얹지 않는다 —
          걸침·회전·그림자는 면 하나로 정리한 이 톤에서 유일한 예외가 되고, 스크롤 컨테이너
          경계에서 잘리는 문제도 있었다.
        */}
        <TouchableOpacity
          style={styles.head}
          onPress={() => handleOpenBag(primary)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${primary.getName()} 배낭 상세`}
        >
          <View style={styles.headText}>
            <PretendardText
              weight='semibold'
              style={styles.tripName}
              numberOfLines={1}
            >
              {primary.getName()}
            </PretendardText>

            {/* 여행지는 날짜 뒤에 `·`로 붙이지 않고 제 줄을 준다 — 꼬리표로 달면
                긴 기간 문자열 끝에 묻혀 "어디 가는지"가 안 읽힌다. */}
            {locationName !== null && (
              <View style={styles.locationRow}>
                <Ionicons
                  name='location-outline'
                  size={14}
                  color={Acg.textMuted}
                />
                <PretendardText style={styles.locationText} numberOfLines={1}>
                  {locationName}
                </PretendardText>
              </View>
            )}

            {displayDate !== null && (
              <AcgDisplayText style={styles.tripDate} numberOfLines={1}>
                {displayDate}
              </AcgDisplayText>
            )}
          </View>

          {dDayLabel !== null ? renderDDay(dDayLabel, styles.dDay) : null}
        </TouchableOpacity>

        {/* 총 무게 / 예보 — 레퍼런스의 지표 줄과 같은 문법(라벨 위, 값 아래, 세로 헤어라인).
            날씨가 없으면 그 칸을 비워 두지 않고 아예 두지 않는다 — 채우려고 다른 지표를
            끼워 넣으면 칸의 뜻이 배낭마다 달라진다. */}
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
                weight='semibold'
                style={styles.statValueMixed}
                numberOfLines={1}
              >
                {`${weatherSummary.cond} ${weatherSummary.low}°/${weatherSummary.high}°`}
              </PretendardText>
            </View>
          ) : null}
        </View>

        {hasPackingRecord ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTop}>
              {/* 배낭 상세 하단 바가 쓰는 `패킹 {n}/{m}`(PK-2)과 같은 말이다 —
                  같은 값을 두 화면이 다르게 부르면 같은 것인지 알아보기 어렵다. */}
              <PretendardText style={styles.statKey}>패킹</PretendardText>
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

        {/* 화면의 유일한 라임 면 — 홈에서 눌러야 하는 것 하나. */}
        <TouchableOpacity
          style={styles.cta}
          onPress={handlePrimaryAction}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={action.label}
        >
          <PretendardText weight='semibold' style={styles.ctaText}>
            {action.label}
          </PretendardText>
        </TouchableOpacity>
      </View>

      {/* 다음 일정들은 면을 갖지 않는다 — 면이 여럿이면 어느 것이 지금 할 일인지 흐려진다.
          행 사이 헤어라인만으로 목록임을 알린다. */}
      {next.length > 0 ? (
        <View style={styles.nextList}>
          {next.map((bag, index) => {
            const label = getDDayLabel(bag);

            return (
              <TouchableOpacity
                key={bag.getID()}
                style={[styles.nextRow, index > 0 && styles.nextRowDivided]}
                onPress={() => handleOpenBag(bag)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={`${bag.getName()} 배낭 상세`}
              >
                <View style={styles.nextDDay}>
                  {label !== null
                    ? renderDDay(label, styles.nextDDayText)
                    : null}
                </View>
                <PretendardText style={styles.nextName} numberOfLines={1}>
                  {bag.getName()}
                </PretendardText>
                <Ionicons
                  name='chevron-forward'
                  size={16}
                  color={Acg.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  /**
   * 섹션 제목은 크게 세우지 않는다 — 제목이 커지면 화면의 앵커가 "이름표"가 된다.
   * 레퍼런스처럼 작은 반굵기 잉크 라벨로 두고, 형광펜 띠도 두지 않는다.
   */
  sectionTitle: {
    marginBottom: 10,
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
  // 홈의 정보 면. 탐색 셀과 같은 채움·모서리를 쓴다(FD-2).
  tile: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    gap: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  // `minWidth: 0`이 없으면 긴 이름이 D-day를 면 밖으로 밀어낸다.
  headText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  tripName: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 25,
    color: Acg.ink,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flexShrink: 1,
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Acg.textMuted,
  },
  tripDate: {
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    letterSpacing: 0.5,
    color: Acg.textMuted,
  },
  // 남은 일수는 이 면에서 가장 큰 숫자다 — 훑을 때 먼저 걸려야 하는 값이다.
  dDay: {
    fontSize: 26,
    lineHeight: 28,
    color: Acg.ink,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  // 값 사이 세로 헤어라인 — 두 지표가 한 덩어리로 붙어 읽히지 않게 한다.
  statDivided: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: Acg.hairline,
  },
  statKey: {
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Acg.textMuted,
  },
  statValue: {
    fontSize: 26,
    lineHeight: 30,
    color: Acg.ink,
  },
  // 한글이 섞인 값 — 콘덴스드가 아니라 한 단계 작게 잡아 폭을 맞춘다.
  statValueMixed: {
    fontSize: 18,
    lineHeight: 30,
    color: Acg.ink,
  },
  progressWrap: {
    gap: 6,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressValue: {
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
  // 트랙은 면보다 밝은 흰색, 채움은 잉크. 라임을 여기 쓰면 화면에 라임이 둘이 된다.
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Acg.paper,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Acg.ink,
  },
  cta: {
    minHeight: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.lime,
  },
  // 라임 면 위 글자는 잉크다 — 라임을 글자색으로 쓰면 대비가 모자란다.
  ctaText: {
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
  emptyTitle: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 25,
    color: Acg.ink,
  },
  emptySubtitle: {
    // 위 제목과 한 덩어리로 읽히도록 면의 기본 간격(14)을 좁힌다.
    marginTop: -10,
    fontSize: AcgFontSize.meta,
    lineHeight: 20,
    color: Acg.textMuted,
  },
  nextList: {
    marginTop: 6,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: NEXT_ROW_HEIGHT,
  },
  nextRowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  // D-day 열 폭을 고정해 이름들이 한 선에서 시작한다.
  nextDDay: {
    width: 44,
  },
  nextDDayText: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
  nextName: {
    flex: 1,
    minWidth: 0,
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
});

export default observer(HomeUpcomingTripView);
