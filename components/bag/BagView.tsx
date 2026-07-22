import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import BagItemView from './BagItemView';
import BagAddView from './BagAddView';
import Bag from '@/model/bag/Bag';
import LoadingView from '@/components/ui/LoadingView';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import { useFocusEffect } from 'expo-router/react-navigation';
import Layout from '../Layout';
import { Color } from '@/constants/DesignTokens';

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const BagView = () => {
  const [bag] = useState(() => Bag.new());
  const insets = useSafeAreaInsets();
  const isLoading = bag.isLoading();
  const bags = bag.getBags();
  const isEmpty = bag.isEmpty();

  useFocusEffect(
    useCallback(() => {
      bag.getList();
    }, [bag])
  );

  const render = () => {
    switch (true) {
      case isLoading: {
        return <LoadingView />;
      }
      case isEmpty: {
        return (
          <View style={styles.emptyContainer}>
            <PretendardText weight='bold' style={styles.emptyText}>
              아직 등록한{'\n'}배낭이 없어요:(
            </PretendardText>
          </View>
        );
      }
      default: {
        return (
          <>
            <View style={styles.headerContainer}>
              <PretendardText weight='bold' style={styles.headerText}>
                총 {bags.length}개의 배낭이 있어요
              </PretendardText>
            </View>
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {bags.map((bagItem: BagItem) => (
                <BagItemView
                  key={bagItem.getID()}
                  bag={bag}
                  bagItem={bagItem}
                />
              ))}
              <View
                style={{
                  minHeight: Platform.select({
                    ios: insets.bottom + 80,
                    android: 64,
                    default: 80,
                  }),
                }}
              />
            </ScrollView>
          </>
        );
      }
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}>
        {render()}
        <BagAddView bag={bag} />
      </Layout>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    position: 'relative',
    flex: 1,
    backgroundColor: Color.background,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  emptyContainer: {
    flex: 1,
    position: 'relative',
  },
  emptyText: {
    position: 'absolute',
    top: '30%',
    left: 0,
    fontSize: 30,
    color: Color.textPrimary,
  },
  headerContainer: {
    paddingVertical: 24,
  },
  headerText: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default observer(BagView);
