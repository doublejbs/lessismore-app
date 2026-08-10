import { FC } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LiquidAddCta from '@/components/liquid/LiquidAddCta';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import { Liquid, LiquidMotion, LiquidType } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';

// 순위 배지 지름.
const RANK_BADGE_SIZE = 28;

/**
 * 상위 3위까지는 잉크 면 배지, 4위 이하는 가라앉은 면.
 *
 * 1위에 라임을 주지 않는다 — 이 화면에서 라임은 담기 CTA의 "아직 내 것이 아님"을 뜻하므로,
 * 같은 색을 순위 강조에도 쓰면 두 의미가 겹친다.
 */
const TOP_THREE = 3;

interface Props {
  gear: Gear;
  /** 1부터 시작하는 순위 */
  rank: number;
  /** 담기·빼기 요청 중 */
  loading: boolean;
  /** 두 번째 행부터 위에 헤어라인 */
  divider: boolean;
  onPress: (gear: Gear) => void;
  onAdd: (e: GestureResponderEvent, gear: Gear) => void;
  onRemove: (e: GestureResponderEvent, gear: Gear) => void;
}

/**
 * SR-4 인기 순위 한 행. 창고 목록과 같은 `LiquidMetricRow`에 순위 배지를 `leading`으로 끼운다 —
 * 같은 목록 문법을 두 벌 만들면 여백·타이포가 갈린다.
 */
const SearchRankRowView: FC<Props> = ({
  gear,
  rank,
  loading,
  divider,
  onPress,
  onAdd,
  onRemove,
}) => {
  const isAdded = gear.isAdded();
  const weight = gear.getWeight();
  const company = gear.getDisplayCompany();

  const badge = (
    <View style={[styles.rankBadge, rank <= TOP_THREE && styles.rankBadgeTop]}>
      <PretendardText
        style={[styles.rankNumber, rank <= TOP_THREE && styles.rankNumberTop]}
      >
        {rank}
      </PretendardText>
    </View>
  );

  const cta = (
    <LiquidAddCta
      added={isAdded}
      loading={loading}
      onPress={e => (isAdded ? onRemove(e, gear) : onAdd(e, gear))}
      // 체크 아이콘만으로는 "누르면 제거"가 드러나지 않는다(SR-4).
      accessibilityLabel={
        isAdded
          ? `${gear.getDisplayName()} 창고에서 빼기`
          : `${gear.getDisplayName()} 창고에 담기`
      }
    />
  );

  return (
    <Pressable
      // 누름은 색을 바꾸지 않고 투명도만 낮춘다(핸드오프 인터랙션 규칙).
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(gear)}
      accessibilityRole='button'
      accessibilityLabel={`${rank}위 ${gear.getDisplayName()} 상세`}
    >
      <LiquidMetricRow
        leading={badge}
        name={gear.getDisplayName()}
        divider={divider}
        trailing={cta}
        {...(company ? { brand: company } : {})}
        {...(weight ? { value: weight } : {})}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  rowPressed: {
    opacity: LiquidMotion.pressOpacity,
  },
  // 4위 이하 — 가라앉은 타일 위 보조 잉크.
  rankBadge: {
    width: RANK_BADGE_SIZE,
    height: RANK_BADGE_SIZE,
    borderRadius: RANK_BADGE_SIZE / 2,
    backgroundColor: Liquid.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: {
    backgroundColor: Liquid.ink,
  },
  rankNumber: {
    ...LiquidType.numSm,
    color: Liquid.inkSecondary,
  },
  rankNumberTop: {
    color: Liquid.surface,
  },
});

export default observer(SearchRankRowView);
