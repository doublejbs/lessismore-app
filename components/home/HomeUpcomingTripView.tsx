import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Dayjs } from 'dayjs';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidProgressBar from '@/components/liquid/LiquidProgressBar';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';
import {
  formatBagWeight,
  formatBagWeightValue,
} from '@/model/gear/WeightFormat';
import { formatTripPeriod } from '@/model/home/HomeDateFormat';
import {
  getDDayLabel,
  getPrimaryAction,
  HomeTripPlan,
  isCondensedLabel,
} from '@/model/home/HomeTripPlan';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import app from '@/model/app/App';

interface Props {
  plan: HomeTripPlan;
  /**
   * D-day·기간의 기준 날짜. 화면이 포커스마다 새로 잡는 값을 그대로 받는다(HM-6) —
   * 여기서 `dayjs()`를 다시 부르면 자정을 넘긴 순간 히어로의 시점 계산(`plan`)과
   * 라벨이 서로 다른 날짜를 말한다.
   */
  today: Dayjs;
}

/**
 * 히어로 아래 한 줄 카드의 D-day 칸 최소 폭. `D-4`와 `D-45`처럼 자릿수가 다른 라벨이
 * 오면 이름의 좌측 축이 밀려 목록이 흔들린다 — 칸 폭을 고정해 축을 하나로 붙인다
 * (2026-08-11 디자인 리뷰). `오늘 출발`처럼 더 긴 한글 라벨은 잘리는 대신 칸을 넓힌다.
 */
const D_DAY_COLUMN_WIDTH = 60;

/** 한 줄 카드의 보조 줄(`4.9kg · 패킹 3/12`)을 잇는 구분자. */
const NEXT_META_SEPARATOR = ' · ';

/**
 * 한 줄 카드의 보조 줄. 히어로와 **같은 말**을 쓴다 — 무게는 DM-26 표기,
 * 패킹은 배낭 상세 하단 바(PK-2)와 같은 `패킹 {n}/{m}`이다. 없는 조각은 생략한다.
 */
const buildNextMeta = (bag: BagItem): string | null => {
  const parts: string[] = [];

  if (bag.getWeightGram() > 0) {
    parts.push(formatBagWeight(bag.getWeightGram()));
  }

  if (bag.hasPackingRecord()) {
    parts.push(`패킹 ${bag.getPackedGearCount()}/${bag.getGearCount()}`);
  }

  return parts.length > 0 ? parts.join(NEXT_META_SEPARATOR) : null;
};

/**
 * HM-1 다가오는 일정 (Liquid Depth).
 *
 * 이 카드의 핵심은 **주 액션이 남은 일수에 따라 갈린다**는 것이고, 그 분기는
 * 알림(NT-2/NT-3)이 유도하는 행동과 같은 목적지여야 한다. 분기 계산은 `HomeTripPlan`이 맡는다.
 *
 * 히어로는 이 화면의 **유일한 라임 면**이다 — 아래 창고·기록 섹션은 종이 면으로만 간다.
 */
const HomeUpcomingTripView: FC<Props> = ({ plan, today }) => {
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
      <LiquidCard tone='paper' radius='hero' padding={20} style={styles.empty}>
        <PretendardText weight='bold' style={styles.emptyTitle}>
          아직 계획한 여행이 없어요
        </PretendardText>
        <PretendardText style={styles.emptySubtitle}>
          이번 주말 1박으로 하나 만들어 둘까요?
        </PretendardText>
        <LiquidPillButton
          label='새 배낭 만들기'
          block
          onPress={handleCreate}
          style={styles.emptyCta}
        />
      </LiquidCard>
    );
  }

  const dDayLabel = getDDayLabel(primary, today);
  const action = getPrimaryAction(primary, stage);
  const locationName = primary.getLocationName();
  // `8.15 토 ~ 8.16 일` — 연도는 해가 바뀌는 여행에서만 붙는다(HomeDateFormat).
  const displayDate = formatTripPeriod(
    primary.getStartDateValue(),
    primary.getEndDateValue(),
    today
  );
  // 배낭에 저장된 스냅샷을 읽을 뿐 새로 조회하지 않는다(HM-1).
  const weatherSummary = summarizeWeatherPeriod(
    primary.getWeather()?.daily ?? []
  );
  // 챙긴 무게는 장비 문서를 따로 읽어야 나오는데(BagItem은 ID만 들고 있다) 그러면 홈의
  // `네트워크 호출 없음`이 깨진다 — 개수와 진행 바까지만 보여준다.
  const hasPackingRecord = primary.hasPackingRecord();
  const packedCount = primary.getPackedGearCount();
  const gearCount = primary.getGearCount();
  const packingPercent = primary.getPackingPercent();
  // 세 조각이 다 없으면 판 자체를 그리지 않는다 — 안 그러면 빈 유리 알약만 남는다(HM 원칙).
  const hasHeroPanel =
    hasPackingRecord || Boolean(weatherSummary) || displayDate !== null;

  return (
    <View>
      {/* 히어로 — 라임 면(radius 28, shadow accent). LiquidCard의 hero(26)보다 한 단계
          크게 잡는 자리라 프리미티브 대신 직접 그린다. */}
      <View style={styles.hero}>
        <TouchableOpacity
          style={styles.heroHead}
          onPress={() => handleOpenBag(primary)}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel={`${primary.getName()} 배낭 상세`}
        >
          <View style={styles.heroIdentity}>
            {dDayLabel !== null && (
              <View style={styles.dDayBadge}>
                {/* `여행 중`·`오늘 출발`이 오는 자리라 라벨을 보고 서체를 가른다 —
                    콘덴스드에는 한글 글리프가 없어 얹으면 글자가 깨진다. */}
                <PretendardText
                  weight='semibold'
                  style={[
                    styles.dDayText,
                    isCondensedLabel(dDayLabel)
                      ? styles.dDayTextCondensed
                      : styles.dDayTextKorean,
                  ]}
                >
                  {dDayLabel}
                </PretendardText>
              </View>
            )}
            <PretendardText
              weight='bold'
              style={styles.tripName}
              numberOfLines={2}
            >
              {primary.getName()}
            </PretendardText>
            {locationName !== null && (
              <View style={styles.locationRow}>
                <Ionicons
                  name='location'
                  size={14}
                  color={Liquid.limeOnQuiet}
                />
                <PretendardText
                  weight='medium'
                  style={styles.locationText}
                  numberOfLines={1}
                >
                  {locationName}
                </PretendardText>
              </View>
            )}
          </View>

          {/* 숫자와 단위는 한 덩어리다(DM-26) — 목업은 `44`(Archivo) 아래 `kg 총 무게` 한 줄을
              두었지만, 그러면 값이 `44`와 `kg`로 갈려 단위가 라벨의 일부처럼 읽히고 `총 무게`가
              배낭 상세·내 기록의 같은 말과 뜻이 겹친다(2026-08-11 사용자 결정 — 라벨 줄을 걷고
              `8.4kg`을 한 덩어리로 둔다). 단위만 한 급 낮춰 숫자가 먼저 읽히게 한다. */}
          <PretendardText style={styles.weightWrap} numberOfLines={1}>
            <PretendardText style={styles.weightValue}>
              {formatBagWeightValue(primary.getWeightGram())}
            </PretendardText>
            <PretendardText style={styles.weightUnit}>kg</PretendardText>
          </PretendardText>
        </TouchableOpacity>

        {/* 라임 면 위 유리 판 — 진행·날씨·기간을 한 덩어리로 묶는다.
            **폭을 다 쓰는 이유는 진행 바 하나뿐이다.** 패킹 기록이 없는 배낭에서는 판에
            날짜(+날씨) 한 줄만 남아, 카드 폭 알약의 우측 절반이 비어 보였다(2026-08-11
            디자인 리뷰) — 그때는 내용 폭으로 줄여 날짜 알약으로 읽히게 한다. */}
        {hasHeroPanel ? (
          <View
            style={[styles.heroPanel, !hasPackingRecord && styles.heroPanelHug]}
          >
            <BlurView
              tint='light'
              intensity={30}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, styles.heroPanelFill]} />

            <View style={styles.panelBody}>
              {hasPackingRecord ? (
                <>
                  <View style={styles.panelRow}>
                    {/* 배낭 상세 하단 바가 쓰는 `패킹 {n}/{m}`(PK-2)과 같은 말이다. */}
                    <PretendardText weight='semibold' style={styles.panelLabel}>
                      패킹 진행
                    </PretendardText>
                    <PretendardText style={styles.panelValue}>
                      {`${packedCount}/${gearCount}`}
                    </PretendardText>
                  </View>
                  <View style={styles.panelProgress}>
                    <LiquidProgressBar
                      percent={packingPercent}
                      tone='ink'
                      height={8}
                      trackColor={Liquid.trackOnAccent}
                    />
                  </View>
                </>
              ) : null}

              {weatherSummary || displayDate !== null ? (
                <View
                  style={[
                    styles.panelMeta,
                    hasPackingRecord && styles.panelMetaSpaced,
                  ]}
                >
                  {weatherSummary ? (
                    <View style={styles.weatherRow}>
                      <Ionicons
                        name='partly-sunny'
                        size={16}
                        color={Liquid.limeOnQuiet}
                      />
                      {/* 날씨는 `흐림` 같은 한글이 섞여 콘덴스드를 못 쓴다(한글 글리프 없음). */}
                      <PretendardText
                        weight='medium'
                        style={styles.weatherText}
                      >
                        {`${weatherSummary.cond} ${weatherSummary.low}°/${weatherSummary.high}°`}
                      </PretendardText>
                    </View>
                  ) : null}
                  {weatherSummary && displayDate !== null ? (
                    <View style={styles.metaDivider} />
                  ) : null}
                  {displayDate !== null ? (
                    <PretendardText
                      weight='medium'
                      style={styles.periodText}
                      numberOfLines={1}
                    >
                      {displayDate}
                    </PretendardText>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.heroCta}>
          <LiquidPillButton
            label={action.label}
            block
            onPress={handlePrimaryAction}
            trailing={
              <Ionicons name='arrow-forward' size={17} color={Liquid.lime} />
            }
          />
        </View>
      </View>

      {/*
        다음 여행 한 줄 카드 — 히어로 다음 순번들.

        섹션 라벨을 붙여 히어로와의 관계를 밝힌다(2026-08-11 디자인 리뷰). 라벨이 없을 때는
        같은 배낭 목록의 일부인데도 위 히어로와 다른 것으로 읽혔다. 말은 배낭 탭·배낭 상세와
        같은 `배낭`이다 — `여행`은 여행지·여행 중과 겹친다.
      */}
      {next.length > 0 ? (
        <View style={styles.nextSection}>
          <LiquidSectionLabel>다가오는 배낭</LiquidSectionLabel>

          {next.map((bag, index) => {
            const nextLabel = getDDayLabel(bag, today) ?? '';
            const nextMeta = buildNextMeta(bag);

            return (
              <TouchableOpacity
                key={bag.getID()}
                style={[styles.nextRow, index > 0 && styles.nextRowSpaced]}
                onPress={() => handleOpenBag(bag)}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
                accessibilityLabel={`${nextLabel} ${bag.getName()}${
                  nextMeta !== null ? `, ${nextMeta}` : ''
                }, 배낭 상세`}
              >
                {/* 고정폭 칸 — 자릿수가 달라도 이름의 좌측 축이 하나로 남는다. */}
                <View style={styles.nextDDayColumn}>
                  {/* 히어로 배지와 같은 기준으로 서체를 가른다 — 한글이 오면 콘덴스드를 벗긴다. */}
                  <PretendardText
                    weight='semibold'
                    style={[
                      styles.nextDDay,
                      isCondensedLabel(nextLabel)
                        ? styles.nextDDayCondensed
                        : styles.nextDDayKorean,
                    ]}
                    numberOfLines={1}
                  >
                    {nextLabel}
                  </PretendardText>
                </View>

                <View style={styles.nextBody}>
                  <PretendardText
                    weight='medium'
                    style={styles.nextName}
                    numberOfLines={1}
                  >
                    {bag.getName()}
                  </PretendardText>
                  {/* 무게·패킹은 목록 탭·히어로와 같은 값·같은 말이다 — 홈에서만 사라지면
                      같은 배낭이 화면마다 다른 것으로 읽힌다. */}
                  {nextMeta !== null ? (
                    <PretendardText style={styles.nextMeta} numberOfLines={1}>
                      {nextMeta}
                    </PretendardText>
                  ) : null}
                </View>

                <Ionicons
                  name='chevron-forward'
                  size={14}
                  color={Liquid.inkSubtle}
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
  // 목업 §1의 히어로는 28이라 카드 계열(`hero` 26)보다 한 단계 크다 — 값이 같은
  // `LiquidRadius.sheet`를 참조해 리터럴을 두지 않는다(로딩 골격도 같은 토큰을 읽는다).
  hero: {
    borderRadius: LiquidRadius.sheet,
    backgroundColor: Liquid.lime,
    boxShadow: LiquidShadow.accent,
    overflow: 'hidden',
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 22,
    paddingHorizontal: 22,
  },
  heroIdentity: {
    flex: 1,
    minWidth: 0,
  },
  // D-day는 라임 면 위 잉크 배지 — 라임 위 라임 글자가 안 되므로 면을 뒤집는다.
  dDayBadge: {
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Liquid.ink,
  },
  dDayText: {
    color: Liquid.lime,
  },
  // `D-6`처럼 숫자·라틴만인 라벨만 콘덴스드로 간다.
  dDayTextCondensed: {
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    letterSpacing: 1.12, // .08em
  },
  // 한글 라벨은 본문 서체로 떨어뜨린다. 콘덴스드보다 폭이 넓어 한 급 낮춰야 배지가 안 벌어진다.
  dDayTextKorean: {
    fontSize: 12.5,
  },
  tripName: {
    marginTop: 12,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: Liquid.ink,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 14,
    color: Liquid.limeOnQuiet,
  },
  // 부모 라인박스를 자식 최대 크기(44)로 잡는다 — 없으면 numberOfLines={1}에서 큰 자식의
  // 어센더가 깎인다(배낭 카드 `weightWrap`과 같은 처리).
  weightWrap: {
    flexShrink: 0,
    textAlign: 'right',
    fontSize: 44,
    lineHeight: 46,
  },
  weightValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1,
    color: Liquid.ink,
  },
  // 단위도 Archivo — 라틴 전용이라 `kg`에 안전하고, 숫자와 한 스팬에 있어야 한 값으로 읽힌다.
  weightUnit: {
    fontFamily: LiquidFont.condensed,
    fontSize: 18,
    color: Liquid.limeOnQuiet,
  },
  heroPanel: {
    marginTop: 20,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: LiquidRadius.tile,
    overflow: 'hidden',
  },
  // 진행 바가 없는 판은 내용 폭까지 줄인다(위 주석).
  heroPanelHug: {
    alignSelf: 'flex-start',
  },
  heroPanelFill: {
    backgroundColor: Liquid.glassFillSoft,
  },
  panelBody: {
    padding: 16,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelLabel: {
    fontSize: 13,
    color: Liquid.limeOnQuiet,
  },
  panelValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 15,
    color: Liquid.ink,
  },
  panelProgress: {
    marginTop: 10,
  },
  panelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  panelMetaSpaced: {
    marginTop: 14,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherText: {
    fontSize: 13,
    color: Liquid.limeOnQuiet,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: Liquid.hairlineOnAccent,
  },
  /**
   * 기간은 `8.15 토`처럼 한글 요일이 섞여 **콘덴스드를 쓸 수 없다**(Archivo Narrow에
   * 한글 글리프가 없다). 자간도 본문 서체 기본값으로 둔다.
   */
  periodText: {
    flexShrink: 1,
    fontSize: 13,
    color: Liquid.limeOnQuiet,
  },
  heroCta: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  nextSection: {
    marginTop: LiquidLayout.section,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: LiquidLayout.touchMin,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  nextRowSpaced: {
    marginTop: LiquidLayout.listGap,
  },
  // 중립 배지 — 배낭 목록의 `D-21` 배지와 같은 면이다(목업 §5).
  nextDDayColumn: {
    minWidth: D_DAY_COLUMN_WIDTH,
    minHeight: 26,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LiquidRadius.chipSm,
    backgroundColor: Liquid.badgeFill,
  },
  nextDDay: {
    color: Liquid.inkSecondary,
  },
  nextDDayCondensed: {
    fontFamily: LiquidFont.condensed,
    fontSize: 15,
  },
  nextDDayKorean: {
    fontSize: 12.5,
  },
  nextBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nextName: {
    fontSize: 14,
    color: Liquid.ink,
  },
  nextMeta: {
    fontSize: 12.5,
    color: Liquid.inkTertiary,
  },
  empty: {
    alignItems: 'flex-start',
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
  },
  emptyCta: {
    marginTop: 18,
  },
});

export default observer(HomeUpcomingTripView);
