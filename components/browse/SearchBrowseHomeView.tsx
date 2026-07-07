import { FC, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useFocusEffect, useRouter } from 'expo-router';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import BrowseHome from '@/model/browse/BrowseHome';
import Bag from '@/model/bag/Bag';
import SearchTopKeywordsView from '../search/SearchTopKeywordsView';
import BrowseHomeSectionsView from './BrowseHomeSectionsView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
}

const SearchBrowseHomeView: FC<Props> = ({ searchWarehouse, bag }) => {
  const router = useRouter();
  const [browseHome] = useState(() => BrowseHome.new(router));

  useFocusEffect(
    useCallback(() => {
      browseHome.load();
    }, [browseHome])
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <BrowseHomeSectionsView browseHome={browseHome} />
      <SearchTopKeywordsView
        searchWarehouse={searchWarehouse}
        bag={bag}
        embedded
      />
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 4,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default observer(SearchBrowseHomeView);
