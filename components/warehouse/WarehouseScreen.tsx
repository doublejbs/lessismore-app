import React, { FC, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseEmptyView from '@/components/warehouse/WarehouseEmptyView';
import app from '@/model/app/App';
import WarehouseFiltersView from '@/components/warehouse/WarehouseFiltersView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import AddButtonView from '@/components/warehouse/AddButtonView';

interface Props {
  warehouse: Warehouse;
}

const WarehouseView: FC<Props> = ({ warehouse }) => {
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();
  const isLoggedIn = app.getFirebase().isLoggedIn();

  useEffect(() => {
    if (isLoggedIn) {
      warehouse.initialize();
    } else {
      warehouse.clear();
    }
  }, [isLoggedIn]);

  if (isEmpty) {
    return <WarehouseEmptyView />;
  }

  return (
    <Layout>
      <View style={styles.headerContainer}>
        <Text style={styles.titleText}>useless</Text>
        <WarehouseFiltersView warehouse={warehouse} />
      </View>

      <View style={styles.contentContainer}>
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
        </ScrollView>
      </View>
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
});

export default observer(WarehouseView);
