import { FC } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagEdit from '../../model/bag-edit/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseView: FC<Props> = ({ bagEdit }) => {
  const renderGearItem = ({ item }: { item: any }) => {
    return <BagEditWarehouseGearView gear={item} bagEdit={bagEdit} />;
  };

  const gearData = bagEdit.mapWarehouseGears(gear => gear);

  return (
    <FlatList
      data={gearData}
      renderItem={renderGearItem}
      keyExtractor={item => item.getId()}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        bagEdit.getQuery().trim() ? (
          <View style={styles.empty}>
            <PretendardText style={styles.emptyText}>
              검색 결과가 없어요
            </PretendardText>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Color.textSecondary,
  },
});

export default observer(BagEditWarehouseView);
