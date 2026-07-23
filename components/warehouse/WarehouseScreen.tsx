import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from 'expo-router';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFiltersView from '@/components/warehouse/WarehouseFiltersView';
import WarehouseGearView from '@/components/warehouse/WarehouseGearView';
import AddButtonView from '@/components/warehouse/AddButtonView';
import WarehouseSkeletonView from '@/components/warehouse/WarehouseSkeletonView';
import { josa } from 'josa';

interface Props {
  warehouse: Warehouse;
}

// iOS는 리스트가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어만 빼고,
// 콘텐츠 하단 여백으로 마지막 항목이 탭바·플로팅 버튼에 가리지 않게 한다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const WarehouseView: FC<Props> = ({ warehouse }) => {
  const gears = warehouse.getGears();
  const isEmpty = warehouse.isEmpty();
  const isLoading = warehouse.isLoading();
  const insets = useSafeAreaInsets();
  const [isSearching, setIsSearching] = useState(false);

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

  return (
    <GestureHandlerRootView style={styles.root}>
      <Layout edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}>
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
              // 전 플랫폼 공통: HIG large title 톤의 좌측 타이틀 + 같은 행 우측 원형 검색 버튼(LG-3).
              // (네이티브 바는 바 버튼이 large title과 다른 행에 놓여 커스텀 행으로 그린다.)
              <View style={styles.titleRow}>
                <PretendardText weight='bold' style={styles.titleText}>
                  창고
                </PretendardText>
                {!isEmpty && (
                  <TouchableOpacity
                    onPress={() => setIsSearching(true)}
                    style={styles.circleSearchButton}
                    hitSlop={8}
                    accessibilityRole='button'
                    accessibilityLabel='검색'
                  >
                    <Ionicons name='search' size={20} color={Color.textPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!isEmpty && <WarehouseFiltersView warehouse={warehouse} />}
        </View>
        <View style={styles.contentContainer}>{renderGears()}</View>
        <AddButtonView />
      </Layout>
    </GestureHandlerRootView>
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
  // 탭 루트 타이틀 행(전 플랫폼) — HIG large title 톤(좌측 큰 제목) + 같은 행 우측 검색 버튼.
  // 검색 모드(searchRow, 44)와 높이를 맞춰 토글 시 레이아웃 점프를 없앤다.
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 32,
    lineHeight: 40,
    color: Color.textPrimary,
  },
  // 원형 검색 버튼 — 시스템 바 버튼(44pt 원형)과 동일한 지오메트리.
  circleSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.surfaceMuted,
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
