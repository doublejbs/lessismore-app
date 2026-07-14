import { FC, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import SearchTopKeywordsView from '@/components/search/SearchTopKeywordsView';

// FD-3 / SR-4: 인기 장비 순위 전용 화면(3단 래퍼).
// SearchTopKeywordsView가 요구하는 의존성(SearchWarehouse/Bag)을 1회 생성해 주입하고,
// 뒤로가기 헤더(`인기 장비 순위`)를 얹는다. 내부 타이틀은 헤더와 중복되므로 감춘다.
const PopularRankingWrapper: FC = () => {
  const router = useRouter();
  // SR-4: 피드에서 승계한 진입 카테고리(그룹 GearFilter 값). 없으면 전체로 진입.
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());

  const handleBack = () => {
    router.back();
  };

  return (
    <Layout paddingHorizontal={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name='chevron-back' size={24} color='#191F28' />
        </TouchableOpacity>
        <PretendardText style={styles.headerTitle} weight='bold'>
          인기 장비 순위
        </PretendardText>
      </View>
      <View style={styles.content}>
        <SearchTopKeywordsView
          searchWarehouse={searchWarehouse}
          bag={bag}
          showTitle={false}
          initialCategory={category}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
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
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default observer(PopularRankingWrapper);
