import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagDetail from '@/model/bag-detail/BagDetail';
import GearFilter from '@/model/gear/GearFilter';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgFontSize, AcgLayout } from '@/constants/DesignTokens';

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

// 카테고리별 데이터 시각화 색(의미색 예외 — DesignTokens 컨벤션상 허용).
const PALETTE = [
  '#4A90E2',
  '#50C878',
  '#FFD700',
  '#FF6B6B',
  '#9B59B6',
  '#FF8C00',
  '#20B2AA',
  '#FF69B4',
];

const label = (category: string) =>
  category === BASE_KEY ? '베이스' : (CATEGORY_LABEL[category] ?? category);

const BagDetailSummaryView: FC<Props> = ({ bagDetail }) => {
  const total = bagDetail.getWeight();

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

  return (
    <View style={styles.wrap}>
      {/*
        이 화면의 주 수치다. 손그림 라임 동그라미로 두르던 것을 걷었다(2026-08-11) —
        라임은 화면당 하나(하단 주 액션)이고, 큰 숫자는 장식 없이도 이미 앵커다.
        라벨을 값 위에 두는 건 홈·레퍼런스의 지표 문법과 같다.
      */}
      <View style={styles.weightBlock}>
        <PretendardText style={styles.label}>총 무게</PretendardText>
        <AcgDisplayText style={styles.value}>{`${total}kg`}</AcgDisplayText>
      </View>

      {breakdown.length > 0 && (
        <>
          <View style={styles.bar}>
            {breakdown.map((item, index) => (
              <View
                key={item.category}
                style={{
                  flex: item.percentage,
                  backgroundColor: PALETTE[index % PALETTE.length],
                }}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {breakdown.map((item, index) => (
              <View key={item.category} style={styles.legendItem}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: PALETTE[index % PALETTE.length] },
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: AcgLayout.screenPadding,
    marginTop: 12,
    gap: 12,
  },
  weightBlock: {
    gap: 2,
  },
  label: {
    fontSize: AcgFontSize.meta,
    lineHeight: 17,
    color: Acg.textMuted,
  },
  value: {
    fontSize: 30,
    lineHeight: 34,
    color: Acg.ink,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 6,
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
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
});

export default observer(BagDetailSummaryView);
