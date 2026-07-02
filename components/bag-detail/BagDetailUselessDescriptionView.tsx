import { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';

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
          <Text style={styles.descriptionText}>사용한 제품만 측정해보니</Text>
          <View style={styles.weightRow}>
            <Text style={styles.weightText}>{usedWeight}kg</Text>
            <Text style={styles.descriptionText}> 까지 줄어들어요</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.textContainer}>
          <Text style={styles.descriptionText}>사용 여부 기록하고</Text>
          <Text style={styles.descriptionText}>줄어든 무게 확인하기</Text>
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
          <Ionicons name='chevron-forward' size={24} color='#191F28' />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  touchableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
  },
  textContainer: {
    gap: 4,
  },
  descriptionText: {
    fontSize: 17,
    color: 'black',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightText: {
    color: '#CCF124',
    fontSize: 20,
    fontWeight: '500',
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(BagDetailUselessDescriptionView);
