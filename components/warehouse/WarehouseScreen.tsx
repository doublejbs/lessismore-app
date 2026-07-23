import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Stack, useFocusEffect } from 'expo-router';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFiltersView from '@/components/warehouse/WarehouseFiltersView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import AddButtonView from '@/components/warehouse/AddButtonView';
import WarehouseSkeletonView from '@/components/warehouse/WarehouseSkeletonView';
import { josa } from 'josa';
import type { NativeStackNavigationOptions } from 'expo-router';

interface Props {
  warehouse: Warehouse;
}

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 빼고,
// 콘텐츠 하단 여백으로 마지막 항목이 탭바·플로팅 버튼에 가리지 않게 한다.
const IOS_EDGES = ['left', 'right'] as const;

const WarehouseView: FC<Props> = ({ warehouse }) => {
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();
  const isLoading = warehouse.isLoading();
  const insets = useSafeAreaInsets();
  const [isSearching, setIsSearching] = useState(false);

  const nativeSearchBarOptions: NativeStackNavigationOptions['headerSearchBarOptions'] =
    !isEmpty
      ? {
          placeholder: '장비 검색',
          cancelButtonText: '취소',
          placement: 'integratedButton',
          onChangeText: event => {
            warehouse.setQuery(event.nativeEvent.text);
          },
          onCancelButtonPress: () => {
            warehouse.setQuery('');
          },
          onClose: () => {
            warehouse.setQuery('');
          },
        }
      : undefined;

  useFocusEffect(
    useCallback(() => {
      warehouse.refresh();

      return () => {
        warehouse.setQuery('');
        setIsSearching(false);
      };
    }, [warehouse])
  );

  useEffect(() => {
    warehouse.initialize();
  }, [warehouse]);

  const renderGearItems = () => {
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
      return gears.map(gear => (
        <WarehouseGearView
          key={gear.getId()}
          gear={gear}
          warehouse={warehouse}
        />
      ));
    }
  };

  const renderGears = () => {
    if (isLoading || isEmpty || gears.length === 0) {
      return renderGearItems();
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderGearItems()}
        <View
          style={{
            height: Platform.select({
              ios: insets.bottom + 100,
              android: 100,
              default: 100,
            }),
          }}
        />
      </ScrollView>
    );
  };

  const renderIosGears = () => {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.iosScrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior='automatic'
      >
        {!isEmpty && <WarehouseFiltersView warehouse={warehouse} />}
        {renderGearItems()}
        {!isLoading && !isEmpty && gears.length > 0 && (
          <View style={{ height: insets.bottom + 100 }} />
        )}
      </ScrollView>
    );
  };

  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: '창고',
            // 탭 루트는 HIG상 large title(좌측 정렬, 스크롤 시 인라인으로 접힘)이 표준.
            // RNS large title 겹침 버그(#3315)는 back 전환 시 문제라 탭 루트엔 해당 없음.
            // headerTransparent는 large title 접힘 연동을 끊어 지정하지 않는다 —
            // iOS 26 기본 바(배경 없음 + scroll edge effect)에 위임.
            headerLargeTitle: true,
            ...(nativeSearchBarOptions
              ? { headerSearchBarOptions: nativeSearchBarOptions }
              : {}),
          }}
        />
      )}
    <GestureHandlerRootView style={styles.root}>
      <Layout edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}>
        {Platform.OS !== 'ios' && (
          <View style={styles.headerContainer}>
            {isSearching ? (
              <View style={styles.searchRow}>
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
                    autoFocus
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
                <TouchableOpacity
                  onPress={() => {
                    setIsSearching(false);
                    warehouse.setQuery('');
                  }}
                  style={styles.cancelButton}
                  hitSlop={8}
                  accessibilityRole='button'
                  accessibilityLabel='검색 닫기'
                >
                  <PretendardText style={styles.cancelText}>취소</PretendardText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.logoRow}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode='contain'
                />
                {!isEmpty && (
                  <TouchableOpacity
                    onPress={() => setIsSearching(true)}
                    style={styles.searchButton}
                    hitSlop={8}
                    accessibilityRole='button'
                    accessibilityLabel='검색'
                  >
                    <Ionicons name='search' size={22} color={Color.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!isEmpty && <WarehouseFiltersView warehouse={warehouse} />}
          </View>
        )}
        <View style={styles.contentContainer}>
          {Platform.OS === 'ios' ? renderIosGears() : renderGears()}
        </View>
        <AddButtonView />
      </Layout>
    </GestureHandlerRootView>
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  logoRow: {
    // 검색 모드(searchRow)와 높이를 44로 맞춰 토글 시 레이아웃 점프를 없앤다.
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: 32,
  },
  searchButton: {
    // 로고는 가운데 정렬을 유지하고, 검색 버튼만 우측 여백에 겹쳐 올린다(글자 영역과 겹치지 않음).
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cancelButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  searchBox: {
    flex: 1,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'column',
    gap: 4,
  },
  iosScrollContent: {
    flexDirection: 'column',
    gap: 8,
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
});

export default observer(WarehouseView);
