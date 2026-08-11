import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidProgressBar from '@/components/liquid/LiquidProgressBar';
import {
  Liquid,
  LiquidFont,
  LiquidRadius,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';
import { formatBagWeightValue } from '@/model/gear/WeightFormat';
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
}

/**
 * HM-1 다가오는 일정 (Liquid Depth).
 *
 * 이 카드의 핵심은 **주 액션이 남은 일수에 따라 갈린다**는 것이고, 그 분기는
 * 알림(NT-2/NT-3)이 유도하는 행동과 같은 목적지여야 한다. 분기 계산은 `HomeTripPlan`이 맡는다.
 *
 * 히어로는 이 화면의 **유일한 라임 면**이다 — 아래 창고·기록 섹션은 종이 면으로만 간다.
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

  const dDayLabel = getDDayLabel(primary);
  const action = getPrimaryAction(primary, stage);
  const locationName = primary.getLocationName();
  const displayDate = primary.getDisplayDate();
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

        {/* 라임 면 위 유리 판 — 진행·날씨·기간을 한 덩어리로 묶는다. */}
        <View style={styles.heroPanel}>
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
                    <PretendardText weight='medium' style={styles.weatherText}>
                      {`${weatherSummary.cond} ${weatherSummary.low}°/${weatherSummary.high}°`}
                    </PretendardText>
                  </View>
                ) : null}
                {weatherSummary && displayDate !== null ? (
                  <View style={styles.metaDivider} />
                ) : null}
                {displayDate !== null ? (
                  <PretendardText style={styles.periodText} numberOfLines={1}>
                    {displayDate}
                  </PretendardText>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

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

      {/* 다음 여행 한 줄 카드 — 히어로 다음 순번들. */}
      {next.map(bag => {
        const nextLabel = getDDayLabel(bag) ?? '';

        return (
          <TouchableOpacity
            key={bag.getID()}
            style={styles.nextRow}
            onPress={() => handleOpenBag(bag)}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel={`${bag.getName()} 배낭 상세`}
          >
            {/* 히어로 배지와 같은 기준으로 서체를 가른다 — 한글이 오면 콘덴스드를 벗긴다. */}
            <PretendardText
              style={[
                styles.nextDDay,
                isCondensedLabel(nextLabel)
                  ? styles.nextDDayCondensed
                  : styles.nextDDayKorean,
              ]}
            >
              {nextLabel}
            </PretendardText>
            <PretendardText
              weight='medium'
              style={styles.nextName}
              numberOfLines={1}
            >
              {bag.getName()}
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={14}
              color={Liquid.inkSubtle}
            />
          </TouchableOpacity>
        );
      })}
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
  periodText: {
    flexShrink: 1,
    fontFamily: LiquidFont.condensed,
    fontSize: 13,
    letterSpacing: 0.78, // .06em
    color: Liquid.limeOnQuiet,
  },
  heroCta: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  nextDDay: {
    color: Liquid.inkTertiary,
  },
  nextDDayCondensed: {
    fontFamily: LiquidFont.condensed,
    fontSize: 15,
  },
  nextDDayKorean: {
    fontSize: 13.5,
  },
  nextName: {
    flex: 1,
    fontSize: 14,
    color: Liquid.ink,
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
