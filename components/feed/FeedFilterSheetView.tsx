import { FC, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import { FeedBrandInterest } from '@/model/feed/FeedInterestProfile';
import { BROWSE_CATEGORIES } from '@/model/browse/BrowseCategory';
import PretendardText from '@/components/PretendardText';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';
import BrandRowView from '@/components/browse/BrandRowView';
import CategoryChipView from '@/components/browse/CategoryChipView';
import app from '@/model/app/App';

const SHEET_SLIDE_DISTANCE = 800;
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;
const SHEET_HEIGHT_RATIO = 0.75;

const ALL_LABEL = '전체';

interface Props {
  feed: Feed;
  visible: boolean;
  onClose: () => void;
}

// FD-3: 통합 필터 바텀시트. 카테고리 그리드(고정) + 브랜드 검색/목록(내부 스크롤) + 초기화.
// 애니메이션은 BrowseSortButtonView 패턴(딤 페이드 + 시트 슬라이드 + 핸들바)을 미러링하고,
// 브랜드 목록·검색은 BrandDirectory 모델을 재사용한다. 선택은 즉시 적용(피드 재구성)한다.
const FeedFilterSheetView: FC<Props> = ({ feed, visible, onClose }) => {
  const router = useRouter();
  const [brandDirectory] = useState(() => BrandDirectory.new(router));
  const progress = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  const selectedCategory = feed.getFilterCategory();
  const selectedBrand = feed.getFilterBrand();
  const hasActiveFilter = feed.hasActiveFilter();

  const brands = brandDirectory.getBrands();
  const isLoading = brandDirectory.isLoading();
  const isEmpty = brandDirectory.isEmpty();
  const keyword = brandDirectory.getKeyword();
  const sheetHeight = Dimensions.get('window').height * SHEET_HEIGHT_RATIO;

  useEffect(() => {
    if (!visible) {
      return;
    }

    brandDirectory.initialize();
    isClosing.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, brandDirectory, progress]);

  const runClose = () => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;

    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isClosing.current = false;
      onClose();
    });
  };

  const handleClose = () => {
    runClose();
  };

  const handleSelectAllCategory = () => {
    app.getAnalyticsManager()?.logClick('feed_category', { category: 'all' });
    feed.setFilterCategory(null);
  };

  const handleSelectCategory = (category: string) => {
    // 같은 칩 재탭 시 해제(전체로 복귀).
    const next = selectedCategory === category ? null : category;

    app
      .getAnalyticsManager()
      ?.logClick('feed_category', { category: next ?? 'all' });
    feed.setFilterCategory(next);
  };

  const handleChangeKeyword = (text: string) => {
    brandDirectory.changeKeyword(text);
  };

  const handleClearKeyword = () => {
    brandDirectory.clearKeyword();
  };

  const handleSelectBrand = (brand: BrandRankData) => {
    const next: FeedBrandInterest | null = isSelectedBrand(brand)
      ? null
      : { companyKorean: brand.companyKorean, company: brand.company };

    app
      .getAnalyticsManager()
      ?.logClick('feed_brand', { selected: next !== null });
    feed.setFilterBrand(next);
  };

  const handleReset = () => {
    app.getAnalyticsManager()?.logClick('feed_filter_reset');
    feed.resetFilters();
  };

  const isSelectedBrand = (brand: BrandRankData) => {
    if (!selectedBrand) {
      return false;
    }

    return (
      selectedBrand.companyKorean === brand.companyKorean &&
      selectedBrand.company === brand.company
    );
  };

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_SLIDE_DISTANCE, 0],
  });

  const renderBrandList = () => {
    if (isLoading && isEmpty) {
      return (
        <View style={styles.skeletonContainer}>
          <SearchSkeletonView count={8} />
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            브랜드가 없습니다
          </PretendardText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.brandList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {brands.map(brand => (
          <BrandRowView
            key={brand.brandKey}
            brand={brand}
            selected={isSelectedBrand(brand)}
            onPress={() => handleSelectBrand(brand)}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType='none'
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlayRoot} onPress={handleClose}>
        <Animated.View
          style={[styles.overlayDim, { opacity: progress }]}
          pointerEvents='none'
        />
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <Pressable
            style={[styles.sheet, { height: sheetHeight }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.handle}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.header}>
              <PretendardText style={styles.title} weight='bold'>
                필터
              </PretendardText>
              {hasActiveFilter ? (
                <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
                  <PretendardText style={styles.resetText} weight='semibold'>
                    초기화
                  </PretendardText>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.section}>
              <PretendardText style={styles.sectionLabel} weight='semibold'>
                카테고리
              </PretendardText>
              <View style={styles.categoryGrid}>
                <CategoryChipView
                  label={ALL_LABEL}
                  selected={selectedCategory === null}
                  onPress={handleSelectAllCategory}
                />
                {BROWSE_CATEGORIES.map(item => (
                  <CategoryChipView
                    key={item.filter}
                    label={item.name}
                    selected={selectedCategory === item.filter}
                    onPress={() => handleSelectCategory(item.filter)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.brandSection}>
              <PretendardText style={styles.sectionLabel} weight='semibold'>
                브랜드
              </PretendardText>
              <View style={styles.searchInputWrapper}>
                <TextInput
                  style={styles.searchInput}
                  value={keyword}
                  onChangeText={handleChangeKeyword}
                  placeholder='브랜드명을 검색해보세요'
                  placeholderTextColor='#999'
                  autoCapitalize='none'
                  autoCorrect={false}
                />
                {keyword ? (
                  <TouchableOpacity
                    onPress={handleClearKeyword}
                    style={styles.clearButton}
                  >
                    <Ionicons name='close-circle' size={20} color='#B0B8C1' />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.brandListContainer}>{renderBrandList()}</View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: '#0A090B',
  },
  resetText: {
    fontSize: 14,
    color: '#555',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: '#505967',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandSection: {
    flex: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandListContainer: {
    flex: 1,
    marginTop: 8,
  },
  brandList: {
    flex: 1,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default observer(FeedFilterSheetView);
