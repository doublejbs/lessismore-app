import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import SearchBarView from './SearchBarView';
import SearchResultView from './SearchResultView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// 장비 추가 검색 모달(GE-8). 검색바 위에 핸들바 + 닫기(우상단) 헤더를 둔다.
const SearchWarehouseView: FC<Props> = ({
  searchWarehouse,
  bag,
  gearAddContext,
}) => {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.grabber} />
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
    backgroundColor: Color.background,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  // iOS 모달 카드 상단 핸들바. 드래그 닫기 어포던스.
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Color.iconMuted,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
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
