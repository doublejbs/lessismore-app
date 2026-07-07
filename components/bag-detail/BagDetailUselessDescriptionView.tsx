import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailUselessDescriptionView: FC<Props> = ({ bagDetail }) => {
  const isUselessChecked = bagDetail.isUselessChecked();
  const usedWeight = bagDetail.getUsedWeight();

  const handlePressUseless = () => {
    app.getAnalyticsManager()?.logClick('bag_useless');
    bagDetail.goToUseless();
  };

  const renderContent = () => {
    if (isUselessChecked) {
      return (
        <View style={styles.textContainer}>
          <PretendardText style={styles.descriptionText}>
            사용한 제품만 측정해보니
          </PretendardText>
          <View style={styles.weightRow}>
            <PretendardText weight='bold' style={styles.weightText}>
              {usedWeight}kg
            </PretendardText>
            <PretendardText style={styles.descriptionText}>
              {' '}
              까지 줄어들어요
            </PretendardText>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.textContainer}>
          <PretendardText style={styles.descriptionText}>
            사용 여부 기록하고
          </PretendardText>
          <PretendardText style={styles.descriptionText}>
            줄어든 무게 확인하기
          </PretendardText>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchableContainer}
        onPress={handlePressUseless}
      >
        {renderContent()}
        <View style={styles.iconContainer}>
          <Ionicons name='chevron-forward' size={24} color={Color.textPrimary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 8,
    backgroundColor: Color.background,
  },
  touchableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.card,
  },
  textContainer: {
    gap: 4,
  },
  descriptionText: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightText: {
    color: Color.textPrimary,
    fontSize: 20,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(BagDetailUselessDescriptionView);
