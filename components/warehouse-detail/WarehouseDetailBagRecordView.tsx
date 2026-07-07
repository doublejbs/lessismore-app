import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Gear from '../../model/gear/Gear';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import SeperaterView from '../ui/SeperaterView';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
            <PretendardText style={styles.uselessButtonText}>
              USELESS
            </PretendardText>
          </TouchableOpacity>
        );
      } else if (isUsed) {
        return (
          <TouchableOpacity style={styles.usedButton}>
            <PretendardText style={styles.usedButtonText}>USED</PretendardText>
          </TouchableOpacity>
        );
      } else {
        return (
          <PretendardText style={styles.placeholderText}>
            사용 여부를 입력해주세요
          </PretendardText>
        );
      }
    };

    return (
      <>
        <SeperaterView />
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <PretendardText weight='bold' style={styles.headerText}>
              배낭 기록 {bagCount}회
            </PretendardText>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <PretendardText style={styles.statLabel}>USED</PretendardText>
              <PretendardText weight='medium' style={styles.statValue}>{`${usedCount}회`}</PretendardText>
            </View>
            <View style={styles.statItem}>
              <PretendardText style={styles.statLabel}>USELESS</PretendardText>
              <PretendardText weight='medium' style={styles.statValue}>{`${uselessCount}회`}</PretendardText>
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
                    <PretendardText weight='semibold' style={styles.bagName}>
                      {bag.getName()}
                    </PretendardText>
                    <PretendardText style={styles.bagDate}>
                      {bag.getEditDate()}
                    </PretendardText>
                  </View>
                  <View style={styles.rightSection}>
                    {renderButton(isUseless, isUsed)}
                    <Ionicons
                      name='chevron-forward'
                      size={24}
                      color={Color.textTertiary}
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
    fontSize: 17,
    color: Color.textPrimary,
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
    backgroundColor: Color.inputBg,
    borderRadius: Radius.card,
  },
  statLabel: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  statValue: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  listContainer: {
    // 리스트 컨테이너 스타일
  },
  bagItem: {
    padding: 14,
    paddingHorizontal: 20,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  bagContent: {
    flexDirection: 'column',
  },
  bagName: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  bagDate: {
    fontSize: 10,
    color: Color.textTertiary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uselessButton: {
    backgroundColor: Color.background,
    borderRadius: Radius.card,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  uselessButtonText: {
    fontSize: 11,
    color: Color.textTertiary,
  },
  usedButton: {
    backgroundColor: Color.textTertiary,
    borderRadius: Radius.card,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  usedButtonText: {
    fontSize: 11,
    color: Color.background,
  },
  placeholderText: {
    color: Color.textSecondary,
    fontSize: 11,
    marginRight: 8,
  },
});

export default observer(WarehouseDetailBagRecordView);
