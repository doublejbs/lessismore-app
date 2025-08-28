import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import BagItemView from './BagItemView';
import BagAddView from './BagAddView';
import Bag from '@/model/bag/Bag';
import LoadingView from '@/components/ui/LoadingView';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import { useFocusEffect } from '@react-navigation/native';
import LogInView from '../login/LogInView';
import app from '@/model/app/App';
import AlertView from '../alert/AlertView';

const BagView = () => {
  const [bag] = useState(() => Bag.new());
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
          <>
            <View style={styles.emptyContainer}>
              <PretendardText style={styles.emptyText}>
                아직 등록한{'\n'}배낭이 없어요:(
              </PretendardText>
            </View>
            <LogInView logInAlertManager={app.getLogInAlertManager()!} />
          </>
        );
      }
      default: {
        return (
          <>
            <View style={styles.headerContainer}>
              <PretendardText style={styles.headerText}>
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
              <View style={styles.bottomSpacer} />
            </ScrollView>
            <AlertView alertManager={app.getAlertManager()!} />
          </>
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {render()}
        <View style={styles.addButtonSpacer} />
        <BagAddView bag={bag} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 20,
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
    fontFamily: 'Pretendard-Bold',
  },
  headerContainer: {
    paddingVertical: 24,
  },
  headerText: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomSpacer: {
    minHeight: Platform.select({
      ios: 20,
      android: 0,
      default: 20,
    }),
  },
  addButtonSpacer: {
    minHeight: Platform.select({
      ios: 80,
      android: 0,
      default: 80,
    }),
  },
});

export default observer(BagView);
