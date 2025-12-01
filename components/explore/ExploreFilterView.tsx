import React, { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import ExploreWarehouse from '@/model/explore/ExploreWarehouse';
import GearFilter from '@/model/gear/GearFilter';
import PretendardText from '@/components/PretendardText';

interface Props {
  exploreWarehouse: ExploreWarehouse;
}

interface CategoryItem {
  filter: GearFilter;
  name: string;
}

const categories: CategoryItem[] = [
  { filter: GearFilter.All, name: '전체' },
  { filter: GearFilter.Tent, name: '텐트' },
  { filter: GearFilter.SleepingBag, name: '침낭' },
  { filter: GearFilter.Backpack, name: '배낭' },
  { filter: GearFilter.Mat, name: '매트' },
  { filter: GearFilter.Furniture, name: '가구' },
  { filter: GearFilter.Lantern, name: '랜턴' },
  { filter: GearFilter.Cooking, name: '조리' },
  { filter: GearFilter.Electronic, name: '전자기기' },
  { filter: GearFilter.Food, name: '식량' },
  { filter: GearFilter.Clothing, name: '의류' },
  { filter: GearFilter.Etc, name: '기타' },
];

const ExploreFilterView: FC<Props> = ({ exploreWarehouse }) => {
  const selectedCategory = exploreWarehouse.getSelectedCategory();

  const handleCategoryPress = (category: GearFilter) => {
    exploreWarehouse.selectCategory(category);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.filter}
            style={styles.categoryButton}
            onPress={() => handleCategoryPress(category.filter)}
            activeOpacity={0.7}
          >
            <PretendardText
              style={[
                styles.categoryText,
                selectedCategory === category.filter &&
                  styles.categoryTextSelected,
              ]}
            >
              {category.name}
            </PretendardText>
            {selectedCategory === category.filter && (
              <View style={styles.underline} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  categoryScrollView: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 15,
    lineHeight: 18,
    color: '#999',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#000',
  },
});

export default observer(ExploreFilterView);
