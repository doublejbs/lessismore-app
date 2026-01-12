import { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Gear from '../../model/gear/Gear';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import SeperaterView from '../ui/SeperaterView';

interface Props {
  gear: Gear;
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailBagRecordView: FC<Props> = ({ gear, warehouseDetail }) => {
  const bagCount = gear.getBagCount();
  const usedCount = gear.getUsedCount();
  const uselessCount = gear.getUselessCount();

  if (bagCount === 0) {
    return null;
  } else {
    const renderButton = (isUseless: boolean, isUsed: boolean) => {
      if (isUseless) {
        return (
          <TouchableOpacity style={styles.uselessButton}>
            <Text style={styles.uselessButtonText}>USELESS</Text>
          </TouchableOpacity>
        );
      } else if (isUsed) {
        return (
          <TouchableOpacity style={styles.usedButton}>
            <Text style={styles.usedButtonText}>USED</Text>
          </TouchableOpacity>
        );
      } else {
        return (
          <Text style={styles.placeholderText}>사용 여부를 입력해주세요</Text>
        );
      }
    };

    return (
      <>
        <SeperaterView />
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>배낭 기록 {bagCount}회</Text>
          </View>
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
          <ScrollView style={styles.listContainer}>
            {warehouseDetail.mapBags(bag => {
              const isUseless = gear.hasUseless(bag.getID());
              const isUsed = gear.hasUsed(bag.getID());

              const handlePress = () => {
                warehouseDetail.goToBag(bag);
              };

              return (
                <TouchableOpacity
                  key={bag.getID()}
                  style={styles.bagItem}
                  onPress={handlePress}
                >
                  <View style={styles.bagContent}>
                    <Text style={styles.bagName}>{bag.getName()}</Text>
                    <Text style={styles.bagDate}>{bag.getEditDate()}</Text>
                  </View>
                  <View style={styles.rightSection}>
                    {renderButton(isUseless, isUsed)}
                    <Ionicons
                      name='chevron-forward'
                      size={24}
                      color='#505967'
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 0,
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  headerContainer: {
    // 헤더 컨테이너 스타일
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 17,
    color: 'black',
  },
  statsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statItem: {
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
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
  listContainer: {
    // 리스트 컨테이너 스타일
  },
  bagItem: {
    padding: 14,
    paddingHorizontal: 20,
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  bagContent: {
    flexDirection: 'column',
  },
  bagName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
  },
  bagDate: {
    fontSize: 10,
    color: '#757C86',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uselessButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  uselessButtonText: {
    fontSize: 11,
    color: '#505967',
  },
  usedButton: {
    backgroundColor: '#5F5F5F',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  usedButtonText: {
    fontSize: 11,
    color: 'white',
  },
  placeholderText: {
    color: '#9BA2AD',
    fontSize: 11,
    marginRight: 8,
  },
});

export default observer(WarehouseDetailBagRecordView);
