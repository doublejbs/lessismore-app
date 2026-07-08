import { FC } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BrandDirectory from '@/model/browse/BrandDirectory';
import { BrandRankData } from '@/model/search/BrandRankStore';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import SearchSkeletonView from '../search/SearchSkeletonView';
import BrandRowView from './BrandRowView';
import app from '@/model/app/App';

interface Props {
  brandDirectory: BrandDirectory;
}

const BrandDirectoryView: FC<Props> = ({ brandDirectory }) => {
  const router = useRouter();
  const brands = brandDirectory.getBrands();
  const isLoading = brandDirectory.isLoading();
  const isEmpty = brandDirectory.isEmpty();
  const keyword = brandDirectory.getKeyword();

  const handleBack = () => {
    router.back();
  };

  const handleChangeKeyword = (text: string) => {
    brandDirectory.changeKeyword(text);
  };

  const handleClearKeyword = () => {
    brandDirectory.clearKeyword();
  };

  const handleBrandPress = (brand: BrandRankData) => {
    app.getAnalyticsManager()?.logClick('brand_directory_item');
    brandDirectory.goToBrandList(brand);
  };

  const renderItem = ({ item }: { item: BrandRankData }) => {
    return <BrandRowView brand={item} onPress={() => handleBrandPress(item)} />;
  };

  const renderContent = () => {
    if (isLoading && isEmpty) {
      return (
        <View style={styles.skeletonContainer}>
          <SearchSkeletonView count={10} />
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
      <FlatList
        data={brands}
        renderItem={renderItem}
        keyExtractor={(brand: BrandRankData) => brand.brandKey}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText style={styles.headerTitle} weight='bold'>
          브랜드별 탐색
        </PretendardText>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={handleChangeKeyword}
            placeholder='브랜드명을 검색해보세요'
            placeholderTextColor={Color.textSecondary}
            autoCapitalize='none'
            autoCorrect={false}
          />
          {keyword ? (
            <TouchableOpacity
              onPress={handleClearKeyword}
              style={styles.clearButton}
            >
              <Ionicons name='close-circle' size={20} color={Color.iconMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
    height: 36,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

export default observer(BrandDirectoryView);
