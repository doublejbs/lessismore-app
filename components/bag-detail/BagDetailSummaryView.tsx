import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import GearFilter from '@/model/gear/GearFilter';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidRadius,
  LiquidSemantic,
} from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BASE_KEY = '베이스(배낭, 텐트, 침낭, 매트)';
const BASE_CATEGORIES: string[] = [
  GearFilter.Backpack,
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Mat,
];

const CATEGORY_LABEL: Record<string, string> = {
  [GearFilter.Backpack]: '배낭',
  [GearFilter.Tent]: '텐트',
  [GearFilter.SleepingBag]: '침낭',
  [GearFilter.Mat]: '매트',
  [GearFilter.Lantern]: '랜턴',
  [GearFilter.Cooking]: '조리',
  [GearFilter.Clothing]: '의류',
  [GearFilter.Furniture]: '가구',
  [GearFilter.Electronic]: '전자기기',
  [GearFilter.Food]: '음식',
  [GearFilter.Etc]: '기타',
};

/**
 * 스택 바·범례 색(BD-3) — 무게 비중 내림차순으로 순환한다.
 *
 * 앞 5칸은 배낭 카테고리 의미색(변경 금지 대상)이고, 카테고리가 더 많은 배낭을 위해
 * 뒤에 중립 잉크 3단을 잇는다. 목업 §6은 이 자리를 `ink/limeInk/lime/…` 무채색 램프로
 * 그렸는데, **라임을 데이터 색으로 쓰면 라임 면이 화면에 둘(델타 배지 + 세그먼트)이 되고**
 * 카테고리 의미색 규칙과도 어긋나 의미색 쪽을 택했다.
 */
const CATEGORY_PALETTE = [
  LiquidSemantic.catBase,
  LiquidSemantic.catClothing,
  LiquidSemantic.catCooking,
  LiquidSemantic.catSafety,
  LiquidSemantic.catEtc,
  Liquid.inkTertiary,
  Liquid.inkSubtle,
  Liquid.inkFaint,
];

const label = (category: string) =>
  category === BASE_KEY ? '베이스' : (CATEGORY_LABEL[category] ?? category);

/**
 * BD-1/BD-3 무게 히어로 카드 (Liquid Depth).
 *
 * 이 화면의 주 수치라 흰 히어로 카드 하나에 총 무게 → 카테고리 스택 바 → 범례를 쌓는다.
 * 우측 라임 델타 배지는 **이 화면의 유일한 라임 면**이다(핸드오프: 화면당 라임 면 1개).
 */
const BagDetailSummaryView: FC<Props> = ({ bagDetail }) => {
  const total = bagDetail.getWeight();
  // 사용 기록(BD-5)이 있으면 실제 쓴 무게와의 차이가 "줄일 수 있는 무게"다 — 앱의 정체성인
  // 값이라 히어로에 배지로 세운다. 기록이 없거나 차이가 없으면 배지를 달지 않는다.
  const reducible = bagDetail.isUselessChecked()
    ? Math.round((total - bagDetail.getUsedWeight()) * 100) / 100
    : 0;

  const map = new Map<string, number>();
  let totalG = 0;

  bagDetail.getGears().forEach(gear => {
    // 세분 카테고리는 그룹(GearFilter)으로 매핑해 집계한다(DM-4). 빈/미지 키는 etc 폴백.
    const cat: string = gear.getGroupCategory();
    const key = BASE_CATEGORIES.includes(cat) ? BASE_KEY : cat;
    const w = Number(gear.getWeight());

    map.set(key, (map.get(key) ?? 0) + w);
    totalG += w;
  });

  const breakdown = Array.from(map.entries())
    .map(([category, weight]) => ({
      category,
      percentage: totalG > 0 ? (weight / totalG) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // 무게 행은 숫자·단위·배지가 한 뜻이라 통째로 하나의 접근성 요소다 —
  // 부모가 `accessible`이면 자식 라벨은 개별로 읽히지 않으므로 델타까지 한 문장에 합친다.
  const weightLabel =
    reducible > 0
      ? `총 무게 ${total}kg, 사용 기록 기준 ${reducible}kg 줄일 수 있어요`
      : `총 무게 ${total}kg`;

  return (
    <View style={styles.wrap}>
      <LiquidCard tone='paper' radius='hero' padding={LiquidLayout.cardPadLg}>
        <View
          style={styles.weightRow}
          accessible
          accessibilityLabel={weightLabel}
        >
          {/* 숫자·단위 모두 라틴이라 콘덴스드가 안전하다. 라인박스를 글자 크기와 같게 잡아
              큰 숫자가 잘리지 않게 한다(목업은 54/50이지만 RN에서는 어센더가 깎인다). */}
          <PretendardText style={styles.weightValue}>{total}</PretendardText>
          <PretendardText weight='semibold' style={styles.weightUnit}>
            kg
          </PretendardText>
          <View style={styles.weightSpacer} />
          {reducible > 0 ? (
            <View style={styles.deltaBadge}>
              <Ionicons name='trending-down' size={13} color={Liquid.limeOn} />
              <PretendardText weight='semibold' style={styles.deltaText}>
                {`-${reducible}kg`}
              </PretendardText>
            </View>
          ) : null}
        </View>

        {breakdown.length > 0 && (
          <>
            <View style={styles.bar}>
              {breakdown.map((item, index) => (
                <View
                  key={item.category}
                  style={[
                    styles.barSegment,
                    {
                      flex: item.percentage,
                      backgroundColor:
                        CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.legend}>
              {breakdown.map((item, index) => (
                <View key={item.category} style={styles.legendItem}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
                      },
                    ]}
                  />
                  <PretendardText style={styles.legendText}>
                    {label(item.category)} {Math.round(item.percentage)}%
                  </PretendardText>
                </View>
              ))}
            </View>
          </>
        )}
      </LiquidCard>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: LiquidLayout.screenH,
    marginTop: 18,
  },
  // 큰 숫자와 단위·배지의 밑선을 맞춘다 — baseline이 아니라 flex-end로 두어야
  // 배지(면)까지 같은 선에 앉는다.
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  weightValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -1.5,
    color: Liquid.ink,
  },
  weightUnit: {
    marginBottom: 4,
    fontSize: 18,
    color: Liquid.inkMuted,
  },
  weightSpacer: {
    flex: 1,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 알약이 깨지지 않는다.
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 26,
    marginBottom: 4,
    paddingHorizontal: 10,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.lime,
  },
  deltaText: {
    fontSize: 12,
    color: Liquid.limeOn,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    marginTop: 16,
    gap: 3,
  },
  // 세그먼트마다 모서리를 깎는다 — 바 전체를 clip하면 사이 간격이 이가 빠진 것처럼 보인다.
  barSegment: {
    borderRadius: 5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    columnGap: 14,
    rowGap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12.5,
    color: Liquid.inkSecondary,
  },
});

export default observer(BagDetailSummaryView);
