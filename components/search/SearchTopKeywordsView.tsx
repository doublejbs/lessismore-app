import { observer } from 'mobx-react-lite';
import { FC, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Image,
  GestureResponderEvent,
} from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchSkeletonView from './SearchSkeletonView';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import CategoryChipView from '../browse/CategoryChipView';
import { Ionicons } from '@expo/vector-icons';
import LoadingView from '../ui/LoadingView';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import SearchGearAddToBagModalView from './SearchGearAddToBagModalView';
import { useFocusEffect } from 'expo-router';
import app from '@/model/app/App';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
}

interface CategoryItem {
  filter: GearFilter;
  name: string;
}

// SR-4 인기순위 카테고리 탭(고정 8개). 표시명은 GearFilterName 캐논컬 매핑에서 파생한다.
const SEARCH_RANK_CATEGORY_FILTERS: GearFilter[] = [
  GearFilter.All,
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Backpack,
  GearFilter.Mat,
  GearFilter.Furniture,
  GearFilter.Lantern,
  GearFilter.Cooking,
];

const categories: CategoryItem[] = SEARCH_RANK_CATEGORY_FILTERS.map(filter => {
  return { filter, name: getGearFilterName(filter) };
});

const SearchTopKeywordsView: FC<Props> = ({ searchWarehouse, bag }) => {
  const searchRank = searchWarehouse.getSearchRank();
  const [selectedCategory, setSelectedCategory] = useState<GearFilter>(
    GearFilter.All
  );
  const [loadingGearIds, setLoadingGearIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
  const gears = searchRank.getGears();
  const isLoading = searchRank.isLoading();

  useFocusEffect(
    useCallback(() => {
      searchRank.loadRanking(selectedCategory, false);
    }, [searchRank, selectedCategory])
  );

  const handleCategoryPress = (category: GearFilter) => {
    setSelectedCategory(category);
    searchRank.selectCategory(category);
  };

  const handleGearPress = (gear: Gear) => {
    app.getAnalyticsManager()?.logClick('search_rank_item');
    searchRank.goToGearDetail(gear);
  };

  const handleAddPress = async (e: GestureResponderEvent, gear: Gear) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingGearIds(prev => new Set(prev).add(gear.getId()));
    try {
      const success = await searchRank.registerSingle(gear);
      if (success) {
        app
          .getAnalyticsManager()
          ?.logClick('search_add', { target: 'warehouse' });
        setSelectedGear(gear);
        setShowModal(true);
      }
    } finally {
      setLoadingGearIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(gear.getId());
        return newSet;
      });
    }
  };

  const handleRemovePress = async (e: GestureResponderEvent, gear: Gear) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingGearIds(prev => new Set(prev).add(gear.getId()));
    try {
      await searchRank.removeSingle(gear);
    } finally {
      setLoadingGearIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(gear.getId());
        return newSet;
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>인기 장비 순위</Text>

      {/* 카테고리 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(category => (
          <CategoryChipView
            key={category.filter}
            label={category.name}
            selected={selectedCategory === category.filter}
            onPress={() => handleCategoryPress(category.filter)}
          />
        ))}
      </ScrollView>
      {/* 순위 리스트 */}
      <ScrollView
        style={styles.listScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {isLoading ? (
            <SearchSkeletonView count={10} />
          ) : gears.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 등록된 장비가 없습니다</Text>
            </View>
          ) : (
            gears.map((gear, index) => (
              <Pressable
                key={gear.getId()}
                style={({ pressed }) => [
                  styles.rankItem,
                  pressed && styles.rankItemPressed,
                ]}
                onPress={() => handleGearPress(gear)}
              >
                <View
                  style={[styles.rankBadge, index < 3 && styles.rankBadgeTop3]}
                >
                  <Text
                    style={[
                      styles.rankNumber,
                      index < 3 && styles.rankNumberTop3,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                {!!gear.getImageUrl() && (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: gear.getImageUrl() }}
                      style={styles.gearImage}
                      resizeMode='contain'
                    />
                  </View>
                )}

                <View style={styles.gearInfo}>
                  {gear.getCompany() && (
                    <Text style={styles.gearCompany} numberOfLines={1}>
                      {gear.getCompany()}
                    </Text>
                  )}
                  <Text style={styles.gearName} numberOfLines={1}>
                    {gear.getDisplayName()}
                  </Text>
                  <Text style={styles.gearCount}>{gear.getWeight()}g</Text>
                </View>

                <View style={styles.buttonContainer}>
                  {loadingGearIds.has(gear.getId()) ? (
                    <View style={styles.loadingContainer}>
                      <LoadingView duration={1000} />
                    </View>
                  ) : gear.isAdded() ? (
                    <TouchableOpacity
                      style={styles.ownedBadge}
                      onPress={e => handleRemovePress(e, gear)}
                    >
                      <Ionicons name='checkmark' size={16} color='#fff' />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={e => handleAddPress(e, gear)}
                    >
                      <Ionicons name='add' size={16} color='#000' />
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
        <View style={styles.bottomContainer}></View>
      </ScrollView>
      {selectedGear && (
        <SearchGearAddToBagModalView
          visible={showModal}
          onClose={handleCloseModal}
          gear={selectedGear}
          bag={bag}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
    color: '#000',
    marginBottom: 12,
  },
  categoryScrollView: {
    maxHeight: 32,
    marginBottom: 12,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  listScrollView: {
    flex: 1,
  },
  listContainer: {
    gap: 8,
    paddingBottom: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  rankItemPressed: {
    backgroundColor: '#F1F1F1',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeTop3: {
    backgroundColor: '#000',
  },
  rankNumber: {
    fontSize: 13,
    fontFamily: 'Pretendard-Bold',
    color: '#666',
  },
  rankNumberTop3: {
    color: '#FFF',
  },
  imageContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gearImage: {
    width: '100%',
    height: '100%',
  },
  gearInfo: {
    flex: 1,
    gap: 2,
  },
  gearCompany: {
    fontSize: 11,
    fontFamily: 'Pretendard-Regular',
    color: '#999',
  },
  gearName: {
    fontSize: 15,
    fontFamily: 'Pretendard-SemiBold',
    color: '#000',
  },
  gearCount: {
    fontSize: 12,
    fontFamily: 'Pretendard-Regular',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedBadge: {
    backgroundColor: '#000',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#F6F6F6',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    color: '#999',
  },
  bottomContainer: {
    height: 100,
  },
});

export default observer(SearchTopKeywordsView);
