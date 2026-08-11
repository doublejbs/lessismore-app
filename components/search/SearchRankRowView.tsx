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
import { formatGearWeightOrNull } from '@/model/gear/WeightFormat';

// 순위 표식 칸 폭. 배지가 있는 행과 없는 행의 이름 시작점을 같게 묶는다.
const RANK_SLOT_SIZE = 28;

/**
 * 상위 3위만 잉크 면 배지를 두르고, 4위 이하는 **면 없이 잉크 숫자**만 남긴다
 * (2026-08-11 디자인 리뷰).
 *
 * 회색 원 안 회색 숫자는 배지도 순위도 아닌 것으로 읽혔다 — 목록이 이미 순서대로 놓여 있어
 * 4위 이하에는 표식이 필요하지 않고, 원을 걷고 숫자를 잉크로 올리는 편이 오히려 잘 읽힌다.
 * 1위에 라임을 주지 않는 것은 그대로다 — 이 화면의 라임은 담기 CTA의 "담긴 것" 하나다.
 */
const TOP_THREE = 3;

/** 이름이 곧 콘텐츠라 두 줄까지 허용한다 — 1위 제품명이 말줄임되던 자리다(SR-4). */
const NAME_LINES = 2;

interface Props {
  gear: Gear;
  /** 1부터 시작하는 순위 */
  rank: number;
  /** 담기·빼기 요청 중 */
  loading: boolean;
  /** 두 번째 행부터 위에 헤어라인 */
  divider: boolean;
  /**
   * 이 장비를 담은 사람 수(`gear-rank.count`). 순위 근거라 0이면 노출하지 않는다 —
   * 수가 없는 순위는 임의 목록으로 읽히고, 0을 그대로 적으면 틀린 사실이 된다.
   */
  count: number;
  /**
   * 카테고리 라벨. **`전체` 탭에서만** 넘긴다 — 서로 다른 카테고리의 무게가 세로로 나란히
   * 놓이면 비교할 수 없으니(68g 팩과 490g 체어) 무엇의 무게인지 밝힌다. 카테고리 탭에서는
   * 탭이 이미 말하고 있어 넘기지 않는다.
   */
  categoryLabel?: string | undefined;
  onPress: (gear: Gear) => void;
  onAdd: (e: GestureResponderEvent, gear: Gear) => void;
  onRemove: (e: GestureResponderEvent, gear: Gear) => void;
}

/**
 * SR-4 인기 순위 한 행. 창고 목록과 같은 `LiquidMetricRow`에 순위 표식을 `leading`으로 끼운다 —
 * 같은 목록 문법을 두 벌 만들면 여백·타이포가 갈린다.
 */
const SearchRankRowView: FC<Props> = ({
  gear,
  rank,
  loading,
  divider,
  count,
  categoryLabel,
  onPress,
  onAdd,
  onRemove,
}) => {
  const isAdded = gear.isAdded();
  const weight = formatGearWeightOrNull(gear.getWeight());
  const company = gear.getDisplayCompany();
  const isTop = rank <= TOP_THREE;
  // 카테고리(전체 탭에서만) · 담은 수를 한 줄로 잇는다 — 없는 조각은 빼서 ` · `가 홀로 남지 않게 한다.
  const meta = [categoryLabel, count > 0 ? `${count}명이 담음` : null]
    .filter(Boolean)
    .join(' · ');

  const badge = (
    <View style={[styles.rankSlot, isTop && styles.rankBadgeTop]}>
      <PretendardText
        style={[styles.rankNumber, isTop && styles.rankNumberTop]}
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
      // 메타 줄(카테고리·담은 수)은 순위 근거라 스크린리더도 함께 들어야 한다.
      accessibilityLabel={`${rank}위 ${gear.getDisplayName()}${
        meta ? `, ${meta}` : ''
      } 상세`}
    >
      <LiquidMetricRow
        leading={badge}
        name={gear.getDisplayName()}
        nameLines={NAME_LINES}
        divider={divider}
        trailing={cta}
        value={weight}
        {...(company ? { brand: company } : {})}
        {...(meta ? { meta } : {})}
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
  // 4위 이하 — 면 없이 숫자만. 칸 폭은 배지와 같아 이름 시작점이 흔들리지 않는다.
  rankSlot: {
    width: RANK_SLOT_SIZE,
    height: RANK_SLOT_SIZE,
    borderRadius: RANK_SLOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: {
    backgroundColor: Liquid.ink,
  },
  rankNumber: {
    ...LiquidType.numSm,
    color: Liquid.ink,
  },
  rankNumberTop: {
    color: Liquid.surface,
  },
});

export default observer(SearchRankRowView);
