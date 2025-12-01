import React, { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import ExploreWarehouse from '@/model/explore/ExploreWarehouse';
import OrderType from '@/model/order/OrderType';
import PretendardText from '@/components/PretendardText';

interface Props {
  exploreWarehouse: ExploreWarehouse;
}

interface SortItem {
  type: OrderType;
  name: string;
}

const sortOptions: SortItem[] = [
  { type: OrderType.WeightAsc, name: '가벼운순' },
  { type: OrderType.WeightDesc, name: '무거운순' },
];

const ExploreSortView: FC<Props> = ({ exploreWarehouse }) => {
  const selectedSort = exploreWarehouse.getSelectedSort();

  const handleSortPress = (type: OrderType) => {
    exploreWarehouse.selectSort(type);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScrollView}
        contentContainerStyle={styles.sortScrollContent}
      >
        {sortOptions.map(option => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.sortButton,
              selectedSort === option.type && styles.sortButtonSelected,
            ]}
            onPress={() => handleSortPress(option.type)}
            activeOpacity={0.7}
          >
            <PretendardText
              style={[
                styles.sortText,
                selectedSort === option.type && styles.sortTextSelected,
              ]}
            >
              {option.name}
            </PretendardText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sortScrollView: {
    maxHeight: 32,
  },
  sortScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  sortText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#666',
  },
  sortTextSelected: {
    color: '#FFF',
  },
});

export default observer(ExploreSortView);
