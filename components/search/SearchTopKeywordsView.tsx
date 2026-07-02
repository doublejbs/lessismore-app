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
import PretendardText from '../PretendardText';
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

const categories: CategoryItem[] = [
  { filter: GearFilter.All, name: '전체' },
  { filter: GearFilter.Tent, name: '텐트' },
  { filter: GearFilter.SleepingBag, name: '침낭' },
  { filter: GearFilter.Backpack, name: '배낭' },
  { filter: GearFilter.Mat, name: '매트' },
  { filter: GearFilter.Furniture, name: '가구' },
  { filter: GearFilter.Lantern, name: '랜턴' },
  { filter: GearFilter.Cooking, name: '조리' },
];

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
          <TouchableOpacity
            key={category.filter}
            style={[
              styles.categoryButton,
              selectedCategory === category.filter &&
                styles.categoryButtonSelected,
            ]}
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
          </TouchableOpacity>
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
  categoryButton: {
    height: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#000',
  },
  categoryText: {
    fontSize: 14,
    lineHeight: 16,
    color: '#000',
  },
  categoryTextSelected: {
    color: '#FFF',
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
