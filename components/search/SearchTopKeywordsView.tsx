import { observer } from 'mobx-react-lite';
import { FC, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchSkeletonView from './SearchSkeletonView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchTopKeywordsView: FC<Props> = ({ searchWarehouse }) => {
  const topSearches = searchWarehouse.getTopSearches();
  const isLoading = searchWarehouse.isLoadingTopSearches();

  useEffect(() => {
    searchWarehouse.loadTopSearches();
  }, [searchWarehouse]);

  const handleKeywordPress = (keyword: string) => {
    searchWarehouse.searchByKeyword(keyword);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <SearchSkeletonView count={10} />
      </View>
    );
  }

  if (topSearches.length === 0) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>인기 검색어</Text>
      <View style={styles.listContainer}>
        {topSearches.map((keyword, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.keywordItem,
              pressed && styles.keywordItemPressed,
            ]}
            onPress={() => handleKeywordPress(keyword)}
          >
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={styles.keywordText}>{keyword}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
    color: '#000',
    marginBottom: 12,
  },
  listContainer: {
    gap: 8,
  },
  keywordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
  },
  keywordItemPressed: {
    backgroundColor: '#F1F1F1',
  },
  rankContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 11,
    fontFamily: 'Pretendard-Bold',
    color: '#FFF',
  },
  keywordText: {
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: '#000',
    flex: 1,
  },
});

export default observer(SearchTopKeywordsView);
