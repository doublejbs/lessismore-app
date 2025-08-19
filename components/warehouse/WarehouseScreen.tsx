import React, { FC, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFiltersView from '@/components/warehouse/WarehouseFiltersView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import AddButtonView from '@/components/warehouse/AddButtonView';
import { useFocusEffect } from '@react-navigation/native';
import WarehouseSkeletonView from '@/components/warehouse/WarehouseSkeletonView';
import { josa } from 'josa';

interface Props {
  warehouse: Warehouse;
}

const WarehouseView: FC<Props> = ({ warehouse }) => {
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();
  const isLoading = warehouse.isLoading();

  useFocusEffect(
    useCallback(() => {
      warehouse.refresh();
    }, [warehouse])
  );

  useEffect(() => {
    warehouse.initialize();
  }, []);

  const renderGears = () => {
    if (isLoading) {
      return <WarehouseSkeletonView />;
    } else if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>장비를 추가해 주세요</Text>
        </View>
      );
    } else if (gears.length === 0) {
      const selectedFilter = warehouse.getSelectedFilter();

      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {josa(`${selectedFilter.getName()}#{가}`)} 없습니다
          </Text>
        </View>
      );
    } else {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {gears.map(gear => (
            <WarehouseGearView
              key={gear.getId()}
              gear={gear}
              warehouse={warehouse}
            />
          ))}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      );
    }
  };

  return (
    <Layout>
      <View style={styles.headerContainer}>
        <Text style={styles.titleText}>useless</Text>
        {!warehouse.isEmpty() && <WarehouseFiltersView warehouse={warehouse} />}
      </View>
      <View style={styles.contentContainer}>{renderGears()}</View>
      <AddButtonView />
    </Layout>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  titleText: {
    fontWeight: '900',
    fontSize: 48,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -4.5,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      ios: {
        paddingBottom: 50,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'column',
    gap: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default observer(WarehouseView);
