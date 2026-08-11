import { FC } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgFontSize,
  AcgLayout,
  AcgRadius,
} from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import BagItem from '@/model/bag/BagItem';
import {
  getDDayLabel,
  getPrimaryAction,
  isCondensedDDayLabel,
  HomeTripEntry,
  HomeTripPlan,
} from '@/model/home/HomeTripPlan';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import app from '@/model/app/App';

interface Props {
  plan: HomeTripPlan;
}

// 주 액션 알약. 높이의 절반이 모서리다(완전한 알약) — 칩과 달리 낱개로 놓이는 액션이다.
const CTA_HEIGHT = 48;

// 카드 사이 간격.
const CARD_GAP = 10;

/**
 * 다음 카드가 화면 오른쪽에 걸치는 폭.
 *
 * 이만큼 보여야 **옆으로 넘길 게 더 있다**는 걸 알 수 있다 — 딱 맞게 자르면 한 장뿐인 것과
 * 구분되지 않는다. 점(page indicator)을 두는 대신 이 걸침으로 알린다: 점은 카드 아래 한 층을
 * 더 만들고, 세 장까지인 목록에서는 굳이 셀 필요가 없다.
 */
const CARD_PEEK = 28;

/**
 * HM-1 다가오는 일정.
 *
 * 이 섹션의 핵심은 **주 액션이 남은 일수에 따라 갈린다**는 것이고, 그 분기는
 * 알림(NT-2/NT-3)이 유도하는 행동과 같은 목적지여야 한다 — 알림을 놓쳐도 홈에서
 * 같은 할 일에 닿게 하는 것이 존재 이유다. 분기 계산은 `HomeTripPlan`이 맡는다.
 *
 * **일정이 여럿이면 옆으로 넘기는 캐러셀이다**(2026-08-11). 이전에는 첫 일정만 카드로 세우고
 * 나머지는 아래 한 줄 요약이었는데, 그러면 두 번째 일정의 무게·예보·패킹을 보려면 배낭 상세까지
 * 들어가야 했다. 카드를 같은 문법으로 넘기면 홈에서 비교가 끝난다.
 *
 * 표현은 탐색 탭(FD-2)과 같은 문법이다: 연회색/흰 면 하나 + 잉크 글자 + 콘덴스드 숫자.
 * **라임은 주 액션 알약 하나에만 쓴다** — 이전에는 카드 면 전체가 라임이라 화면에서 가장
 * 강한 것이 "정보"였고, 정작 눌러야 하는 버튼은 그 위의 검은 사각형이었다.
 */
const HomeUpcomingTripView: FC<Props> = ({ plan }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { trips } = plan;

  // 한 장뿐이면 화면 폭을 다 쓴다 — 걸침만 남으면 카드가 잘린 것처럼 보인다.
  const cardWidth =
    trips.length > 1
      ? width - AcgLayout.screenPadding * 2 - CARD_PEEK
      : width - AcgLayout.screenPadding * 2;

  const handleCreate = async () => {
    await createQuickBag(router);
  };

  const handleOpenBag = (bag: BagItem) => {
    app.getAnalyticsManager()?.logClick('home_trip');
    router.push(`/bag/${bag.getID()}`);
  };

  const handlePrimaryAction = ({ bag, stage }: HomeTripEntry) => {
    const action = getPrimaryAction(bag, stage);

    app.getAnalyticsManager()?.logClick('home_trip_action', { stage });
    router.push(action.route as never);
  };

  // D-day는 숫자 라벨일 때만 콘덴스드다 — `여행 중` 같은 한글은 글리프가 없어 깨진다.
  const renderDDay = (label: string) => {
    if (isCondensedDDayLabel(label)) {
      return <AcgDisplayText style={styles.dDay}>{label}</AcgDisplayText>;
    }

    return (
      <PretendardText weight='semibold' style={styles.dDayMixed}>
        {label}
      </PretendardText>
    );
  };

  const renderCard = (entry: HomeTripEntry) => {
    const { bag, stage } = entry;
    const dDayLabel = getDDayLabel(bag);
    const action = getPrimaryAction(bag, stage);
    const locationName = bag.getLocationName();
    const displayDate = bag.getDisplayDate();
    // 배낭에 저장된 스냅샷을 읽을 뿐 새로 조회하지 않는다(HM-1). 요약 규칙(눈>비>맑음)은
    // 배낭 상세·날씨 화면과 같은 함수를 공유해 표시가 갈리지 않게 한다.
    const weatherSummary = summarizeWeatherPeriod(
      bag.getWeather()?.daily ?? []
    );
    // 챙긴 무게는 장비 문서를 따로 읽어야 나오는데(BagItem은 ID만 들고 있다) 그러면 홈의
    // `네트워크 호출 없음`이 깨진다 — 개수와 진행 바까지만 보여준다.
    const hasPackingRecord = bag.hasPackingRecord();

    return (
      <View key={bag.getID()} style={[styles.tile, { width: cardWidth }]}>
        {/*
          면 안에서 이름과 D-day를 한 줄에 둔다. D-day를 스티커로 면 밖에 얹지 않는다 —
          걸침·회전·그림자는 면 하나로 정리한 이 톤에서 유일한 예외가 되고, 스크롤 컨테이너
          경계에서 잘리는 문제도 있었다.
        */}
        <TouchableOpacity
          style={styles.head}
          onPress={() => handleOpenBag(bag)}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${bag.getName()} 배낭 상세`}
        >
          <View style={styles.headText}>
            <PretendardText
              weight='semibold'
              style={styles.tripName}
              numberOfLines={1}
            >
              {bag.getName()}
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

          {dDayLabel !== null ? renderDDay(dDayLabel) : null}
        </TouchableOpacity>

        {/* 총 무게 / 예보 — 레퍼런스의 지표 줄과 같은 문법(라벨 위, 값 아래, 세로 헤어라인).
            날씨가 없으면 그 칸을 비워 두지 않고 아예 두지 않는다 — 채우려고 다른 지표를
            끼워 넣으면 칸의 뜻이 배낭마다 달라진다. */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <PretendardText style={styles.statKey}>총 무게</PretendardText>
            <AcgDisplayText style={styles.statValue}>
              {`${bag.getWeight()}kg`}
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
                {`${bag.getPackedGearCount()}/${bag.getGearCount()}`}
              </AcgDisplayText>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${bag.getPackingPercent()}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* 화면의 유일한 라임 면 — 홈에서 눌러야 하는 것 하나.
            `marginTop: auto`로 카드 바닥에 붙여, 카드마다 내용 줄 수가 달라도(예보·패킹 유무)
            넘길 때 버튼이 같은 자리에 온다. */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => handlePrimaryAction(entry)}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={`${bag.getName()} ${action.label}`}
        >
          <PretendardText weight='semibold' style={styles.ctaText}>
            {action.label}
          </PretendardText>
        </TouchableOpacity>
      </View>
    );
  };

  if (trips.length === 0) {
    return (
      <View style={styles.section}>
        <AcgSectionHeaderView title='다가오는 일정' />

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

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView
        title='다가오는 일정'
        // 부제는 목록의 기준만 밝힌다 — 개수를 넣으면 셀 수 있는 것을 글로 또 세는 셈이다.
        subtitle={trips.length > 1 ? '가까운 일정 순' : undefined}
      />

      {trips.length === 1 ? (
        renderCard(trips[0]!)
      ) : (
        /**
         * 한 장씩 딱 멈추는 캐러셀. `pagingEnabled`는 **화면 폭** 단위로 멈춰서 걸침이 있는
         * 카드와 어긋나므로, 카드 폭 + 간격을 스냅 간격으로 준다.
         * 화면 패딩 밖으로 빼(`marginHorizontal: -패딩`) 카드가 지면 끝까지 흐르게 하고,
         * 첫 장·끝 장은 콘텐츠 패딩으로 화면 축에 맞춘다 — 칩 행과 같은 규칙이다.
         */
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + CARD_GAP}
          snapToAlignment='start'
          decelerationRate='fast'
          style={styles.carousel}
          contentContainerStyle={styles.carouselContent}
        >
          {trips.map(entry => renderCard(entry))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  carousel: {
    marginHorizontal: -AcgLayout.screenPadding,
  },
  carouselContent: {
    paddingHorizontal: AcgLayout.screenPadding,
    gap: CARD_GAP,
    // 카드마다 내용 줄 수가 달라도 높이를 맞춘다 — 넘길 때 면 아래 끝이 들쭉날쭉하면
    // 카드가 흔들리는 것처럼 보인다.
    alignItems: 'stretch',
  },
  /**
   * 홈의 정보 면. 지형 지면(#F4F3EF) 위라 **흰 종이**다 — 탐색의 연회색 면(#F2F2F2)을 그대로
   * 쓰면 지면색과 붙어 사라진다. 공유하는 규칙은 값이 아니라 모서리 12·그림자 없음이다.
   */
  tile: {
    backgroundColor: Acg.paper,
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
  // `여행 중`처럼 한글이 섞인 라벨 — 콘덴스드를 못 쓰므로 한 단계 작게 잡아 폭을 맞춘다.
  dDayMixed: {
    fontSize: AcgFontSize.rowTitle,
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
  // 흰 면 위 트랙이라 연회색이다(반대로 두면 트랙이 안 보인다). 채움은 잉크 —
  // 라임을 여기 쓰면 화면에 라임 면이 둘이 된다.
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Acg.ink,
  },
  cta: {
    marginTop: 'auto',
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
});

export default observer(HomeUpcomingTripView);
