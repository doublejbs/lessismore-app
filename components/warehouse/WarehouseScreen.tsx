import React, { FC, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
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
          <PretendardText style={styles.emptyText}>
            장비를 추가해 주세요
          </PretendardText>
        </View>
      );
    } else if (gears.length === 0) {
      const selectedFilter = warehouse.getSelectedFilter();

      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            {warehouse.getQuery().trim()
              ? '검색 결과가 없어요'
              : `${josa(`${selectedFilter.getName()}#{가}`)} 없습니다`}
          </PretendardText>
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
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: '100%', height: 32 }}
            resizeMode='contain'
          />
        </View>
        {!warehouse.isEmpty() && (
          <>
            <View style={styles.searchBox}>
              <Ionicons name='search' size={18} color={Color.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder='장비 검색'
                placeholderTextColor={Color.textSecondary}
                value={warehouse.getQuery()}
                onChangeText={value => warehouse.setQuery(value)}
                autoCorrect={false}
                returnKeyType='search'
              />
              {warehouse.getQuery().length > 0 && (
                <TouchableOpacity
                  onPress={() => warehouse.setQuery('')}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='검색어 지우기'
                >
                  <Ionicons
                    name='close-circle'
                    size={18}
                    color={Color.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            <WarehouseFiltersView warehouse={warehouse} />
          </>
        )}
      </View>
      <View style={styles.contentContainer}>{renderGears()}</View>
      <AddButtonView />
    </Layout>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
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
    color: Color.textSecondary,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default observer(WarehouseView);
