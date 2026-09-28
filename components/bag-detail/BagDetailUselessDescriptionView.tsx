import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
import tileStyles from './BagDetailActionTileStyles';

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

  const subtitle = phase === 'after'
    ? app.getL10n().t('bagDetail.useless.afterSubtitle')
    : app.getL10n().t('bagDetail.useless.beforeSubtitle');

  const fg = emphasized ? Color.background : Color.textPrimary;
  const subFg = emphasized ? EMPHASIZED_SUB : Color.textSecondary;

  const weightBlock = isUselessChecked ? (
    // 기록이 있으면 줄어드는 무게를 히어로 숫자로 강조한다.
    <View style={styles.weightRow}>
      <PretendardText style={[styles.weightValue, { color: fg }]} weight='bold'>
        {usedWeight}kg
      </PretendardText>
      <PretendardText style={[styles.weightSuffix, { color: subFg }]}>
        {app.getL10n().t('bagDetail.useless.weightSuffix')}
      </PretendardText>
    </View>
  ) : (
    <PretendardText
      style={[tileStyles.subtitle, { color: subFg }]}
      numberOfLines={1}
    >
      {subtitle}
    </PretendardText>
  );

  /**
   * 강조는 **검정 전체 폭 가로 카드**다(BD-10) — 아이콘·라벨이 좌측, 값이 우측이고 높이가
   * 줄어든다. 글자 크기·색은 회색 타일과 같다: 바뀌는 것은 폭과 배치뿐이다.
   */
  const icon = <Ionicons name='trending-down-outline' size={22} color={fg} />;
  const titleNode = (
    <PretendardText style={[tileStyles.title, { color: fg }]} weight='medium'>
      {app.getL10n().t('bagDetail.useless.title')}
    </PretendardText>
  );

  return (
    <TouchableOpacity
      style={[tileStyles.tile, emphasized && tileStyles.tileEmphasized]}
      onPress={handlePressUseless}
      activeOpacity={0.7}
    >
      {emphasized ? (
        <>
          <View style={tileStyles.emphasizedLead}>
            {icon}
            {titleNode}
          </View>
          <View style={tileStyles.emphasizedValue}>{weightBlock}</View>
        </>
      ) : (
        <>
          {icon}
          <View style={tileStyles.textWrap}>
            {titleNode}
            {weightBlock}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const EMPHASIZED_SUB = '#B9B9B9';

const styles = StyleSheet.create({
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  weightValue: {
    ...AcgType.sectionTitle,
  },
  weightSuffix: {
    ...AcgType.meta,
  },
});

export default observer(BagDetailUselessDescriptionView);
