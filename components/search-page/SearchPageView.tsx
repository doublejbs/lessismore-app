import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Layout from '../Layout';
import BannerAdView from '../ad/BannerAdView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
}

const SearchPageView: FC<Props> = ({ searchWarehouse, bag }) => {
  return (
    <Layout paddingHorizontal={0}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} bag={bag} />
      <View style={styles.adContainer}>
        <BannerAdView />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : -25,
    left: 0,
    right: 0,
  },
});

export default observer(SearchPageView);
