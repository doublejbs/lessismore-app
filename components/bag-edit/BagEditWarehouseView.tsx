import { FC } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import BagEdit from '../../model/bag-edit/BagEdit';
import BagEditWarehouseGearView from './BagEditWarehouseGearView';

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
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {},
});

export default observer(BagEditWarehouseView);
