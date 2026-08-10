import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import TripPhase from '@/model/bag/TripPhase';
import PretendardText from '@/components/PretendardText';
import BagDetailTileView from './BagDetailTileView';
import { Liquid, LiquidFont } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
  emphasized?: boolean;
}

const BagDetailUselessDescriptionView: FC<Props> = ({
  bagDetail,
  emphasized = false,
}) => {
  const isUselessChecked = bagDetail.isUselessChecked();
  const usedWeight = bagDetail.getUsedWeight();
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
        icon='trending-down-outline'
        emphasized={emphasized}
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
      icon='trending-down-outline'
      emphasized={emphasized}
      title='사용 기록'
      onPress={handlePressUseless}
      accessibilityLabel={`사용 기록, ${usedWeight}kg로 줄어요`}
    >
      <View style={styles.weightRow}>
        {/* 숫자 + kg라 콘덴스드를 쓴다. `로 줄어요`는 한글이라 본문 서체로 떨어뜨린다. */}
        <PretendardText
          style={[styles.weightValue, emphasized && styles.weightValueOnInk]}
        >
          {`${usedWeight}kg`}
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
