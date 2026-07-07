import { FC } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import BrowseHome from '@/model/browse/BrowseHome';
import Gear from '@/model/gear/Gear';
import { BrandRankData } from '@/model/search/BrandRankStore';
import GearFilter from '@/model/gear/GearFilter';
import { BROWSE_CATEGORIES } from '@/model/browse/BrowseCategory';
import PretendardText from '../PretendardText';
import CategoryChipView from './CategoryChipView';
import BrandRowView from './BrandRowView';
import app from '@/model/app/App';

interface Props {
  browseHome: BrowseHome;
}

const BrowseHomeSectionsView: FC<Props> = ({ browseHome }) => {
  const newArrivals = browseHome.getNewArrivals();
  const brands = browseHome.getBrands();

  const handleCategoryPress = (category: GearFilter) => {
    app.getAnalyticsManager()?.logClick('browse_category', { category });
    browseHome.goToCategory(category);
  };

  const handleBrandAllPress = () => {
    app.getAnalyticsManager()?.logClick('browse_brand_all');
    browseHome.goToBrandDirectory();
  };

  const handleBrandPress = (brand: BrandRankData) => {
    app.getAnalyticsManager()?.logClick('browse_brand_preview');
    browseHome.goToBrandList(brand);
  };

  const handleNewArrivalAllPress = () => {
    app.getAnalyticsManager()?.logClick('browse_new_all');
    browseHome.goToNewArrivalsAll();
  };

  const handleNewArrivalPress = (gear: Gear) => {
    app.getAnalyticsManager()?.logClick('browse_new_item');
    browseHome.goToGearDetail(gear);
  };

  const renderNewArrival = ({ item }: { item: Gear }) => (
    <TouchableOpacity
      style={styles.newArrivalItem}
      onPress={() => handleNewArrivalPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.newArrivalImageBox}>
        {!!item.getImageUrl() && (
          <Image
            source={{ uri: item.getImageUrl() }}
            style={styles.newArrivalImage}
            resizeMode='contain'
          />
        )}
      </View>
      {!!item.getDisplayCompany() && (
        <PretendardText style={styles.newArrivalCompany} numberOfLines={1}>
          {item.getDisplayCompany()}
        </PretendardText>
      )}
      <PretendardText
        style={styles.newArrivalName}
        weight='semibold'
        numberOfLines={2}
      >
        {item.getDisplayName()}
      </PretendardText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 카테고리별 탐색 */}
      <View style={styles.section}>
        <PretendardText style={styles.sectionTitle} weight='bold'>
          카테고리별 탐색
        </PretendardText>
        <View style={styles.categoryGrid}>
          {BROWSE_CATEGORIES.map(category => (
            <CategoryChipView
              key={category.filter}
              label={category.name}
              onPress={() => handleCategoryPress(category.filter)}
            />
          ))}
        </View>
      </View>

      {/* 브랜드별 탐색 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <PretendardText style={styles.sectionTitle} weight='bold'>
            브랜드별 탐색
          </PretendardText>
          <TouchableOpacity onPress={handleBrandAllPress}>
            <PretendardText style={styles.seeAll}>브랜드 전체 보기</PretendardText>
          </TouchableOpacity>
        </View>
        {brands.length > 0 && (
          <View style={styles.brandPreviewList}>
            {brands.map(brand => (
              <BrandRowView
                key={brand.brandKey}
                brand={brand}
                onPress={() => handleBrandPress(brand)}
              />
            ))}
          </View>
        )}
      </View>

      {/* 신제품 */}
      {newArrivals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PretendardText style={styles.sectionTitle} weight='bold'>
              신제품
            </PretendardText>
            <TouchableOpacity onPress={handleNewArrivalAllPress}>
              <PretendardText style={styles.seeAll}>전체 보기</PretendardText>
            </TouchableOpacity>
          </View>
          <FlatList
            data={newArrivals}
            renderItem={renderNewArrival}
            keyExtractor={(gear: Gear) => gear.getId()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newArrivalListContent}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#000',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandPreviewList: {
    width: '100%',
  },
  newArrivalListContent: {
    gap: 12,
    paddingRight: 20,
  },
  newArrivalItem: {
    width: 120,
    gap: 6,
  },
  newArrivalImageBox: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newArrivalImage: {
    width: '100%',
    height: '100%',
  },
  newArrivalCompany: {
    fontSize: 11,
    color: '#999',
  },
  newArrivalName: {
    fontSize: 13,
    color: '#000',
    lineHeight: 17,
  },
});

export default observer(BrowseHomeSectionsView);
