import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Acg, Color } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import { GearAddContext } from '@/model/gear/GearAddContext';
import useSearchFilterInheritance from '@/hooks/useSearchFilterInheritance';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import SearchBarView from './SearchBarView';
import SearchResultView from './SearchResultView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// 장비 추가 검색 모달(GE-8). 검색바 위에 핸들바 + 닫기(우상단) 헤더를 둔다.
// 탐색 탭과 동일하게 검색 승계(SR-1)를 배선해 검색 시에도 필터 바를 유지한다.
const SearchWarehouseView: FC<Props> = ({
  searchWarehouse,
  bag,
  feed,
  gearAddContext,
}) => {
  const router = useRouter();

  useSearchFilterInheritance(searchWarehouse, feed);

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SheetGrabberView />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole='button'
          accessibilityLabel='닫기'
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name='close' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
      </View>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
        gearAddContext={gearAddContext}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    backgroundColor: Acg.bg,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SearchWarehouseView);
