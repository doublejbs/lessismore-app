import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';
import { formatBagWeight } from '@/model/gear/WeightFormat';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidProgressBar from '@/components/liquid/LiquidProgressBar';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidRadius,
} from '@/constants/DesignTokens';

interface Props {
  bagPacking: BagPacking;
}

// 진행 바 두께. 히어로 자리라 목록 카드의 6보다 굵다(핸드오프 ProgressBar h8).
const BAR_HEIGHT = 8;

// 챙긴 개수 글자 크기(목업 §7). 부모 라인박스가 같은 값을 써야 어센더가 깎이지 않는다.
const COUNT_FONT_SIZE = 52;

/**
 * PK-3 진행 유리 카드 (Liquid Depth, 목업 §7).
 *
 * 이 화면의 시각 앵커라 지면 위에 뜬 **유리 면**에 담는다 — 챙긴 개수(콘덴스드 52) ·
 * 라임 퍼센트 알약 · 진행 바 · 누적 무게가 한 카드에서 같은 값을 세 방식으로 말한다.
 * 값은 홈 히어로·배낭 목록 카드와 같은 `packedGears ∩ gears` 규칙에서 나온다
 * ([Bag.md](../../specs/Bag.md) BAG-1 — 세 곳이 어긋나면 안 된다).
 */
const BagPackingHeaderView: FC<Props> = ({ bagPacking }) => {
  const packedCount = bagPacking.getPackedCount();
  const totalCount = bagPacking.getTotalCount();
  const percent = bagPacking.getProgressPercent();
  const hasProgress = percent > 0;
  // 헤더는 kg 합계, 아래 행은 장비 개별 g — 축이 달라서 단위가 다른 게 맞다(DM-26).
  const packedWeight = formatBagWeight(bagPacking.getPackedWeightGram());
  const totalWeight = formatBagWeight(bagPacking.getTotalWeightGram());

  return (
    <View style={styles.wrap}>
      <LiquidCard tone='glass' radius='hero' padding={LiquidLayout.cardPadLg}>
        {/* 개수와 퍼센트는 같은 사실의 두 표현이라 한 덩어리로 읽는다. */}
        <View
          style={styles.countRow}
          accessible
          accessibilityLabel={`패킹 ${packedCount}/${totalCount}, ${percent}%`}
        >
          {/* 부모 라인박스를 자식 최대 크기로 잡는다 — 없으면 큰 숫자의 어센더가 깎인다. */}
          <PretendardText style={styles.countWrap} numberOfLines={1}>
            <PretendardText style={styles.countValue}>
              {packedCount}
            </PretendardText>
            <PretendardText style={styles.countTotal}>
              {` / ${totalCount}`}
            </PretendardText>
          </PretendardText>
          {/* 이 화면의 유일한 라임 면 — 진행률 하나만 액센트를 받는다.
              단 **값이 0이면 라임을 걷는다**(2026-08-11 개정): 아무것도 챙기지 않은 상태가
              화면에서 가장 강조되면 액센트가 "여기를 보라"는 뜻을 잃는다. */}
          <View
            style={[
              styles.percentBadge,
              hasProgress
                ? styles.percentBadgeAccent
                : styles.percentBadgeQuiet,
            ]}
          >
            <PretendardText
              style={[
                styles.percentText,
                !hasProgress && styles.percentTextQuiet,
              ]}
            >
              {`${percent}%`}
            </PretendardText>
          </View>
        </View>

        {/* 유리 면 위라 채움은 잉크다(라임은 위 알약이 이미 갖고 있다). */}
        <View style={styles.bar}>
          <LiquidProgressBar percent={percent} tone='ink' height={BAR_HEIGHT} />
        </View>

        {/* 이 앱의 차별점 — 개수가 아니라 **무게가 차오르는** 감각을 같은 카드에 둔다.
            개수 줄과 같은 조판을 쓴다(챙긴 값은 진하게, 전체는 한 단계 낮춤) — 같은 줄에
            kg가 두 번 오므로 두 값의 무게가 같으면 아래 행의 g와 섞여 읽힌다. */}
        <PretendardText
          style={styles.weightWrap}
          numberOfLines={1}
          accessibilityLabel={`챙긴 무게 ${packedWeight}, 총 무게 ${totalWeight}`}
        >
          <PretendardText style={styles.weightPacked}>
            {packedWeight}
          </PretendardText>
          <PretendardText style={styles.weightTotal}>
            {` / ${totalWeight}`}
          </PretendardText>
        </PretendardText>
      </LiquidCard>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: LiquidLayout.screenH,
    marginTop: 8,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  countWrap: {
    flexShrink: 1,
    fontSize: COUNT_FONT_SIZE,
    lineHeight: COUNT_FONT_SIZE,
  },
  countValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: COUNT_FONT_SIZE,
    lineHeight: COUNT_FONT_SIZE,
    letterSpacing: -1.5,
    color: Liquid.ink,
  },
  // 전체 개수는 한 단계 낮춘다 — 시선이 먼저 닿아야 하는 값은 챙긴 개수다.
  countTotal: {
    fontFamily: LiquidFont.condensed,
    fontSize: 24,
    color: Liquid.inkSubtle,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 알약이 깨지지 않는다.
  percentBadge: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: LiquidRadius.pill,
  },
  percentBadgeAccent: {
    backgroundColor: Liquid.lime,
  },
  // 진행 0의 자리 — 중립 배지 면(카드 위에서 구분은 되지만 시선을 끌지 않는 최소 대비).
  percentBadgeQuiet: {
    backgroundColor: Liquid.badgeFill,
  },
  percentText: {
    fontFamily: LiquidFont.condensed,
    fontSize: 16,
    color: Liquid.limeOn,
  },
  percentTextQuiet: {
    color: Liquid.inkSecondary,
  },
  bar: {
    marginTop: 16,
  },
  // 부모 라인박스를 자식 크기와 같게 잡는다 — 두 조각이 같은 줄에서 밑선을 공유한다.
  weightWrap: {
    marginTop: 12,
    fontSize: 14,
  },
  weightPacked: {
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
  weightTotal: {
    fontFamily: LiquidFont.condensed,
    fontSize: 14,
    color: Liquid.inkSubtle,
  },
});

export default observer(BagPackingHeaderView);
