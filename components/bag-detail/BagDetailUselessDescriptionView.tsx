import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
    phase === 'after' ? '줄어든 무게 확인' : '여행 후 기록';

  const fg = emphasized ? Color.background : Color.textPrimary;
  const subFg = emphasized ? EMPHASIZED_SUB : Color.textSecondary;

  const weightBlock = isUselessChecked ? (
    // 기록이 있으면 줄어드는 무게를 히어로 숫자로 강조한다.
    <View style={styles.weightRow}>
      <PretendardText style={[styles.weightValue, { color: fg }]} weight='bold'>
        {usedWeight}kg
      </PretendardText>
      <PretendardText style={[styles.weightSuffix, { color: subFg }]}>
        로 줄어요
      </PretendardText>
    </View>
  ) : (
    <PretendardText style={[styles.subtitle, { color: subFg }]} numberOfLines={1}>
      {subtitle}
    </PretendardText>
  );

  // 강조 타일은 전체 폭 가로 카드 — 아이콘·라벨 좌측, 무게 우측.
  if (emphasized) {
    return (
      <TouchableOpacity
        style={[styles.tile, styles.tileEmphasized, styles.tileFull]}
        onPress={handlePressUseless}
        activeOpacity={0.7}
      >
        <View style={styles.emphRow}>
          <Ionicons name='trending-down-outline' size={24} color={fg} />
          <PretendardText style={[styles.title, styles.emphLabel, { color: fg }]} weight='medium'>
            사용 기록
          </PretendardText>
          {weightBlock}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.tile} onPress={handlePressUseless} activeOpacity={0.7}>
      <Ionicons name='trending-down-outline' size={22} color={fg} />
      <View style={styles.textWrap}>
        <PretendardText style={[styles.title, { color: fg }]} weight='medium'>
          사용 기록
        </PretendardText>
        {weightBlock}
      </View>
    </TouchableOpacity>
  );
};

const EMPHASIZED_SUB = '#B9B9B9';

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: 92,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileEmphasized: {
    backgroundColor: Color.chipActiveBg,
  },
  // 강조 타일은 전체 폭 가로 카드 — 세로 공간은 줄이고 좌우로 편다.
  tileFull: {
    width: '100%',
    minHeight: 68,
    justifyContent: 'center',
  },
  emphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emphLabel: {
    flex: 1,
  },
  textWrap: {
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 12,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  weightValue: {
    fontSize: 18,
    lineHeight: 22,
  },
  weightSuffix: {
    fontSize: 12,
  },
});

export default observer(BagDetailUselessDescriptionView);
