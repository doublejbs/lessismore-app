import { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GearImageView from '../warehouse/GearImageView';
import Gear from '../../model/gear/Gear';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  gear: Gear;
}

const WarehouseDetailInformationView: FC<Props> = ({ gear }) => {
  const imageUrl = gear.getImageUrl();
  const company = gear.getCompany();
  const name = gear.getName();
  const weight = gear.getWeight();
  const usedCount = gear.getUsedCount();
  const uselessCount = gear.getUselessCount();
  const color = gear.getColor();
  const isAdded = gear.isAdded();

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <View style={styles.imageWrapper}>
            <GearImageView imageUrl={imageUrl} />
          </View>
        ) : (
          <Ionicons name='camera-outline' size={24} color='black' />
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.infoSection}>
          <View style={styles.productInfo}>
            <Text style={styles.companyText}>{company}</Text>
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.colorText}>{color}</Text>
          </View>
          <View style={styles.weightContainer}>
            <Text style={styles.weightText}>{weight}g</Text>
          </View>
        </View>
        {isAdded && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>USED</Text>
              <Text style={styles.statValue}>{`${usedCount}회`}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>USELESS</Text>
              <Text style={styles.statValue}>{`${uselessCount}회`}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    height: 180,
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'column',
    gap: 14,
  },
  infoSection: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  productInfo: {
    flexDirection: 'column',
  },
  companyText: {
    fontSize: 13,
    color: 'black',
  },
  nameText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  colorText: {
    fontSize: 16,
    color: 'black',
  },
  weightContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  weightText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'black',
  },
  statsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    color: 'black',
  },
  statLabel: {
    fontSize: 14,
    color: 'black',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '500',
    color: 'black',
  },
});

export default observer(WarehouseDetailInformationView);
