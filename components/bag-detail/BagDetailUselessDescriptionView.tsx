import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import { formatBagWeight } from '@/model/gear/WeightFormat';
import TripPhase from '@/model/bag/TripPhase';
import PretendardText from '@/components/PretendardText';
import BagDetailTileView from './BagDetailTileView';
import { Liquid, LiquidFont } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
  emphasized?: boolean;
  columns?: 2 | 3;
}

/**
 * 사용 기록 타일 아이콘. 하강 화살표(`trending-down`)는 **감소·손실**로 읽혀 무엇을 하는
 * 타일인지 가려졌다(2026-08-11 디자인 리뷰) — 이 타일이 여는 일은 쓴 장비를 하나씩
 * 체크하는 것이라 체크 계열로 바꿨다. 줄어든 무게를 말하는 히어로 델타 배지(BD-3)는
 * 실제로 감소량이라 하강 화살표를 그대로 쓴다.
 */
const TILE_ICON = 'checkmark-done-outline';

const BagDetailUselessDescriptionView: FC<Props> = ({
  bagDetail,
  emphasized = false,
  columns = 2,
}) => {
  const isUselessChecked = bagDetail.isUselessChecked();
  const usedWeight = formatBagWeight(bagDetail.getUsedWeightGram());
  const phase = bagDetail.getTripPhase();

  const handlePressUseless = () => {
    app.getAnalyticsManager()?.logClick('bag_useless');
    bagDetail.goToUseless();
  };

  const subtitle =
    phase === TripPhase.After ? '줄어든 무게 확인' : '여행 후 기록';

  if (!isUselessChecked) {
    return (
      <BagDetailTileView
        icon={TILE_ICON}
        emphasized={emphasized}
        columns={columns}
        title='사용 기록'
        subtitle={subtitle}
        onPress={handlePressUseless}
        accessibilityLabel={`사용 기록, ${subtitle}`}
      />
    );
  }

  // 기록이 있으면 줄어드는 무게를 히어로 숫자로 강조한다.
  return (
    <BagDetailTileView
      icon={TILE_ICON}
      emphasized={emphasized}
      columns={columns}
      title='사용 기록'
      onPress={handlePressUseless}
      accessibilityLabel={`사용 기록, ${usedWeight}로 줄어요`}
    >
      <View style={styles.weightRow}>
        {/* 숫자 + kg라 콘덴스드를 쓴다. `로 줄어요`는 한글이라 본문 서체로 떨어뜨린다. */}
        <PretendardText
          style={[styles.weightValue, emphasized && styles.weightValueOnInk]}
        >
          {usedWeight}
        </PretendardText>
        <PretendardText
          style={[styles.weightSuffix, emphasized && styles.weightSuffixOnInk]}
        >
          로 줄어요
        </PretendardText>
      </View>
    </BagDetailTileView>
  );
};

const styles = StyleSheet.create({
  // baseline 정렬로 두 서체(콘덴스드 18 + 본문 12)의 밑선을 맞춘다.
  weightRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  weightValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 20,
    lineHeight: 24,
    color: Liquid.ink,
  },
  weightValueOnInk: {
    color: Liquid.surface,
  },
  weightSuffix: {
    fontSize: 12,
    color: Liquid.inkMuted,
  },
  weightSuffixOnInk: {
    color: Liquid.inkOnQuiet,
  },
});

export default observer(BagDetailUselessDescriptionView);
